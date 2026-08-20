mod grok_source;
mod weekly;

use grok_source::GrokStatus;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, Rect, WebviewWindow,
};

static LAST_TRAY_RECT: Mutex<Option<Rect>> = Mutex::new(None);
static IGNORE_BLUR_UNTIL: Mutex<Option<Instant>> = Mutex::new(None);
static LAST_BLUR_HIDE: Mutex<Option<Instant>> = Mutex::new(None);

fn ignore_blur_briefly() {
    *IGNORE_BLUR_UNTIL.lock().unwrap_or_else(|e| e.into_inner()) =
        Some(Instant::now() + Duration::from_millis(200));
}

fn blur_should_hide() -> bool {
    match *IGNORE_BLUR_UNTIL.lock().unwrap_or_else(|e| e.into_inner()) {
        Some(until) if Instant::now() < until => false,
        _ => true,
    }
}

fn mark_blur_hide() {
    *LAST_BLUR_HIDE.lock().unwrap_or_else(|e| e.into_inner()) = Some(Instant::now());
}

fn recently_hidden_by_blur() -> bool {
    match *LAST_BLUR_HIDE.lock().unwrap_or_else(|e| e.into_inner()) {
        Some(at) if at.elapsed() < Duration::from_millis(250) => true,
        _ => false,
    }
}

#[tauri::command]
fn grok_status() -> GrokStatus {
    grok_source::status()
}

#[tauri::command]
fn weekly_status() -> weekly::WeeklyStatus {
    weekly::status()
}

fn store_tray_rect(rect: Rect) {
    *LAST_TRAY_RECT.lock().unwrap_or_else(|e| e.into_inner()) = Some(rect);
}

fn last_tray_rect() -> Option<Rect> {
    *LAST_TRAY_RECT.lock().unwrap_or_else(|e| e.into_inner())
}

fn tray_rect_from_event(event: &TrayIconEvent) -> Option<Rect> {
    match event {
        TrayIconEvent::Click { rect, .. }
        | TrayIconEvent::DoubleClick { rect, .. }
        | TrayIconEvent::Enter { rect, .. }
        | TrayIconEvent::Move { rect, .. }
        | TrayIconEvent::Leave { rect, .. } => Some(*rect),
        _ => None,
    }
}

fn tray_title_and_tooltip(
    weekly: &weekly::WeeklyStatus,
    grok: &GrokStatus,
) -> (Option<String>, String) {
    if let Some(pct) = weekly.usage_percent.filter(|n| n.is_finite()) {
        let rounded = pct.round() as i64;
        return (
            Some(format!("{rounded}%")),
            format!("GrokBar · {rounded}% weekly"),
        );
    }
    if grok.today_message_count > 0 {
        let n = grok.today_message_count;
        return (Some(n.to_string()), format!("GrokBar · {n} today"));
    }
    (None, "GrokBar".to_string())
}

fn refresh_tray(app: &AppHandle) {
    let weekly = weekly::status();
    let grok = grok_source::status();
    let (title, tooltip) = tray_title_and_tooltip(&weekly, &grok);
    let Some(tray) = app.tray_by_id("main") else {
        return;
    };
    let _ = tray.set_tooltip(Some(tooltip));
    #[cfg(target_os = "macos")]
    {
        let _ = tray.set_title(title);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = title;
    }
}

fn spawn_tray_refresh(app: AppHandle) {
    std::thread::spawn(move || loop {
        refresh_tray(&app);
        std::thread::sleep(Duration::from_secs(30));
    });
}

fn toggle_panel(app: &AppHandle, tray_rect: Rect) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    ignore_blur_briefly();
    let visible = window.is_visible().unwrap_or(false);
    if visible || recently_hidden_by_blur() {
        let _ = window.hide();
        return;
    }
    position_near_tray(&window, tray_rect);
    let _ = window.show();
    let _ = window.set_focus();
}

