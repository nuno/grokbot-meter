import { useLayoutEffect } from "react";
import { setContentHeight, type PanelHeightMode } from "../lib/api";
import { rememberAboutHeight, rememberMainHeight } from "../lib/panelHeights";
import type { PanelMode } from "./useAbout";

function visiblePanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>(".panel"));
  return (
    panels.find((el) => {
      const style = getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    }) ?? null
  );
}

function toHeightMode(mode: PanelMode): PanelHeightMode {
  if (mode === "settings") return "settings";
  if (mode === "about") return "about";
  return "main";
}

/**
 * Keep the Electron window content-sized to the visible .panel.
 * Footer/header → About/Settings: main refuses to shrink a visible window.
 * Tray→About: wait for settled about height (double rAF) before main reveals.
 */
export function usePanelHeight(mode: PanelMode, deps: readonly unknown[] = []) {
  useLayoutEffect(() => {
    let raf = 0;
    let last = 0;
    const heightMode = toHeightMode(mode);
    const overlay = heightMode === "about" || heightMode === "settings";

    const measure = () => {
      const el = visiblePanel();
      if (!el) return;
      const next = Math.ceil(el.getBoundingClientRect().height);
      if (!Number.isFinite(next) || next <= 0) return;
      if (overlay) rememberAboutHeight(next);
      else rememberMainHeight(next);
      if (next === last) return;
      last = next;
      setContentHeight(next, heightMode);
    };

    // Overlay: skip immediate measure — first paint layout can be short, then grow
    // (tray reveal would flash). Main: measure now for snappy resize.
    if (!overlay) measure();
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(measure);
    });

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    for (const el of document.querySelectorAll(".panel")) ro.observe(el);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ...deps]);
}
