import type { Page } from "../components/TabBar";
import { stripBase } from "./navigation";

export type RecordsSubPage = "add" | null;
export type SanctumSubPage = "tags" | "privacy" | null;

export type RouteState = {
  page: Page;
  recordsSubPage: RecordsSubPage;
  sanctumSubPage: SanctumSubPage;
  ocrActive: boolean;
};

export type ParseRouteOptions = {
  ocrEnabled?: boolean;
};

const defaultRoute: RouteState = {
  page: "home",
  recordsSubPage: null,
  sanctumSubPage: null,
  ocrActive: false,
};

export function parseRouteFromPathname(
  pathname: string,
  options: ParseRouteOptions = {},
): RouteState {
  const path = stripBase(pathname).replace(/^\/+/, "").trim();
  if (!path) return { ...defaultRoute };

  const [pageRaw, subRaw] = path.split("/");

  if (options.ocrEnabled && pageRaw === "ocr") {
    return {
      ...defaultRoute,
      ocrActive: true,
    } satisfies RouteState;
  }

  const page: Page =
    pageRaw === "home" ||
    pageRaw === "books" ||
    pageRaw === "records" ||
    pageRaw === "sanctum"
      ? (pageRaw as Page)
      : "home";

  const recordsSubPage: RecordsSubPage =
    page === "records" && subRaw === "add" ? "add" : null;

  const sanctumSubPage: SanctumSubPage =
    page === "sanctum" && (subRaw === "tags" || subRaw === "privacy")
      ? (subRaw as SanctumSubPage)
      : null;

  return {
    page,
    recordsSubPage,
    sanctumSubPage,
    ocrActive: false,
  } satisfies RouteState;
}

export function toPathname(route: RouteState) {
  if (route.ocrActive) return "/ocr";
  if (route.page === "home") return "/";
  if (route.page === "records" && route.recordsSubPage) {
    return `/records/${route.recordsSubPage}`;
  }
  if (route.page === "sanctum" && route.sanctumSubPage) {
    return `/sanctum/${route.sanctumSubPage}`;
  }
  return `/${route.page}`;
}
