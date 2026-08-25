import { useCallback, useEffect, useRef, useState } from "react";
import { hideWindow, quit as apiQuit, subscribeEscapePressed, subscribeShowAbout } from "../lib/api";

export function useAboutController() {
  const [about, setAbout] = useState(false);

  useEffect(() => {
    const unlisten = subscribeShowAbout(() => setAbout(true));
    return () => unlisten?.();
  }, []);

  // Esc is handled in Electron main (before-input-event) and forwarded as "escape-pressed"
  // so it works even when the frameless popover isn't focused. Renderer decides
  // whether to close About or hide the window.
  const aboutRef = useRef(about);
  useEffect(() => {
    aboutRef.current = about;
  }, [about]);
  useEffect(() => {
    const unlisten = subscribeEscapePressed(() => {
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable ||
          active.closest('[contenteditable="true"]'))
      )
        return;
      if (aboutRef.current) setAbout(false);
      else hideWindow();
    });
    return () => unlisten?.();
  }, []);

  const open = useCallback(() => setAbout(true), []);
  const close = useCallback(() => setAbout(false), []);
  const resetOnHide = useCallback(() => setAbout(false), []);
  const quit = useCallback(() => {
    setAbout(false);
    apiQuit();
  }, []);

  return { about, open, close, resetOnHide, quit };
}
