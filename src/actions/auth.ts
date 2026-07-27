"use server";

import { db } from "@/lib/db";
import { members } from "@/lib/schema";
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
