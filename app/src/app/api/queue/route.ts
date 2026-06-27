import { NextResponse } from "next/server";
import { addPatient, getTodayQueue, getQueueStats } from "@/lib/db/queue";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");

    if (!clinicId) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 },
      );
    }

    const [queue, stats] = await Promise.all([
      getTodayQueue(clinicId),
      getQueueStats(clinicId),
    ]);

    return NextResponse.json({ queue, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinic_id, patient_name, phone } = body;

    if (!clinic_id || !patient_name) {
      return NextResponse.json(
        { error: "clinic_id and patient_name are required" },
        { status: 400 },
      );
    }

    const entry = await addPatient({
      clinic_id,
      patient_name,
      phone: phone || undefined,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
