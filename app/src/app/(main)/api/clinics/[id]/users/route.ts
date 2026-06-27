import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Fetch users for this clinic (including permission columns)
    const { data: users, error } = await supabase
      .from("profiles")
      .select(
        "id, email, display_name, role, created_at, " +
        "can_call, can_complete, can_skip, can_toggle_opd, " +
        "can_manage_users, can_manage_settings, can_view_history",
      )
      .eq("clinic_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(users ?? []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clinicId } = await params;
    const body = await request.json();
    const { userId, role, permissions } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Build updates — supports role change, individual permission overrides, or both
    const updates: Record<string, boolean | string | null> = {};

    if (role) {
      const validRoles = ["admin", "doctor", "receptionist"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: "role must be one of: admin, doctor, receptionist" },
          { status: 400 },
        );
      }
      updates.role = role;
    }

    if (permissions) {
      const validKeys = [
        "can_call", "can_complete", "can_skip", "can_toggle_opd",
        "can_manage_users", "can_manage_settings", "can_view_history",
      ];
      for (const [key, value] of Object.entries(permissions)) {
        if (validKeys.includes(key) && (typeof value === "boolean" || value === null)) {
          updates[key] = value;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update. Provide role, permissions, or both." },
        { status: 400 },
      );
    }

    // Update the user's profile
    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .eq("clinic_id", clinicId)
      .select(
        "id, email, display_name, role, created_at, " +
        "can_call, can_complete, can_skip, can_toggle_opd, " +
        "can_manage_users, can_manage_settings, can_view_history",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
