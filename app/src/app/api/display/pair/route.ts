import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { pairing_code, clinic_id, session_id, paired_by } = await request.json();

    // Support pairing by session_id (QR code scan) or pairing_code + clinic_id (manual entry)
    let session;

    if (session_id) {
      const { data, error } = await supabase
        .from("display_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("status", "unpaired")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "Invalid or already paired session" },
          { status: 404 },
        );
      }
      session = data;
    } else {
      if (!pairing_code || !clinic_id) {
        return NextResponse.json(
          { error: "pairing_code and clinic_id are required" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("display_sessions")
        .select("*")
        .eq("pairing_code", pairing_code)
        .eq("status", "unpaired")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "Invalid pairing code" },
          { status: 404 },
        );
      }
      session = data;
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
    const updateData: Record<string, unknown> = {
      status: "paired",
      paired_by: paired_by ?? null,
      paired_at: new Date().toISOString(),
    };
    if (clinic_id) updateData.clinic_id = clinic_id;

    const { data, error: updateError } = await supabase
      .from("display_sessions")
      .update(updateData)
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
