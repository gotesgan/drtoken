"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import { useSession } from "@/lib/session-context";
import { PERMISSIONS, PERMISSION_KEY_MAP, mergePermissions, type UserRole, type ProfilePermissions } from "@/lib/permissions";
import { useClinic } from "@/lib/clinic-context";
import { Loader2, Check, X, Save, UserCog, Monitor, Sliders, User } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ClinicUser {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  created_at: string;
  can_call: boolean | null;
  can_complete: boolean | null;
  can_skip: boolean | null;
  can_toggle_opd: boolean | null;
  can_manage_users: boolean | null;
  can_manage_settings: boolean | null;
  can_view_history: boolean | null;
}

/** Permission definition for rendering checkboxes. */
interface PermissionDef {
  dbKey: keyof ProfilePermissions;
  label: string;
}

const PERMISSION_DEFS: PermissionDef[] = [
  { dbKey: "can_call", label: "Call Patient" },
  { dbKey: "can_complete", label: "Complete Patient" },
  { dbKey: "can_skip", label: "Skip Patient" },
  { dbKey: "can_toggle_opd", label: "Toggle OPD" },
  { dbKey: "can_manage_users", label: "Manage Users" },
  { dbKey: "can_manage_settings", label: "Manage Settings" },
  { dbKey: "can_view_history", label: "View History" },
];

interface DisplaySession {
  id: string;
  pairing_code: string;
  status: string;
  paired_by: string | null;
  paired_at: string | null;
  created_at: string;
  last_seen_at: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    case "doctor":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "receptionist":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
}

/* ── Section Card ───────────────────────────────────────────────────────── */

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas p-4 shadow-level-1 sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-canvas-soft">
          <Icon className="size-4 text-ink" aria-hidden="true" />
        </div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Profile Form ───────────────────────────────────────────────────────── */

