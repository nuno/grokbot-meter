mod grok_source;
mod weekly;

use grok_source::GrokStatus;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Rect, WebviewWindow,
};

#[tauri::command]
fn grok_status() -> GrokStatus {
    grok_source::status()
}

#[tauri::command]
fn weekly_status() -> weekly::WeeklyStatus {
    weekly::status()
}

fn toggle_panel(app: &AppHandle, tray_rect: Rect) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    match window.is_visible() {
        Ok(true) => {
            let _ = window.hide();
        }
        _ => {
            position_near_tray(&window, tray_rect);
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn position_near_tray(window: &WebviewWindow, tray_rect: Rect) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let pos = tray_rect.position.to_physical::<f64>(scale);
    let icon = tray_rect.size.to_physical::<f64>(scale);
    let win_size = window.outer_size().unwrap_or_default();

    let x = pos.x + (icon.width / 2.0) - (f64::from(win_size.width) / 2.0);
    let y = if pos.y < 220.0 {
        pos.y + icon.height + 8.0
    } else {
        pos.y - f64::from(win_size.height) - 8.0
    };
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let quit = MenuItem::with_id(app, "quit", "Quit GrokBar", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&quit])?;

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
        if event.id.as_ref() == "quit" {
            app.exit(0);
        }
    });

    tray.on_tray_icon_event(|tray, event| {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![grok_status, weekly_status])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running GrokBar");
}
