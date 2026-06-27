import { NextResponse } from "next/server";
import { updatePatientStatus } from "@/lib/db/queue";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["serving", "completed", "skipped"].includes(status)) {
      return NextResponse.json(
        { error: "status must be one of: serving, completed, skipped" },
        { status: 400 },
      );
    }

    const entry = await updatePatientStatus(id, status);
    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
