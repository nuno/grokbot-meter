import { useEffect } from "react";
import { setContentHeight } from "../lib/api";

function visiblePanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>(".panel"));
  return panels.find((el) => {
    const style = getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }) ?? null;
}

/** Keep the Electron window content-sized to the visible .panel. */
export function usePanelHeight(deps: readonly unknown[] = []) {
  useEffect(() => {
    let raf = 0;
    let last = 0;

    const measure = () => {
      const el = visiblePanel();
      if (!el) return;
      const next = Math.ceil(el.getBoundingClientRect().height);
      if (!Number.isFinite(next) || next <= 0) return;
      if (next === last) return;
      last = next;
      setContentHeight(next);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      // Double rAF: wait for layout after React commit / Activity toggle.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(measure);
      });
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    for (const el of document.querySelectorAll(".panel")) ro.observe(el);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
