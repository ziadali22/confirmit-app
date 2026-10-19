import { cookies } from "next/headers";

const COOKIE = "cf_auth";
const isProd = process.env.NODE_ENV === "production";

// Dev fallbacks only — in production both must be set in the environment.
const PASSWORD = process.env.DASHBOARD_PASSWORD || (isProd ? "" : "confirmit123");
const SECRET = process.env.SESSION_SECRET || (isProd ? "" : "dev-secret");

/** The cookie value set when logged in: the server secret itself (random, ~64
 *  hex). Not derivable from the password length, so it can't be forged. */
export function sessionValue(): string {
  return SECRET;
}

export function configured(): boolean {
  return Boolean(PASSWORD && SECRET);
}

export async function isLoggedIn(): Promise<boolean> {
  if (!configured()) return false;
  const jar = await cookies();
  return jar.get(COOKIE)?.value === SECRET;
}

export async function login(password: string): Promise<boolean> {
  if (!configured()) return false; // refuse login if misconfigured in prod
  if (password !== PASSWORD) return false;
  const jar = await cookies();
  jar.set(COOKIE, SECRET, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12, secure: isProd });
  return true;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
