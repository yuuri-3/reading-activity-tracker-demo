import { useEffect, useLayoutEffect, useRef } from "react";

const STORAGE_PREFIX = "yomzoy:scroll:";

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function safeSessionStorageGet(key: string): string | null {
  if (!canUseDom()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionStorageSet(key: string, value: string) {
  if (!canUseDom()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function useElementScrollRestoration(
  ref: React.RefObject<HTMLElement | null>,
  key: string,
  options?: {
    enabled?: boolean;
  }
) {
  const enabled = options?.enabled ?? true;
  const storageKey = `${STORAGE_PREFIX}${key}`;

  const lastKnownTopRef = useRef<number>(0);

  useLayoutEffect(() => {
    if (!enabled) return;
    if (!canUseDom()) return;

    const el = ref.current;
    if (!el) return;

    const raw = safeSessionStorageGet(storageKey);
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    // Restore on next frame so layout/children are in place.
    requestAnimationFrame(() => {
      const current = ref.current;
      if (!current) return;
      current.scrollTop = parsed;
      lastKnownTopRef.current = parsed;
    });
  }, [enabled, ref, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    if (!canUseDom()) return;

    const el = ref.current;
    if (!el) return;

    let rafId = 0;

    const save = () => {
      const top = el.scrollTop;
      lastKnownTopRef.current = top;
      safeSessionStorageSet(storageKey, String(top));
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        save();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
      // Ensure we persist the latest value even if the last scroll event
      // wasn't flushed yet (e.g., immediate tab switch).
      safeSessionStorageSet(storageKey, String(lastKnownTopRef.current));
    };
  }, [enabled, ref, storageKey]);
}
