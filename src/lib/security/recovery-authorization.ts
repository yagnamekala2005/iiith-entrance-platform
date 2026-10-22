import { createHmac, timingSafeEqual } from "node:crypto";

export const RECOVERY_AUTHORIZATION_COOKIE = "recovery_authorization";
const RECOVERY_AUTHORIZATION_TTL_SECONDS = 10 * 60;

function getSigningSecret(): string {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Recovery authorization is not configured.");
  return secret;
}

export function createRecoveryAuthorization(userId: string, now = Date.now()): string {
  const expiresAt = now + RECOVERY_AUTHORIZATION_TTL_SECONDS * 1000;
  const payload = Buffer.from(`${userId}:${expiresAt}`).toString("base64url");
  const signature = createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyRecoveryAuthorization(
  value: string | undefined,
  userId: string,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const [payload, receivedSignature, ...extra] = value.split(".");
  if (!payload || !receivedSignature || extra.length > 0) return false;

  let expectedSignature: Buffer;
  let actualSignature: Buffer;
  let decodedPayload: string;
  try {
    expectedSignature = createHmac("sha256", getSigningSecret()).update(payload).digest();
    actualSignature = Buffer.from(receivedSignature, "base64url");
    decodedPayload = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  if (actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)) return false;

  const separator = decodedPayload.lastIndexOf(":");
  if (separator < 1 || decodedPayload.slice(0, separator) !== userId) return false;
  const expiresAt = Number(decodedPayload.slice(separator + 1));
  return Number.isSafeInteger(expiresAt) && expiresAt > now;
}

export const recoveryCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: RECOVERY_AUTHORIZATION_TTL_SECONDS,
};
