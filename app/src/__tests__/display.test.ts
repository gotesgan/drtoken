import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock chain helpers ─────────────────────────────────────

type MockChain = Record<string, vi.Mock>;

function createChain(): MockChain {
  const methods = [
    "from", "select", "insert", "update",
    "eq", "single", "maybeSingle",
  ] as const;
  const chain: MockChain = {};
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  return chain;
}

let chain: MockChain;

vi.mock("@/lib/supabase", () => {
  const c = createChain();
  return { supabase: { from: c.from } };
});

beforeEach(async () => {
  chain = createChain();
  const mod = await import("@/lib/supabase");
  mod.supabase.from.mockImplementation(() => chain);
});

// ── Helpers ────────────────────────────────────────────────

function futureDate(hoursFromNow = 24): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

function pastDate(hoursAgo = 1): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
}

// ── Tests ──────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────
// POST /api/display/session
// ───────────────────────────────────────────────────────────

describe("POST /api/display/session", () => {
  it("creates a session successfully and returns 201", async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-1",
        pairing_code: "1234",
        status: "unpaired",
        expires_at: futureDate(),
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/session/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty("id", "session-1");
    expect(body).toHaveProperty("pairing_code");
    expect(body).toHaveProperty("status", "unpaired");
    expect(body).toHaveProperty("expires_at");
    expect(body.pairing_code).toMatch(/^\d{4}$/);
  });

  it("returns 500 when the insert fails", async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Insert failed" },
    });

    const { POST } = await import("@/app/api/display/session/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toHaveProperty("error");
  });

  it("retries on code collision and succeeds on second attempt", async () => {
    // First check: collision (existing session found)
    chain.maybeSingle.mockResolvedValueOnce({
      data: { id: "existing-session" },
      error: null,
    });
    // Second check: no collision
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // Insert succeeds
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-2",
        pairing_code: "5678",
        status: "unpaired",
        expires_at: futureDate(),
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/session/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toHaveProperty("id", "session-2");
    expect(body.pairing_code).toMatch(/^\d{4}$/);
  });

  it("returns 500 after 10 consecutive code collisions", async () => {
    // All 10 attempts collide
    for (let i = 0; i < 10; i++) {
      chain.maybeSingle.mockResolvedValueOnce({
        data: { id: "collision" },
        error: null,
      });
    }

    const { POST } = await import("@/app/api/display/session/route");
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Failed to generate unique code");
  });

  it("calls eq with status unpaired when checking codes", async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-3",
        pairing_code: "9012",
        status: "unpaired",
        expires_at: futureDate(),
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/session/route");
    await POST();

    expect(chain.eq).toHaveBeenCalledWith("status", "unpaired");
  });
});

// ───────────────────────────────────────────────────────────
// GET /api/display/session
// ───────────────────────────────────────────────────────────

describe("GET /api/display/session", () => {
  it("returns a session by id with status 200", async () => {
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-1",
        pairing_code: "1234",
        status: "paired",
        clinic_id: "clinic-1",
        expires_at: futureDate(),
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        clinics: { name: "Test Clinic" },
      },
      error: null,
    });

    const { GET } = await import("@/app/api/display/session/route");
    const request = new Request(
      "http://localhost:3000/api/display/session?id=session-1",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("id", "session-1");
    expect(body).toHaveProperty("pairing_code", "1234");
    expect(body.clinics).toEqual({ name: "Test Clinic" });
  });

  it("returns 400 when id query param is missing", async () => {
    const { GET } = await import("@/app/api/display/session/route");
    const request = new Request(
      "http://localhost:3000/api/display/session",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("id is required");
  });

  it("returns 404 when session is not found", async () => {
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const { GET } = await import("@/app/api/display/session/route");
    const request = new Request(
      "http://localhost:3000/api/display/session?id=nonexistent",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Session not found");
  });

  it("returns session without clinic info when unpaired", async () => {
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-2",
        pairing_code: "5678",
        status: "unpaired",
        clinic_id: null,
        expires_at: futureDate(),
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        clinics: null,
      },
      error: null,
    });

    const { GET } = await import("@/app/api/display/session/route");
    const request = new Request(
      "http://localhost:3000/api/display/session?id=session-2",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("unpaired");
    expect(body.clinics).toBeNull();
  });
});

