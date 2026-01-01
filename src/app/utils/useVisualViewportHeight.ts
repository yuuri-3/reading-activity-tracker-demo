import { useEffect, useState } from "react";

function readViewportHeight() {
  if (typeof window === "undefined") return 0;
  return window.visualViewport?.height ?? window.innerHeight;
}

/**
 * Tracks the visual viewport height so the layout can resize when
 * the on-screen keyboard opens/closes on mobile browsers.
 */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState(() => readViewportHeight());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = window.visualViewport;

    if (!viewport) {
      const onResize = () => setHeight(readViewportHeight());
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const update = () => setHeight(readViewportHeight());
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);

    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
