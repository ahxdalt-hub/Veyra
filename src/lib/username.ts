/**
 * Username rules — shared by the signup form (live validation) and the
 * server actions. Mirrors the database constraint
 * `profiles_username_format` in 0005_usernames.sql; if you change one,
 * change both.
 */
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}
