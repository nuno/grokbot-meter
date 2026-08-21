import { useCallback, useEffect, useState } from "react";
import { subscribeShowAbout } from "../lib/api";

export function useAboutController() {
  const [about, setAbout] = useState(false);

  useEffect(() => {
    const unlisten = subscribeShowAbout(() => setAbout(true));
    return () => unlisten?.();
  }, []);

  const open = useCallback(() => setAbout(true), []);
  const close = useCallback(() => setAbout(false), []);
  const resetOnHide = useCallback(() => setAbout(false), []);
  const quit = useCallback(async () => {
    setAbout(false);
    ;(window.api as unknown as { quit: () => Promise<void> }).quit();
  }, []);

  return { about, open, close, resetOnHide, quit };
}
