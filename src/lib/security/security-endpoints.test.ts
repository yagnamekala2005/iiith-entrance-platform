import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  checkRateLimit: vi.fn(),
  cookies: vi.fn(),
  verifyRecoveryAuthorization: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: mocks.checkRateLimit }));
vi.mock("@/lib/security/recovery-authorization", () => ({
  RECOVERY_AUTHORIZATION_COOKIE: "recovery_authorization",
  verifyRecoveryAuthorization: mocks.verifyRecoveryAuthorization,
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: vi.fn() }));

import { addAdminUserByEmail } from "@/lib/admin/actions";
import { POST as cleanTestsPost } from "@/app/api/admin/clean-tests/route";
import * as cleanTestsRoute from "@/app/api/admin/clean-tests/route";
import { POST as createOrderPost } from "@/app/api/payments/create-order/route";
import { POST as updatePasswordPost } from "@/app/api/auth/update-password/route";
import { authorizeAdminAction } from "@/lib/admin/authorization";

function createRequest(path: string, body?: unknown, origin = "https://app.example") {
  return new Request(`https://app.example${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function createAdminMembershipClient(membership: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: membership, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    from,
    auth: { admin: { listUsers: vi.fn() } },
    storage: {},
    rpc: vi.fn(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 1 });
  mocks.createAdminClient.mockReturnValue(createAdminMembershipClient());
  mocks.cookies.mockResolvedValue({
    get: vi.fn().mockReturnValue({ value: "invalid-proof" }),
    delete: vi.fn(),
  });
  mocks.verifyRecoveryAuthorization.mockReturnValue(false);
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      updateUser: vi.fn(),
    },
  });
});

describe("admin authorization", () => {
  it("denies unauthenticated and non-admin users before privileged actions", async () => {
    const unauthorized = await addAdminUserByEmail("promote@example.com");
    expect(unauthorized.success).toBe(false);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();

    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } }, error: null }) },
    });
    const adminClient = createAdminMembershipClient(null);
    mocks.createAdminClient.mockReturnValue(adminClient);

    const nonAdmin = await addAdminUserByEmail("promote@example.com");
    expect(nonAdmin.success).toBe(false);
    expect(adminClient.auth.admin.listUsers).not.toHaveBeenCalled();
  });

  it("denies non-admin cleanup and does not expose destructive GET", async () => {
    const response = await cleanTestsPost(createRequest("/api/admin/clean-tests", {
      confirmation: "PURGE_OLD_TESTS",
    }));
    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect("GET" in cleanTestsRoute).toBe(false);
  });

  it("returns authorization failure when the database membership check errors", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null }) },
    });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error("db unavailable") });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });

    expect(await authorizeAdminAction()).toEqual({
      ok: false,
      error: "Unable to verify admin authorization.",
    });
  });
});

describe("protected endpoints", () => {
  it("rejects cross-origin mutations before authentication or rate-limit work", async () => {
    const response = await createOrderPost(createRequest(
      "/api/payments/create-order",
      { testId: "4a1c5e62-63dd-4c5a-98bc-6c60e66a87f0" },
      "https://attacker.example",
    ));
    expect(response.status).toBe(403);
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rate limits payment-order requests and rejects unauthenticated callers", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 40 });
    const limited = await createOrderPost(createRequest("/api/payments/create-order", {
      testId: "4a1c5e62-63dd-4c5a-98bc-6c60e66a87f0",
    }));
    expect(limited.status).toBe(429);

    mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 1 });
    const unauthenticated = await createOrderPost(createRequest("/api/payments/create-order", {
      testId: "4a1c5e62-63dd-4c5a-98bc-6c60e66a87f0",
    }));
    expect(unauthenticated.status).toBe(401);
  });

  it("rejects password-update attempts without verified recovery authorization", async () => {
    const updateUser = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
        updateUser,
      },
    });

    const response = await updatePasswordPost(createRequest("/api/auth/update-password", {
      password: "a-new-password-123",
    }));
    expect(response.status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
