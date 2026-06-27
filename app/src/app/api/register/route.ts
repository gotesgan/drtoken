import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password, displayName, clinicId, newStaffRole, newStaffPerms, newStaffName } = await request.json();

    if (!email || !clinicId) {
      return NextResponse.json(
        { error: "email and clinicId are required" },
        { status: 400 },
      );
    }

    // 1. Create the auth user with a random password (placeholder)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: password || Math.random().toString(36).slice(-10),
      options: {
        data: { display_name: newStaffName || displayName || email.split("@")[0] },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Failed to create user");

    // 2. Update profile with clinic and role
    const updates: Record<string, unknown> = {
      clinic_id: clinicId,
      role: newStaffRole || "receptionist",
      display_name: newStaffName || displayName || email.split("@")[0],
    };

    // Add permission overrides
    if (newStaffPerms) {
      Object.entries(newStaffPerms).forEach(([key, val]) => {
        (updates as Record<string, string | boolean | null>)[key] = val as string | boolean | null;
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    // 3. Send invite email (password reset link) so the staff can set their own password
    const { error: inviteError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/reset-password`,
    });

    if (inviteError) throw inviteError;

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
