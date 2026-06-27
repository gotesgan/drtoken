import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { pairing_code, clinic_id, paired_by } = await request.json();

    if (!pairing_code || !clinic_id) {
      return NextResponse.json(
        { error: "pairing_code and clinic_id are required" },
        { status: 400 },
      );
    }

    // Find the unpaired session
    const { data: session, error: findError } = await supabase
      .from("display_sessions")
      .select("*")
      .eq("pairing_code", pairing_code)
      .eq("status", "unpaired")
      .maybeSingle();

    if (findError) throw findError;
    if (!session) {
      return NextResponse.json(
        { error: "Invalid pairing code" },
        { status: 404 },
      );
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from("display_sessions")
        .update({ status: "expired" })
        .eq("id", session.id);
      return NextResponse.json(
        { error: "Pairing code has expired" },
        { status: 410 },
      );
    }

    // Pair the display
    const { data, error: updateError } = await supabase
      .from("display_sessions")
      .update({
        clinic_id,
        status: "paired",
        paired_by: paired_by ?? null,
        paired_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("id, clinic_id, status")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, session: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