fn position_near_tray(window: &WebviewWindow, tray_rect: Rect) {
    let scale_guess = window.scale_factor().unwrap_or(1.0);
    let pos = tray_rect.position.to_physical::<f64>(scale_guess);
    let icon = tray_rect.size.to_physical::<f64>(scale_guess);
    let cx = pos.x + icon.width / 2.0;
    let cy = pos.y + icon.height / 2.0;

    let monitors = window.available_monitors().unwrap_or_default();
    let monitor = monitors.iter().find(|m| {
        let p = m.position();
        let s = m.size();
        let x0 = f64::from(p.x);
        let y0 = f64::from(p.y);
        let x1 = x0 + f64::from(s.width);
        let y1 = y0 + f64::from(s.height);
        cx >= x0 && cx < x1 && cy >= y0 && cy < y1
    });
    let scale = monitor
        .map(|m| m.scale_factor())
        .unwrap_or(scale_guess);
    let pos = tray_rect.position.to_physical::<f64>(scale);
    let icon = tray_rect.size.to_physical::<f64>(scale);
    let win_size = window.outer_size().unwrap_or_default();
    let w = f64::from(win_size.width);
    let h = f64::from(win_size.height);

    let mut x = pos.x + (icon.width / 2.0) - (w / 2.0);
    let mut y = pos.y + icon.height + 6.0;
    if let Some(m) = monitor {
        let p = m.position();
        let s = m.size();
        let mx = f64::from(p.x);
        let my = f64::from(p.y);
        let mw = f64::from(s.width);
        let mh = f64::from(s.height);
        if pos.y > my + mh - 80.0 {
            y = pos.y - h - 6.0;
        }
        let max_x = (mx + mw - w - 8.0).max(mx + 8.0);
        let max_y = (my + mh - h - 8.0).max(my + 8.0);
        x = x.clamp(mx + 8.0, max_x);
        y = y.clamp(my + 8.0, max_y);
    }
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn show_about(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        ignore_blur_briefly();
        if let Some(rect) = last_tray_rect() {
            position_near_tray(&window, rect);
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
    let _ = app.emit("show-about", ());
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let about = MenuItem::with_id(app, "about", "About GrokBar", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit GrokBar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&about, &quit])?;

    let tray = match app.tray_by_id("main") {
        Some(existing) => {
            existing.set_menu(Some(menu))?;
            let _ = existing.set_show_menu_on_left_click(false);
            existing
        }
        None => {
            let mut builder = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("GrokBar");
            if let Some(icon) = app.default_window_icon() {
                builder = builder.icon(icon.clone());
            }
            builder.build(app)?
        }
    };

    tray.on_menu_event(|app, event| {
        match event.id.as_ref() {
            "quit" => app.exit(0),
            "about" => show_about(app),
            _ => {}
        }
    });

    tray.on_tray_icon_event(|tray, event| {
        if let Some(rect) = tray_rect_from_event(&event) {
            store_tray_rect(rect);
        }
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            rect,
            ..
        } = event
        {
            toggle_panel(tray.app_handle(), rect);
        }
    });

    Ok(())
}

#[cfg(target_os = "macos")]
fn apply_macos_panel_material(app: &tauri::App) {
    use tauri::window::{Color, Effect, EffectState, EffectsBuilder};

    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let applied = window.set_effects(
        EffectsBuilder::new()
            .effect(Effect::Popover)
            .state(EffectState::Active)
            .radius(12.)
            .build(),
    );
    if applied.is_err() {
        let _ = window.set_background_color(Some(Color(242, 242, 247, 255)));
        return;
    }
    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![grok_status, weekly_status])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                apply_macos_panel_material(app);
            }

            setup_tray(app)?;
            spawn_tray_refresh(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                tauri::WindowEvent::Focused(false) if blur_should_hide() => {
                    let _ = window.hide();
                    mark_blur_hide();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running GrokBar");
}
