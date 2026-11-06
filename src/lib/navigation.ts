const APP_PATHS = new Set(["/", "/create", "/my-captions", "/profile", "/members", "/jokes"]);
export const RETURN_COOKIE = "humor-return-to";

export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/profile";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || !APP_PATHS.has(url.pathname)) return "/profile";
    return url.pathname + url.search;
  } catch {
    return "/profile";
  }
}

export function loginPath(returnTo: string) {
  return `/login?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
