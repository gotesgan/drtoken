import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { display_name } = body;

    if (!display_name || typeof display_name !== "string" || !display_name.trim()) {
      return NextResponse.json(
        { error: "display_name is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update({ display_name: display_name.trim() })
      .eq("id", user.id)
      .select("id, display_name, email, role")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
