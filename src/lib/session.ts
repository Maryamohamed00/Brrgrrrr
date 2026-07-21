import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pos_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me"
);

export type Role = "ADMIN" | "CASHIER" | "VIEWER";

export type SessionPayload = {
  cashierId: string;
  name: string;
  role: Role;
  shiftId?: string; // only cashiers clock shifts; admins/viewers won't have one
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function clearSession() {
  cookies().delete(COOKIE_NAME);
}

/** Full read/write access: admin only. */
export async function getAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

/** Dashboard read access: admin or viewer. Use this for GET routes that
 * populate charts/tables; keep using getAdminSession for anything that
 * mutates data. */
export async function getDashboardSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "VIEWER")) return null;
  return session;
}

/** Cashier-only: for POS register routes. */
export async function getCashierSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  return session;
}
