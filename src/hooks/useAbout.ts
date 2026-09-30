import { useCallback, useEffect, useRef, useState } from "react";
import { hideWindow, quit as apiQuit, setContentHeight, subscribeEscapePressed, subscribeShowAbout, subscribeShowSettings } from "../lib/api";
import { mainHeightFor } from "../lib/panelHeights";
import { themeDef } from "../lib/themes";
import { useThemePref } from "./useLocalPref";

export type PanelMode = "main" | "about" | "settings";

function isEditableTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable ||
    Boolean(el.closest('[contenteditable="true"]'))
  );
}

/** Single panel mode for main ↔ About ↔ Settings (one visible at a time). */
export function usePanelController() {
  const [mode, setMode] = useState<PanelMode>("main");
  const { theme } = useThemePref();
  const maxPanelHeight = themeDef(theme).maxPanelHeight;

  useEffect(() => {
    const unlisten = subscribeShowAbout(() => setMode("about"));
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const unlisten = subscribeShowSettings(() => setMode("settings"));
    return () => unlisten?.();
  }, []);

  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const goMain = useCallback(() => {
    // Restore before the mode flips, and carry the theme ceiling — without it
    // main clamps to the flat-theme 520px and Coffee's panel snaps down, then
    // back up once usePanelHeight re-measures.
    const restore = mainHeightFor(theme);
    if (restore != null) setContentHeight(restore, "main", maxPanelHeight);
    setMode("main");
  }, [theme, maxPanelHeight]);

  useEffect(() => {
    const unlisten = subscribeEscapePressed(() => {
      const active = document.activeElement as HTMLElement | null;
      if (isEditableTarget(active)) return;
      if (modeRef.current === "about" || modeRef.current === "settings") {
        goMain();
      } else {
        hideWindow();
      }
    });
    return () => unlisten?.();
  }, [goMain]);

  const openAbout = useCallback(() => setMode("about"), []);
  const openSettings = useCallback(() => setMode("settings"), []);
  const close = goMain;
  const resetOnHide = useCallback(() => setMode("main"), []);
  const quit = useCallback(() => {
    setMode("main");
    apiQuit();
  }, []);

  return { mode, openAbout, openSettings, close, resetOnHide, quit };
}
