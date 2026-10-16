import { NextRequest, NextResponse } from "next/server";

function createContentSecurityPolicy(nonce: string, isHttps: boolean): string {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? (() => {
        try {
          return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
        } catch {
          return "";
        }
      })()
    : "";
  const supabaseWebSocketOrigin = supabaseOrigin
    .replace(/^https:/, "wss:")
    .replace(/^http:/, "ws:");
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://api.razorpay.com",
    "https://checkout.razorpay.com",
    supabaseOrigin,
    supabaseWebSocketOrigin,
  ].filter(Boolean).join(" ");
  const developmentDirectives = process.env.NODE_ENV === "development"
    ? " 'unsafe-eval'"
    : "";
  const transportDirective = isHttps && process.env.NODE_ENV === "production"
    ? " upgrade-insecure-requests;"
    : "";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com${developmentDirectives}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
    "form-action 'self' https://api.razorpay.com",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ].join("; ") + `;${transportDirective}`;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isHttps = request.nextUrl.protocol === "https:";
  const csp = createContentSecurityPolicy(nonce, isHttps);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  if (isHttps && process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
