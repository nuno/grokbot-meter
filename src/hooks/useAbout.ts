import { useCallback, useEffect, useState } from "react";
import { subscribeShowAbout, quit as apiQuit } from "../lib/api";

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

  return { about, open, close, resetOnHide, quit };
}
