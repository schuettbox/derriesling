"use server";

import { db } from "@/lib/db";
import { members, membershipCodes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "@/lib/session";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort angeben." };
  }

  const rows = await db.select().from(members).where(eq(members.email, email));
  const member = rows[0];
  if (!member || !(await bcrypt.compare(password, member.passwordHash))) {
    return { error: "E-Mail oder Passwort stimmt nicht." };
  }

  await createSession(member.id, member.email);
  redirect("/geheimrat");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export type RegisterState = { error?: string };

/**
 * Registrierung für den Geheimrat. Erfordert einen gültigen, noch nicht
 * eingelösten Code (von einer DerRiesling-Flasche). Der Code wird dabei
 * einmalig verbraucht und das Konto sofort zum Ratsmitglied.
 */
export async function register(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!name || !email || !password || !code) {
    return { error: "Bitte Name, E-Mail, Passwort und Code angeben." };
  }
  if (!/.+@.+\..+/.test(email)) {
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }
  if (password.length < 6) {
    return { error: "Das Passwort muss mindestens 6 Zeichen haben." };
  }

  // Code prüfen (muss existieren und noch frei sein)
  const codeRows = await db
    .select()
    .from(membershipCodes)
    .where(eq(membershipCodes.code, code));
  const mc = codeRows[0];
  if (!mc) {
    return { error: "Dieser Code ist ungültig. Er steht auf Ihrer DerRiesling-Flasche." };
  }
  if (mc.redeemedByMemberId) {
    return { error: "Dieser Code wurde bereits verwendet." };
  }

  const existing = await db
    .select({ id: members.id })
    .from(members)
    .where(eq(members.email, email));
  if (existing.length) {
    return { error: "Für diese E-Mail besteht bereits ein Konto." };
  }

  const hash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(members)
    .values({
      name,
      email,
      passwordHash: hash,
      role: "customer",
      council: true,
      discountPct: 15,
    })
    .returning();

  // Code einmalig verbrauchen
  await db
    .update(membershipCodes)
    .set({ redeemedByMemberId: created.id, redeemedAt: new Date() })
    .where(eq(membershipCodes.id, mc.id));

  await createSession(created.id, created.email);
  redirect("/geheimrat");
}
