import { NextResponse } from "next/server";
import { getAllClinics } from "@/lib/db/clinics";

export async function GET() {
  try {
    const clinics = await getAllClinics();
    return NextResponse.json(clinics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
