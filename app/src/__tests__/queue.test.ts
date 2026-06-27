import { describe, it, expect, vi, beforeEach } from "vitest";

type MockChain = Record<string, vi.Mock>;

// ── Fresh chain per test ───────────────────────────────────

function createChain(): MockChain {
  const methods = [
    "from", "select", "insert", "update",
    "eq", "gte", "lt", "order", "limit", "single",
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

// ── Tests ──────────────────────────────────────────────────

describe("Queue DB Functions", () => {
  // ── addPatient ───────────────────────────────────────────
  // These tests set up mock return values for the chain's
  // final .single() call. The first single() is consumed by
  // getNextTokenNumber, the second by the insert operation.

  describe("addPatient", () => {
    it("starts at token 1 when no tokens exist today", async () => {
      // getNextTokenNumber ends with .limit(1) — return no prior tokens
      chain.limit.mockResolvedValueOnce({ data: [], error: null });
      // addPatient's insert → select → .single()
      chain.single.mockResolvedValueOnce({
        data: {
          id: "1", clinic_id: "clinic-1", token_number: 1,
          patient_name: "John Doe", phone: null, status: "waiting",
          created_at: new Date().toISOString(),
          called_at: null, completed_at: null,
        },
        error: null,
      });

      const { addPatient } = await import("@/lib/db/queue");
      const result = await addPatient({ clinic_id: "clinic-1", patient_name: "John Doe" });
      expect(result).toBeDefined();
      expect(result.token_number).toBe(1);
    });

    it("increments token when queue has entries", async () => {
      // getNextTokenNumber: prior token 5 exists today
      chain.limit.mockResolvedValueOnce({ data: [{ token_number: 5 }], error: null });
      // addPatient's insert → .single() → new token 6
      chain.single.mockResolvedValueOnce({
        data: {
          id: "2", clinic_id: "clinic-1", token_number: 6,
          patient_name: "Jane Doe", phone: "555-1234", status: "waiting",
          created_at: new Date().toISOString(),
          called_at: null, completed_at: null,
        },
        error: null,
      });

      const { addPatient } = await import("@/lib/db/queue");
      const result = await addPatient({
        clinic_id: "clinic-1", patient_name: "Jane Doe", phone: "555-1234",
      });
      expect(result).toBeDefined();
      expect(result.token_number).toBe(6);
    });
  });

  // ── getTodayQueue ────────────────────────────────────────

  describe("getTodayQueue", () => {
    it("returns sorted queue entries", async () => {
      chain.order.mockResolvedValueOnce({
        data: [
          { id: "1", token_number: 1, status: "waiting", patient_name: "Alice" },
          { id: "2", token_number: 2, status: "serving", patient_name: "Bob" },
        ],
        error: null,
      });

      const { getTodayQueue } = await import("@/lib/db/queue");
      const result = await getTodayQueue("clinic-1");

      expect(result).toHaveLength(2);
      expect(result[0].token_number).toBe(1);
    });

    it("returns empty array when no queue", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });

      const { getTodayQueue } = await import("@/lib/db/queue");
      const result = await getTodayQueue("clinic-1");

      expect(result).toEqual([]);
    });
  });

  // ── updatePatientStatus ──────────────────────────────────

  describe("updatePatientStatus", () => {
    it("sets serving status with called_at", async () => {
      chain.single.mockResolvedValueOnce({
        data: { id: "1", status: "serving", called_at: new Date().toISOString(), completed_at: null },
        error: null,
      });

      const { updatePatientStatus } = await import("@/lib/db/queue");
      const result = await updatePatientStatus("1", "serving");

      expect(result.status).toBe("serving");
      expect(result.called_at).toBeTruthy();
    });

    it("sets completed status with completed_at", async () => {
      chain.single.mockResolvedValueOnce({
        data: { id: "1", status: "completed", completed_at: new Date().toISOString() },
        error: null,
      });

      const { updatePatientStatus } = await import("@/lib/db/queue");
      const result = await updatePatientStatus("1", "completed");

      expect(result.status).toBe("completed");
      expect(result.completed_at).toBeTruthy();
    });
  });

  // ── lookupPatient ────────────────────────────────────────

  describe("lookupPatient", () => {
    it("returns position info for a found patient", async () => {
      chain.order
        .mockResolvedValueOnce({
          data: [{ id: "2", token_number: 2, status: "waiting", phone: "555" }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: "1", token_number: 1, status: "waiting" },
            { id: "2", token_number: 2, status: "waiting" },
            { id: "3", token_number: 3, status: "waiting" },
          ],
          error: null,
        });

      const { lookupPatient } = await import("@/lib/db/queue");
      const result = await lookupPatient("clinic-1", "555");

      expect(result.entry).toBeTruthy();
      expect(result.entry!.token_number).toBe(2);
      expect(result.ahead).toBe(1);
      expect(result.position).toBe(2);
    });

    it("returns null entry when patient not found", async () => {
      chain.order.mockResolvedValueOnce({ data: [], error: null });

      const { lookupPatient } = await import("@/lib/db/queue");
      const result = await lookupPatient("clinic-1", "999");

      expect(result.entry).toBeNull();
      expect(result.ahead).toBe(0);
    });
  });

  // ── getQueueStats ────────────────────────────────────────

  describe("getQueueStats", () => {
    it("calculates correct stats", async () => {
      chain.order.mockResolvedValueOnce({
        data: [
          { id: "1", status: "waiting" },
          { id: "2", status: "waiting" },
          { id: "3", status: "serving" },
          { id: "4", status: "completed" },
          { id: "5", status: "completed" },
          { id: "6", status: "skipped" },
        ],
        error: null,
      });

      const { getQueueStats } = await import("@/lib/db/queue");
      const stats = await getQueueStats("clinic-1");

      expect(stats.waiting).toBe(2);
      expect(stats.serving).toBe(1);
      expect(stats.completed).toBe(2);
      expect(stats.skipped).toBe(1);
      expect(stats.total).toBe(6);
    });
  });

  // ── callNextPatient ──────────────────────────────────────

  describe("callNextPatient", () => {
    it("calls the next waiting patient", async () => {
      chain.single
        .mockResolvedValueOnce({ data: { id: "1", status: "waiting" }, error: null })
        .mockResolvedValueOnce({
          data: { id: "1", status: "serving", called_at: new Date().toISOString() },
          error: null,
        });

      const { callNextPatient } = await import("@/lib/db/queue");
      const result = await callNextPatient("clinic-1");

      expect(result).toBeTruthy();
      expect(result!.status).toBe("serving");
    });

    it("returns null when no waiting patients", async () => {
      chain.single.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

      const { callNextPatient } = await import("@/lib/db/queue");
      const result = await callNextPatient("clinic-1");

      expect(result).toBeNull();
    });
  });
});

