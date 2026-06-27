import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");
    const date = searchParams.get("date");

    if (!clinicId || !date) {
      return NextResponse.json(
        { error: "clinic_id and date are required" },
        { status: 400 },
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be in YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from("queue")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("token_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type QueueRow = { status: string };
    const queue = (data ?? []) as QueueRow[];
    const stats = {
      waiting: queue.filter((e) => e.status === "waiting").length,
      serving: queue.filter((e) => e.status === "serving").length,
      completed: queue.filter((e) => e.status === "completed").length,
      skipped: queue.filter((e) => e.status === "skipped").length,
      total: queue.length,
    } as { waiting: number; serving: number; completed: number; skipped: number; total: number };

    return NextResponse.json({ queue, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
