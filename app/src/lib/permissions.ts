export type UserRole = "admin" | "doctor" | "receptionist";

export const PERMISSIONS = {
  /** Can manage users, settings, and devices */
  admin: {
    canManageUsers: true,
    canManageSettings: true,
    canCallPatient: true,
    canCompletePatient: true,
    canSkipPatient: true,
    canToggleOpd: true,
    canViewHistory: true,
  },
  /** Can call patients and mark complete, but cannot skip */
  doctor: {
    canManageUsers: false,
    canManageSettings: false,
    canCallPatient: true,
    canCompletePatient: true,
    canSkipPatient: false,
    canToggleOpd: false,
    canViewHistory: true,
  },
  /** Can only skip patients, cannot call or complete */
  receptionist: {
    canManageUsers: false,
    canManageSettings: false,
    canCallPatient: false,
    canCompletePatient: false,
    canSkipPatient: true,
    canToggleOpd: false,
    canViewHistory: false,
  },
} as const;

export type PermissionSet = (typeof PERMISSIONS)[UserRole];

/** Profile-level permission columns (snake_case as stored in DB). */
export interface ProfilePermissions {
  can_call: boolean | null;
  can_complete: boolean | null;
  can_skip: boolean | null;
  can_toggle_opd: boolean | null;
  can_manage_users: boolean | null;
  can_manage_settings: boolean | null;
  can_view_history: boolean | null;
}

/**
 * Maps DB snake_case permission columns to PermissionSet camelCase keys.
 * Used by mergePermissions to overlay individual overrides on role defaults.
 */
export const PERMISSION_KEY_MAP: Record<keyof ProfilePermissions, keyof PermissionSet> = {
  can_call: "canCallPatient",
  can_complete: "canCompletePatient",
  can_skip: "canSkipPatient",
  can_toggle_opd: "canToggleOpd",
  can_manage_users: "canManageUsers",
  can_manage_settings: "canManageSettings",
  can_view_history: "canViewHistory",
};

/** Reverse mapping from PermissionSet keys to profile columns. */
export const PERMISSION_TO_PROFILE_MAP: Record<keyof PermissionSet, keyof ProfilePermissions> = {
  canCallPatient: "can_call",
  canCompletePatient: "can_complete",
  canSkipPatient: "can_skip",
  canToggleOpd: "can_toggle_opd",
  canManageUsers: "can_manage_users",
  canManageSettings: "can_manage_settings",
  canViewHistory: "can_view_history",
};

export function getPermissions(role: UserRole | null | undefined): PermissionSet {
  if (!role) return PERMISSIONS.admin; // Default to admin for E2E/unauthenticated
  return PERMISSIONS[role] ?? PERMISSIONS.receptionist;
}

export function can(role: UserRole | null | undefined, permission: keyof PermissionSet): boolean {
  if (!role) return true; // E2E bypass — grant all permissions
  const perms = getPermissions(role);
  return perms[permission] ?? false;
}

/**
 * Merges role-based default permissions with individual profile overrides.
 * Override keys are the snake_case DB column names (e.g. "can_call").
 * Null/undefined overrides are ignored, falling back to role defaults.
 */
export function mergePermissions(
  role: UserRole,
  overrides?: Record<string, boolean | null> | null,
): PermissionSet {
  const base = PERMISSIONS[role] ?? PERMISSIONS.receptionist;
  if (!overrides) return base;

  const result = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null) {
      const permissionKey = PERMISSION_KEY_MAP[key as keyof ProfilePermissions];
      if (permissionKey) {
        (result as Record<string, boolean>)[permissionKey] = value;
      }
    }
  }
  return result;
}
