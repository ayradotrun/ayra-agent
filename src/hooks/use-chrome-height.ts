"use client";

import { useEffect } from "react";

/** Sync a measured element height to a CSS custom property on <html>. */
export function useChromeHeight(
  ref: React.RefObject<HTMLElement | null>,
  cssVar: string,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function sync() {
      const height = Math.ceil(el!.getBoundingClientRect().height);
      document.documentElement.style.setProperty(cssVar, `${height}px`);
      if (cssVar === "--site-header-height") {
        document.documentElement.style.setProperty(
          "--site-header-scroll-offset",
          `${height + 8}px`
        );
      }
      if (cssVar === "--bottom-nav-height") {
        document.documentElement.style.setProperty("--bottom-nav-offset", `${height}px`);
      }
    }

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
