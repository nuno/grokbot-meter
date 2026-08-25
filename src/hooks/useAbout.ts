import { useCallback, useEffect, useState } from "react";
import { hideWindow, quit as apiQuit, subscribeShowAbout } from "../lib/api";

export function useAboutController() {
  const [about, setAbout] = useState(false);

  useEffect(() => {
    const unlisten = subscribeShowAbout(() => setAbout(true));
    return () => unlisten?.();
  }, []);

  const open = useCallback(() => setAbout(true), []);
  const close = useCallback(() => setAbout(false), []);
  const resetOnHide = useCallback(() => setAbout(false), []);
  const quit = useCallback(() => {
    setAbout(false);
    apiQuit();
  }, []);

  // HIG keyboard: Esc = cancel/dismiss (close About or hide popover)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Don't hijack when typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      e.preventDefault();
      if (about) setAbout(false);
      else hideWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [about]);

  return { about, open, close, resetOnHide, quit };
}
