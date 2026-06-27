import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAllClinics } from "@/lib/db/clinics";

const anonClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function GET() {
  try {
    const clinics = await getAllClinics();
    return NextResponse.json(clinics);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address, phone } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Clinic name is required" },
        { status: 400 },
      );
    }

    // Create the clinic (anon client, no auth required for registration)
    const { data: clinic, error: insertError } = await anonClient
      .from("clinics")
      .insert({
        name: name.trim(),
        address: address || null,
        phone: phone || null,
        is_active: true,
        is_opd_open: false,
        opd_mode: "closed",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to create clinic: ${insertError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(clinic, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
