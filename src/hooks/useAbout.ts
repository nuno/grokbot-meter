import { useCallback, useEffect, useRef, useState } from "react";
import { hideWindow, quit as apiQuit, setContentHeight, subscribeEscapePressed, subscribeShowAbout } from "../lib/api";
import { cachedMainHeight } from "../lib/panelHeights";

export function useAboutController() {
  const [about, setAbout] = useState(false);

  useEffect(() => {
    const unlisten = subscribeShowAbout(() => setAbout(true));
    return () => unlisten?.();
  }, []);

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
      if (aboutRef.current) {
        setContentHeight(cachedMainHeight, "main");
        setAbout(false);
      } else hideWindow();
    });
    return () => unlisten?.();
  }, []);

  const open = useCallback(() => setAbout(true), []);
  const close = useCallback(() => {
    setContentHeight(cachedMainHeight, "main");
    setAbout(false);
  }, []);
  const resetOnHide = useCallback(() => setAbout(false), []);
  const quit = useCallback(() => {
    setAbout(false);
    apiQuit();
  }, []);

  return { about, open, close, resetOnHide, quit };
}
