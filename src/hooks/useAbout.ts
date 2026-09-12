import { useCallback, useEffect, useRef, useState } from "react";
import { hideWindow, quit as apiQuit, setContentHeight, subscribeEscapePressed, subscribeShowAbout, subscribeShowSettings } from "../lib/api";
import { cachedMainHeight } from "../lib/panelHeights";

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
    setContentHeight(cachedMainHeight, "main");
    setMode("main");
  }, []);

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