function ProfileSection({ user, refreshSession }: { 
  user: NonNullable<ReturnType<typeof useSession>["user"]>;
  refreshSession: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile");
      }
      setSuccess(true);
      refreshSession();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }, [displayName, refreshSession]);

  return (
    <SectionCard title="Profile" icon={User}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display-name" className="text-sm font-medium text-ink">
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="rounded-lg border border-hairline bg-canvas h-10 px-3 text-sm text-ink placeholder:text-mute outline-none focus:border-link focus:shadow-level-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Email</label>
          <input
            type="email"
            value={user.email ?? ""}
            readOnly
            disabled
            className="rounded-lg border border-hairline bg-canvas-soft h-10 px-3 text-sm text-body outline-none cursor-not-allowed"
          />
          <p className="text-xs text-mute">
            Email is managed through your authentication provider
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink">Role</label>
          <input
            type="text"
            value={user.role}
            readOnly
            disabled
            className="rounded-lg border border-hairline bg-canvas-soft h-10 px-3 text-sm text-body outline-none cursor-not-allowed"
          />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
            <X className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Save
          </button>
          {success && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="size-3.5" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

/* ── Users Section ──────────────────────────────────────────────────────── */

function UsersSection({ selectedClinicId }: { selectedClinicId: string }) {
  const [users, setUsers] = useState<ClinicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changingPermission, setChangingPermission] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("receptionist");
  const [newStaffPerms, setNewStaffPerms] = useState<Record<string, boolean>>({});
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const { user } = useSession();
  const fetchedRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clinics/${selectedClinicId}/users`);
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [selectedClinicId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchUsers();
  }, [fetchUsers]);

  /** Get the effective value for a permission (role default overridden by individual value). */
  const getEffectivePermission = useCallback(
    (profileUser: ClinicUser, dbKey: keyof ProfilePermissions): boolean => {
      const roleDefault = PERMISSIONS[profileUser.role][PERMISSION_KEY_MAP[dbKey]];
      return profileUser[dbKey] ?? roleDefault;
    },
    [],
  );

  const handlePermissionToggle = useCallback(
    async (profileUserId: string, dbKey: keyof ProfilePermissions, newValue: boolean) => {
      const toggleId = `${profileUserId}-${dbKey}`;
      try {
        setChangingPermission(toggleId);
        const res = await fetch(`/api/clinics/${selectedClinicId}/users`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: profileUserId,
            permissions: { [dbKey]: newValue },
          }),
        });
        if (!res.ok) throw new Error("Failed to update permission");
        fetchUsers();
      } catch {
        setError("Failed to update permission");
      } finally {
        setChangingPermission(null);
      }
    },
    [selectedClinicId, fetchUsers],
  );

  const handleAddUser = async () => {
    if (!newStaffEmail) return;
    setAddingUser(true);
    setAddUserError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStaffEmail,
          password: Math.random().toString(36).slice(-10),
          displayName: newStaffName.trim() || newStaffEmail.split("@")[0],
          clinicName: "temp",
          newStaffName: newStaffName.trim(),
          newStaffRole,
          newStaffPerms,
          clinicId: selectedClinicId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create user");
      }

      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffPerms({});
      fetchUsers();
    } catch (err) {
      setAddUserError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <SectionCard title="Users" icon={UserCog}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-4 animate-spin text-mute" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-body">No users found in this clinic.</p>
      ) : (
        <div className="space-y-4">
          {users.map((u) => {
            const isSelf = user?.id === u.id;
            return (
              <div
                key={u.id}
                className="rounded-lg border border-hairline bg-canvas-soft/50 px-3 py-3 sm:px-4"
              >
                {/* Top row: name + role badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink break-words">
                      {u.display_name || u.email || "Unknown"}
                      {isSelf && (
                        <span className="ml-2 text-[10px] text-mute font-normal">
                          (you)
                        </span>
                      )}
                    </p>
                    {u.email && (
                      <p className="text-xs text-body break-all">{u.email}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(u.role)}`}
                  >
                    {u.role}
                  </span>
                </div>

                {/* Permission toggles */}
                {!isSelf && (
                  <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2">
                    {PERMISSION_DEFS.map((perm) => {
                      const effectiveValue = getEffectivePermission(u, perm.dbKey);
                      const isCustom = u[perm.dbKey] !== null;
                      const toggleId = `${u.id}-${perm.dbKey}`;
                      const isLoading = changingPermission === toggleId;

                      return (
                        <label
                          key={perm.dbKey}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={effectiveValue}
                            onChange={() =>
                              handlePermissionToggle(
                                u.id,
                                perm.dbKey,
                                !effectiveValue,
                              )
                            }
                            disabled={isLoading}
                            className="size-4 accent-ink rounded disabled:opacity-40"
                            aria-label={`${perm.label} for ${u.display_name || u.email}`}
                          />
                          <span className="text-xs text-ink group-hover:text-body transition-colors">
                            {perm.label}
                          </span>
                          {isLoading ? (
                            <Loader2 className="size-3 animate-spin text-mute shrink-0" />
                          ) : (
                            <span
                              className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full shrink-0 ${
                                isCustom
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                              }`}
                            >
                              {isCustom ? "Custom" : "From role"}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Form */}
      <div className="mt-6 border-t border-hairline pt-4">
        <p className="text-sm font-medium text-ink">Add Staff Member</p>
        <p className="mt-0.5 text-xs text-body">Create an account and assign permissions.</p>

        <div className="mt-3 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-canvas h-9 px-3 text-sm text-ink outline-none focus:border-link transition-colors" placeholder="Dr. Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)}
                className="w-full rounded-lg border border-hairline bg-canvas h-9 px-3 text-sm text-ink outline-none focus:border-link transition-colors" placeholder="jane@clinic.com" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
            <select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-canvas h-9 px-3 text-sm text-ink outline-none">
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Permission toggles */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PERMISSION_DEFS.map((p) => (
                <label key={p.dbKey} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newStaffPerms[p.dbKey] ?? false}
                    onChange={(e) => setNewStaffPerms({ ...newStaffPerms, [p.dbKey]: e.target.checked })}
                    className="size-4 accent-ink rounded" />
                  <span className="text-xs text-ink">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {addUserError && (
            <p className="text-sm text-red-600" role="alert">{addUserError}</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={handleAddUser} disabled={!newStaffEmail || addingUser}
              className="h-9 rounded-lg bg-ink px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {addingUser ? "Creating..." : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ── Devices Section ────────────────────────────────────────────────────── */

function DevicesSection({ selectedClinicId }: { selectedClinicId: string }) {
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  const fetchedRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/sessions?clinic_id=${selectedClinicId}`);
      if (!res.ok) throw new Error("Failed to load display sessions");
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [selectedClinicId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchSessions();
  }, [fetchSessions]);

  const handleDisconnect = useCallback(async (sessionId: string) => {
    try {
      setDisconnectingId(sessionId);
      const res = await fetch(
        `/api/sessions?clinic_id=${selectedClinicId}&session_id=${sessionId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to disconnect");
      fetchSessions();
    } catch {
      setError("Failed to disconnect session");
    } finally {
      setDisconnectingId(null);
    }
  }, [selectedClinicId, fetchSessions]);

  const handleLogoutAll = useCallback(async () => {
    try {
      setLoggingOutAll(true);
      const res = await fetch(`/api/sessions?clinic_id=${selectedClinicId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to logout all sessions");
      fetchSessions();
    } catch {
      setError("Failed to logout all sessions");
    } finally {
      setLoggingOutAll(false);
    }
  }, [selectedClinicId, fetchSessions]);

  return (
    <SectionCard title="Devices" icon={Monitor}>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-4 animate-spin text-mute" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600" role="alert">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-body">No paired display devices.</p>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-hairline bg-canvas-soft/50 px-3 py-3 sm:px-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink break-words">
                  Display — {s.pairing_code}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-body">
                  <span className={s.status === "paired" ? "text-emerald-600 font-medium" : ""}>
                    {s.status === "paired" ? "● Paired" : s.status}
                  </span>
                  {s.last_seen_at && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Last seen: {formatDate(s.last_seen_at)}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDisconnect(s.id)}
                disabled={disconnectingId === s.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                aria-label={`Disconnect display ${s.pairing_code}`}
              >
                {disconnectingId === s.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  "Disconnect"
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={handleLogoutAll}
            disabled={loggingOutAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {loggingOutAll ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Monitor className="size-4" aria-hidden="true" />
            )}
            Logout All Devices
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Queue Settings Section ─────────────────────────────────────────────── */

function QueueSettingsSection({ selectedClinicId }: { selectedClinicId: string }) {
  const { clinics } = useClinic();
  const clinic = clinics.find((c) => c.id === selectedClinicId);
  const [maxPatients, setMaxPatients] = useState(1);
  const [opdMode, setOpdMode] = useState<"open_dr_in" | "open_dr_out" | "closed">(clinic?.opd_mode ?? "closed");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Load clinic settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinic-settings?clinic_id=${selectedClinicId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setMaxPatients(data.max_patients_per_call);
      }
    } catch {
      // Silently handle
    }
  }, [selectedClinicId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchSettings();
  }, [fetchSettings]);

  // Sync OPD mode from clinic data
  useEffect(() => {
    if (clinic) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpdMode(clinic.opd_mode ?? "closed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic?.id, clinic?.opd_mode]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await fetch("/api/clinic-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: selectedClinicId,
          max_patients_per_call: maxPatients,
        }),
      });

      await fetch(`/api/clinics/${selectedClinicId}/opd-mode`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opd_mode: opdMode }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [selectedClinicId, maxPatients, opdMode]);

  return (
    <SectionCard title="Queue Settings" icon={Sliders}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="max-patients" className="text-sm font-medium text-ink">
            Max Patients Per Call
          </label>
          <input
            id="max-patients"
            type="number"
            min={1}
            max={10}
            value={maxPatients}
            onChange={(e) => setMaxPatients(parseInt(e.target.value) || 1)}
            className="w-24 rounded-lg border border-hairline bg-canvas h-10 px-3 text-sm text-ink outline-none focus:border-link focus:shadow-level-2"
          />
          <p className="text-xs text-mute">
            How many patients to call at once (1–10)
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-ink mb-2">OPD Mode</legend>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="opd-mode"
                value="open_dr_in"
                checked={opdMode === "open_dr_in"}
                onChange={(e) => setOpdMode(e.target.value as "open_dr_in")}
                className="size-4 accent-ink"
              />
              <span className="text-sm text-ink">Open — Doctor In</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="opd-mode"
                value="open_dr_out"
                checked={opdMode === "open_dr_out"}
                onChange={(e) => setOpdMode(e.target.value as "open_dr_out")}
                className="size-4 accent-ink"
              />
              <span className="text-sm text-ink">Open — Doctor Out</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="opd-mode"
                value="closed"
                checked={opdMode === "closed"}
                onChange={(e) => setOpdMode(e.target.value as "closed")}
                className="size-4 accent-ink"
              />
              <span className="text-sm text-ink">Closed</span>
            </label>
          </div>
        </fieldset>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
            <X className="size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Save Settings
          </button>
          {success && (
            <span className="flex items-center gap-1 text-sm text-emerald-600">
              <Check className="size-3.5" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const { user, loading: sessionLoading, refresh: refreshSession } = useSession();
  const { selectedClinicId } = useClinic();
  const permissions = useMemo(
    () => mergePermissions(user?.role ?? "admin", user?.permissions),
    [user],
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-5 animate-spin text-mute" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-lg font-semibold text-ink sm:text-xl">Settings</h1>
        <p className="mt-0.5 text-xs text-body sm:text-sm">
          Manage your account and clinic configuration
        </p>
      </div>

      {/* Profile Section (all roles) */}
      {user && (
        <ProfileSection user={user} refreshSession={refreshSession} />
      )}

      {/* Users Section (admin only) */}
      {permissions.canManageUsers && selectedClinicId && (
        <UsersSection selectedClinicId={selectedClinicId} />
      )}

      {/* Devices Section (admin only) */}
      {permissions.canManageSettings && selectedClinicId && (
        <DevicesSection selectedClinicId={selectedClinicId} />
      )}

      {/* Queue Settings Section (admin only) */}
      {permissions.canManageSettings && selectedClinicId && (
        <QueueSettingsSection selectedClinicId={selectedClinicId} />
      )}

      {/* Access info for non-admin users */}
      {!permissions.canManageUsers && !permissions.canManageSettings && (
        <p className="text-center text-sm text-body">
          You have view-only access. Contact an admin for changes.
        </p>
      )}
    </div>
  );
}
