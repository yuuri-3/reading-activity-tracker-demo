type NavigateOptions = {
  replace?: boolean;
};

function getBaseUrl() {
  return (import.meta as any).env?.BASE_URL ?? "/";
}

export function joinWithBase(pathname: string) {
  const base = getBaseUrl();
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${normalizedBase}${normalizedPath}` || "/";
}

export function stripBase(pathname: string) {
  const base = getBaseUrl();
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  if (!normalizedBase || normalizedBase === "/") return pathname;
  return pathname.startsWith(normalizedBase)
    ? pathname.slice(normalizedBase.length) || "/"
    : pathname;
}

export function navigate(pathname: string, options: NavigateOptions = {}) {
  if (typeof window === "undefined") return;
  const nextPathname = joinWithBase(pathname);

  if (options.replace) {
    window.history.replaceState(
      null,
      "",
      `${nextPathname}${window.location.search}`
    );
  } else {
    window.history.pushState(
      null,
      "",
      `${nextPathname}${window.location.search}`
    );
  }

  // pushState/replaceState does not trigger popstate automatically.
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function shouldHandleClientNavigation(event: {
  button?: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}) {
  // Only plain left-click should be handled as SPA navigation.
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return false;
  return true;
}
