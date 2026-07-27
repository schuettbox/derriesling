import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { members, type Member } from "./schema";
import { eq } from "drizzle-orm";

const COOKIE = "rat_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-secret-bitte-in-produktion-ersetzen"
);

type SessionPayload = { sub: string; email: string };

export async function createSession(memberId: number, email: string) {
  const token = await new SignJWT({ email } satisfies Omit<SessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(memberId))
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Liefert das eingeloggte Mitglied oder null. */
export async function getCurrentMember(): Promise<Member | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const id = Number(payload.sub);
    if (!id) return null;
    const rows = await db.select().from(members).where(eq(members.id, id));
    return rows[0] ?? null;
  } catch {
    return null;
  }
}
