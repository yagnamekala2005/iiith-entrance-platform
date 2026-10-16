import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function getClientAddress(requestHeaders: Headers): string {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwardedFor && isIP(forwardedFor) ? forwardedFor : "unknown";
}

export async function checkRateLimit(
  scope: string,
  limit: number,
  windowSeconds: number,
  identity?: string,
  requestHeaders?: Headers,
): Promise<RateLimitResult> {
  const currentHeaders = requestHeaders ?? await headers();
  const address = getClientAddress(currentHeaders);
  const key = createHash("sha256")
    .update(`${scope}\0${address}\0${identity?.trim().toLowerCase() ?? ""}`)
    .digest("hex");
  const { data, error } = await createAdminClient().rpc("consume_security_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Shared rate limiter is unavailable:", error);
    throw new Error("Rate limiting is temporarily unavailable.");
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result.allowed !== "boolean") {
    throw new Error("Shared rate limiter returned an invalid response.");
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: Number(result.retry_after_seconds) || windowSeconds,
  };
}