describe("Clinics DB Functions", () => {
  it("getAllClinics returns list ordered by name", async () => {
    chain.order.mockResolvedValueOnce({
      data: [
        { id: "1", name: "A Clinic", is_opd_open: true },
        { id: "2", name: "B Clinic", is_opd_open: false },
      ],
      error: null,
    });

    const { getAllClinics } = await import("@/lib/db/clinics");
    const result = await getAllClinics();

    expect(result).toHaveLength(2);
  });

  it("getClinic returns null when not found", async () => {
    chain.single.mockResolvedValueOnce({ data: null, error: { message: "not found" } });

    const { getClinic } = await import("@/lib/db/clinics");
    const result = await getClinic("nonexistent");

    expect(result).toBeNull();
  });

  it("getClinic returns clinic when found", async () => {
    chain.single.mockResolvedValueOnce({
      data: { id: "1", name: "Test Clinic", is_opd_open: true },
      error: null,
    });

    const { getClinic } = await import("@/lib/db/clinics");
    const result = await getClinic("1");

    expect(result).toEqual({ id: "1", name: "Test Clinic", is_opd_open: true });
  });

  it("toggleOpd toggles the opd state", async () => {
    chain.single
      .mockResolvedValueOnce({ data: { id: "1", name: "Test", is_opd_open: false }, error: null })
      .mockResolvedValueOnce({ data: { is_opd_open: true }, error: null });

    const { toggleOpd } = await import("@/lib/db/clinics");
    const result = await toggleOpd("1");

    expect(result.is_opd_open).toBe(true);
  });
});
