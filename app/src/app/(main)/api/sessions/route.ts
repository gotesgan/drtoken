import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  return { supabase, user };
}

// ── GET: List display sessions for a clinic ─────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinic_id = searchParams.get("clinic_id");

    if (!clinic_id) {
      return NextResponse.json(
        { error: "clinic_id query parameter is required" },
        { status: 400 },
      );
    }

    const { supabase } = await getAuthenticatedSupabase();

    const { data: sessions, error } = await supabase
      .from("display_sessions")
      .select("id, pairing_code, clinic_id, status, paired_by, paired_at, expires_at, created_at, last_seen_at")
      .eq("clinic_id", clinic_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sessions ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE: Disconnect a specific session or logout all ─────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clinic_id = searchParams.get("clinic_id");
    const session_id = searchParams.get("session_id");

    if (!clinic_id) {
      return NextResponse.json(
        { error: "clinic_id query parameter is required" },
        { status: 400 },
      );
    }

    const { supabase } = await getAuthenticatedSupabase();

    if (session_id) {
      // Disconnect a single session
      const { error } = await supabase
        .from("display_sessions")
        .update({ status: "expired", clinic_id: null })
        .eq("id", session_id)
        .eq("clinic_id", clinic_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, disconnected: session_id });
    } else {
      // Logout all sessions for this clinic
      const { error } = await supabase
        .from("display_sessions")
        .update({ status: "expired", clinic_id: null })
        .eq("clinic_id", clinic_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "all_disconnected" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
