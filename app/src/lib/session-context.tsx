"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import type { UserRole } from "./permissions";

export interface SessionUser {
  id: string;
  role: UserRole;
  clinicId: string;
  displayName: string;
  email: string | null;
  emailConfirmed: boolean;
  /** Individual permission overrides (snake_case keys). Individual values are null when using role default. */
  permissions: Record<string, boolean | null>;
}

interface SessionContextType {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Initial fetch — runs once on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          setUser(null);
          return;
        }
        return res.json();
      })
      .then((data) => {
        setUser(data ?? null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Refresh — can be called manually (e.g. after profile update)
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
