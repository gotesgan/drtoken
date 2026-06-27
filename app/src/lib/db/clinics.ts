import { supabase } from "@/lib/supabase";

export type Clinic = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_opd_open: boolean;
  created_at: string;
};

export async function getAllClinics(): Promise<Clinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .order("name");

  if (error) throw new Error(`Failed to fetch clinics: ${error.message}`);
  return data ?? [];
}

export async function getClinic(id: string): Promise<Clinic | null> {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function toggleOpd(
  clinicId: string,
): Promise<{ is_opd_open: boolean }> {
  // Get current state first
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error("Clinic not found");

  const newState = !clinic.is_opd_open;

  const { data, error } = await supabase
    .from("clinics")
    .update({ is_opd_open: newState })
    .eq("id", clinicId)
    .select("is_opd_open")
    .single();

  if (error) throw new Error(`Failed to toggle OPD: ${error.message}`);
  return data;
}
