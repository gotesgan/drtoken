import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password, displayName, clinicName, clinicAddress, clinicPhone } = await request.json();

    if (!email || !password || !clinicName) {
      return NextResponse.json(
        { error: "email, password, and clinicName are required" },
        { status: 400 },
      );
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || email.split("@")[0] },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // 2. Create clinic
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name: clinicName.trim(),
        address: clinicAddress?.trim() || null,
        phone: clinicPhone?.trim() || null,
      })
      .select("*")
      .single();

    if (clinicError) throw clinicError;

    // 3. Update profile with clinic_id and admin role
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        clinic_id: clinic.id,
        role: "admin",
        display_name: displayName?.trim() || email.split("@")[0],
      })
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    // 4. Create default settings
    await supabase
      .from("clinic_settings")
      .insert({ clinic_id: clinic.id })
      .maybeSingle();

    return NextResponse.json({ success: true, user: authData.user, clinic });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
