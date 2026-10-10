const DEFAULT_INTERNAL_PATH = "/";

export function getSafeInternalRedirect(
  destination: string | null | undefined,
  fallback: string = DEFAULT_INTERNAL_PATH,
): string {
  if (!destination) {
    return fallback;
  }

  const value = destination.trim();

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://internal.example");

    if (url.origin !== "https://internal.example") {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
