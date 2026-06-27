import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(null, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "id, role, clinic_id, display_name, email, " +
        "can_call, can_complete, can_skip, can_toggle_opd, " +
        "can_manage_users, can_manage_settings, can_view_history",
      )
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(null, { status: 401 });
    }

    const p = profile as unknown as {
      id: string;
      role: string;
      clinic_id: string;
      display_name: string | null;
      email: string | null;
      can_call: boolean | null;
      can_complete: boolean | null;
      can_skip: boolean | null;
      can_toggle_opd: boolean | null;
      can_manage_users: boolean | null;
      can_manage_settings: boolean | null;
      can_view_history: boolean | null;
    };

    return NextResponse.json({
      id: p.id,
      role: p.role,
      clinicId: p.clinic_id,
      displayName: p.display_name,
      email: p.email,
      emailConfirmed: !!user.email_confirmed_at,
      permissions: {
        can_call: p.can_call,
        can_complete: p.can_complete,
        can_skip: p.can_skip,
        can_toggle_opd: p.can_toggle_opd,
        can_manage_users: p.can_manage_users,
        can_manage_settings: p.can_manage_settings,
        can_view_history: p.can_view_history,
      },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
