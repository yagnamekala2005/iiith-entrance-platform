export function safeInternalRedirect(
  destination: string | null | undefined,
  fallback: string,
  origin: string,
): string {
  if (!destination || !destination.startsWith("/") || destination.startsWith("//") || destination.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(destination, origin);
    if (parsed.origin !== new URL(origin).origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
