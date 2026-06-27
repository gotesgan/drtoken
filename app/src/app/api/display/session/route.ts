import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST() {
  try {
    // Generate unique 4-digit code
    let pairing_code: string;
    let attempts = 0;
    do {
      pairing_code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data: existing } = await supabase
        .from("display_sessions")
        .select("id")
        .eq("pairing_code", pairing_code)
        .eq("status", "unpaired")
        .maybeSingle();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("display_sessions")
      .insert({ pairing_code, status: "unpaired" })
      .select("id, pairing_code, status, expires_at")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("display_sessions")
      .select("*, clinics!display_sessions_clinic_id_fkey(name)")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
