import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

// ── Shared auth helper ──────────────────────────────────────────────────────

async function getAuthenticatedSupabase() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  return { supabase, user };
}

// ── GET: Retrieve clinic settings ───────────────────────────────────────────

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

    const { data: settings, error } = await supabase
      .from("clinic_settings")
      .select("*")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(settings ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST: Create default clinic settings (idempotent) ───────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clinic_id } = body;

    if (!clinic_id) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 },
      );
    }

    const { supabase } = await getAuthenticatedSupabase();

    // Check if settings already exist
    const { data: existing } = await supabase
      .from("clinic_settings")
      .select("id")
      .eq("clinic_id", clinic_id)
      .maybeSingle();

    if (existing) {
      // Already exists — return existing settings
      const { data: settings } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("clinic_id", clinic_id)
        .single();

      return NextResponse.json(settings);
    }

    // Create default clinic settings
    const { data: settings, error: insertError } = await supabase
      .from("clinic_settings")
      .insert({
        clinic_id,
        max_patients_per_call: 1,
        allow_self_registration: false,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create settings: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(settings, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PATCH: Update clinic settings ──────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { clinic_id, max_patients_per_call, allow_self_registration } = body;

    if (!clinic_id) {
      return NextResponse.json(
        { error: "clinic_id is required" },
        { status: 400 },
      );
    }

    const { supabase } = await getAuthenticatedSupabase();

    const updates: Record<string, unknown> = {};
    if (max_patients_per_call !== undefined) {
      updates.max_patients_per_call = max_patients_per_call;
    }
    if (allow_self_registration !== undefined) {
      updates.allow_self_registration = allow_self_registration;
    }
    updates.updated_at = new Date().toISOString();

    // Upsert: update if exists, insert if not
    const { data: settings, error } = await supabase
      .from("clinic_settings")
      .upsert(
        { clinic_id, ...updates },
        { onConflict: "clinic_id" },
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
