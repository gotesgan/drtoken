import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { opd_mode } = body;

    if (!opd_mode || !["open_dr_in", "open_dr_out", "closed"].includes(opd_mode)) {
      return NextResponse.json(
        { error: "opd_mode must be one of: open_dr_in, open_dr_out, closed" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("clinics")
      .update({
        opd_mode,
        is_opd_open: opd_mode !== "closed",
      })
      .eq("id", id)
      .select("id, name, opd_mode, is_opd_open")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
