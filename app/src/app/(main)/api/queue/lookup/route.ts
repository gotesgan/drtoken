import { NextResponse } from "next/server";
import { lookupPatient } from "@/lib/db/queue";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get("clinic_id");
    const phone = searchParams.get("phone");

    if (!clinicId || !phone) {
      return NextResponse.json(
        { error: "clinic_id and phone are required" },
        { status: 400 },
      );
    }

    const result = await lookupPatient(clinicId, phone);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
