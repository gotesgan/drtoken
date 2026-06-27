"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_opd_open: boolean;
  opd_mode: "open_dr_in" | "open_dr_out" | "closed";
  created_at: string;
}

interface ClinicContextType {
  clinics: Clinic[];
  selectedClinicId: string;
  setSelectedClinicId: (id: string) => void;
  selectedClinic: Clinic | undefined;
}

const ClinicContext = createContext<ClinicContextType>({
  clinics: [],
  selectedClinicId: "",
  setSelectedClinicId: () => {},
  selectedClinic: undefined,
});

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");

  useEffect(() => {
    fetch("/api/clinics")
      .then((r) => r.json())
      .then((data: Clinic[]) => {
        setClinics(data);
        if (data.length > 0 && !selectedClinicId) {
          setSelectedClinicId(data[0].id);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);

  return (
    <ClinicContext.Provider
      value={{ clinics, selectedClinicId, setSelectedClinicId, selectedClinic }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  return useContext(ClinicContext);
}
