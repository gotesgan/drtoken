import { supabase } from "@/lib/supabase";

export type QueueEntry = {
  id: string;
  clinic_id: string;
  token_number: number;
  patient_name: string;
  phone: string | null;
  status: "waiting" | "serving" | "completed" | "skipped";
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
};

export type AddPatientInput = {
  clinic_id: string;
  patient_name: string;
  phone?: string;
};

export type QueueStats = {
  waiting: number;
  serving: number;
  completed: number;
  skipped: number;
  total: number;
};

/** Get the next token number for a clinic today. */
async function getNextTokenNumber(clinicId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("queue")
    .select("token_number")
    .eq("clinic_id", clinicId)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`)
    .order("token_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to get next token: ${error.message}`);
  return (data?.[0]?.token_number ?? 0) + 1;
}

/** Add a patient to today's queue. */
export async function addPatient(input: AddPatientInput): Promise<QueueEntry> {
  const tokenNumber = await getNextTokenNumber(input.clinic_id);

  const { data, error } = await supabase
    .from("queue")
    .insert({
      clinic_id: input.clinic_id,
      token_number: tokenNumber,
      patient_name: input.patient_name,
      phone: input.phone ?? null,
      status: "waiting",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to add patient: ${error.message}`);
  return data;
}

/** Get today's queue entries for a clinic. */
export async function getTodayQueue(
  clinicId: string,
): Promise<QueueEntry[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("queue")
    .select("*")
    .eq("clinic_id", clinicId)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`)
    .order("token_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch queue: ${error.message}`);
  return data ?? [];
}

/** Get queue stats for today. */
export async function getQueueStats(clinicId: string): Promise<QueueStats> {
  const queue = await getTodayQueue(clinicId);
  return {
    waiting: queue.filter((e) => e.status === "waiting").length,
    serving: queue.filter((e) => e.status === "serving").length,
    completed: queue.filter((e) => e.status === "completed").length,
    skipped: queue.filter((e) => e.status === "skipped").length,
    total: queue.length,
  };
}

/** Update a patient's status. */
export async function updatePatientStatus(
  id: string,
  status: QueueEntry["status"],
): Promise<QueueEntry> {
  const updates: Partial<QueueEntry> = { status };

  if (status === "serving") {
    updates.called_at = new Date().toISOString();
  }
  if (status === "completed") {
    updates.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("queue")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update patient: ${error.message}`);
  return data;
}

/** Call the next waiting patient for a clinic. */
export async function callNextPatient(
  clinicId: string,
): Promise<QueueEntry | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data: nextPatient, error: fetchError } = await supabase
    .from("queue")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("status", "waiting")
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`)
    .order("token_number", { ascending: true })
    .limit(1)
    .single();

  if (fetchError) return null;

  return updatePatientStatus(nextPatient.id, "serving");
}

/** Look up a patient's token info by phone and clinic. */
export async function lookupPatient(
  clinicId: string,
  phone: string,
): Promise<{ entry: QueueEntry | null; position: number; ahead: number }> {
  const today = new Date().toISOString().split("T")[0];

  const { data: entries, error } = await supabase
    .from("queue")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone", phone)
    .gte("created_at", `${today}T00:00:00Z`)
    .lt("created_at", `${today}T23:59:59Z`)
    .order("token_number", { ascending: true });

  if (error) throw new Error(`Failed to lookup patient: ${error.message}`);

  if (!entries || entries.length === 0) {
    return { entry: null, position: 0, ahead: 0 };
  }

  const entry = entries[entries.length - 1]; // most recent
  const allToday = await getTodayQueue(clinicId);
  const waitingAhead = allToday.filter(
    (e) =>
      e.status === "waiting" &&
      e.token_number < entry.token_number,
  ).length;

  return {
    entry,
    position: waitingAhead + 1,
    ahead: waitingAhead,
  };
}
