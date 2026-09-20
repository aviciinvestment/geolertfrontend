export const STAFF_ROLES = ['founder', 'superadmin', 'admin', 'authority'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserRole = 'user' | StaffRole;

const normalizeEmail = (email?: string | null): string =>
  (email || '').trim().toLowerCase();

export const FOUNDER_EMAIL = (import.meta.env.FOUNDER_EMAIL || '').trim().toLowerCase();

export const isFounderEmail = (email?: string | null): boolean =>
  Boolean(FOUNDER_EMAIL) && normalizeEmail(email) === FOUNDER_EMAIL;

export interface RoleUser {
  email?: string | null;
  role?: string;
  authorizationStatus?: string;
}

/**
 * The founder (matching email) is granted access to all four staff roles.
 * Everyone else accesses only their own individual role once approved.
 */
export const canAccessRole = (user: RoleUser | null | undefined, role: StaffRole): boolean => {
  if (!user) return false;
  if (user.authorizationStatus && user.authorizationStatus !== 'approved') return false;

  if (isFounderEmail(user.email)) return STAFF_ROLES.includes(role);

  return user.role === role;
};