// ───────────────────────────────────────────────────────────
// POST /api/display/pair
// ───────────────────────────────────────────────────────────

describe("POST /api/display/pair", () => {
  it("pairs a display successfully with valid code", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "session-1",
        pairing_code: "1234",
        status: "unpaired",
        expires_at: futureDate(),
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-1",
        clinic_id: "clinic-1",
        status: "paired",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: "1234",
          clinic_id: "clinic-1",
        }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.session).toHaveProperty("id", "session-1");
    expect(body.session).toHaveProperty("clinic_id", "clinic-1");
    expect(body.session).toHaveProperty("status", "paired");
  });

  it("returns 400 when pairing_code is missing", async () => {
    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: "clinic-1" }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("pairing_code and clinic_id are required");
  });

  it("returns 400 when clinic_id is missing", async () => {
    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairing_code: "1234" }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("pairing_code and clinic_id are required");
  });

  it("returns 404 when pairing code is not found", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: "9999",
          clinic_id: "clinic-1",
        }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Invalid pairing code");
  });

  it("returns 410 when pairing code has expired", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "session-expired",
        pairing_code: "1111",
        status: "unpaired",
        expires_at: pastDate(2),
        created_at: pastDate(26),
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: "1111",
          clinic_id: "clinic-1",
        }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body.error).toBe("Pairing code has expired");
  });

  it("pairs a display with optional paired_by field", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "session-2",
        pairing_code: "2468",
        status: "unpaired",
        expires_at: futureDate(),
        created_at: new Date().toISOString(),
      },
      error: null,
    });
    chain.single.mockResolvedValueOnce({
      data: {
        id: "session-2",
        clinic_id: "clinic-2",
        status: "paired",
      },
      error: null,
    });

    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: "2468",
          clinic_id: "clinic-2",
          paired_by: "Dr. Smith",
        }),
      },
    );
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.session.status).toBe("paired");
  });

  it("searches for unpaired sessions only", async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { POST } = await import("@/app/api/display/pair/route");
    const request = new Request(
      "http://localhost:3000/api/display/pair",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairing_code: "1234",
          clinic_id: "clinic-1",
        }),
      },
    );
    await POST(request);

    expect(chain.eq).toHaveBeenCalledWith("status", "unpaired");
    expect(chain.eq).toHaveBeenCalledWith("pairing_code", "1234");
  });
});

// ───────────────────────────────────────────────────────────
// PATCH /api/display/heartbeat
// ───────────────────────────────────────────────────────────

describe("PATCH /api/display/heartbeat", () => {
  it("updates last_seen_at and returns 200", async () => {
    const { PATCH } = await import("@/app/api/display/heartbeat/route");
    const request = new Request(
      "http://localhost:3000/api/display/heartbeat?id=session-1",
      { method: "PATCH" },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify the update was called with last_seen_at
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ last_seen_at: expect.any(String) }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "session-1");
  });

  it("returns 400 when id is missing", async () => {
    const { PATCH } = await import("@/app/api/display/heartbeat/route");
    const request = new Request(
      "http://localhost:3000/api/display/heartbeat",
      { method: "PATCH" },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("id is required");
  });

  it("returns 500 when DB update fails", async () => {
    // Make eq return an error by overriding the resolved value
    // Use a real Error instance since the catch block checks instanceof Error
    chain.eq.mockResolvedValueOnce({ error: new Error("DB error") });

    const { PATCH } = await import("@/app/api/display/heartbeat/route");
    const request = new Request(
      "http://localhost:3000/api/display/heartbeat?id=session-1",
      { method: "PATCH" },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB error");
  });
});
