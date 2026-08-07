"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { members, membershipCodes, attendance } from "@/lib/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getCurrentMember } from "@/lib/session";

/* ── Geheimrat-Code im Konto einlösen ───────────────────────────── */
export type RedeemResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function redeemMembershipCode(codeRaw: string): Promise<RedeemResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: "Bitte zuerst anmelden." };
  if (me.council) return { ok: true, message: "Dein Konto ist bereits im Geheimrat." };

  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Bitte einen Code eingeben." };

  const rows = await db
    .select()
    .from(membershipCodes)
    .where(eq(membershipCodes.code, code));
  const mc = rows[0];
  if (!mc) return { ok: false, error: "Dieser Code ist ungültig." };
  if (mc.redeemedByMemberId) {
    return { ok: false, error: "Dieser Code wurde bereits eingelöst." };
  }

  // Code als eingelöst markieren und Konto in den Rat heben
  await db
    .update(membershipCodes)
    .set({ redeemedByMemberId: me.id, redeemedAt: new Date() })
    .where(eq(membershipCodes.id, mc.id));

  await db
    .update(members)
    .set({ council: true })
    .where(eq(members.id, me.id));

  return {
    ok: true,
    message: "Willkommen im Geheimrat. Rabatt und direkte Teilnahme sind ab sofort aktiv.",
  };
}

/* ── Teilnahme an der nächsten Sitzung bestätigen (nur Rat) ──────── */
export type AttendResult =
  | { ok: true; status: "confirmed" | "declined" }
  | { ok: false; error: string };

export async function confirmAttendance(
  eventId: number,
  decision: "confirm" | "decline"
): Promise<AttendResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: "Bitte zuerst anmelden." };
  if (!me.council) {
    return { ok: false, error: "Nur für Geheimrat-Mitglieder." };
  }

  const status = decision === "confirm" ? "confirmed" : "declined";

  await db
    .insert(attendance)
    .values({ memberId: me.id, eventId, status, plusOnes: 1 })
    .onConflictDoUpdate({
      target: [attendance.memberId, attendance.eventId],
      set: { status },
    });

  return { ok: true, status };
}

/** Aktueller Teilnahmestatus des Mitglieds für ein Event. */
export async function getMyAttendance(
  eventId: number
): Promise<"confirmed" | "declined" | null> {
  const me = await getCurrentMember();
  if (!me) return null;
  const rows = await db
    .select({ status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.memberId, me.id), eq(attendance.eventId, eventId)));
  const s = rows[0]?.status;
  return s === "confirmed" || s === "declined" ? s : null;
}

/* ── Admin: Geheimrat-Codes erzeugen (für die Flaschen) ─────────── */
export type CreateCodesResult =
  | { ok: true; codes: string[] }
  | { ok: false; error: string };

function newCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let s = "";
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `RAT-${s.slice(0, 3)}-${s.slice(3, 6)}`;
}

export async function createMembershipCodes(input: {
  count: number;
  note?: string;
}): Promise<CreateCodesResult> {
  const me = await getCurrentMember();
  if (!me || me.role !== "admin") return { ok: false, error: "Nur für die Verwaltung." };

  const count = Math.max(1, Math.min(200, Math.floor(input.count || 0)));
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Bei (unwahrscheinlicher) Kollision einfach neu würfeln
    let code = newCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await db
        .select({ id: membershipCodes.id })
        .from(membershipCodes)
        .where(eq(membershipCodes.code, code));
      if (exists.length === 0) break;
      code = newCode();
    }
    await db
      .insert(membershipCodes)
      .values({ code, note: input.note?.trim() || null })
      .onConflictDoNothing();
    codes.push(code);
  }
  return { ok: true, codes };
}

export type CodeRow = {
  code: string;
  note: string | null;
  redeemed: boolean;
};

export async function listMembershipCodes(): Promise<CodeRow[]> {
  const me = await getCurrentMember();
  if (!me || me.role !== "admin") return [];
  const rows = await db
    .select({
      code: membershipCodes.code,
      note: membershipCodes.note,
      redeemedByMemberId: membershipCodes.redeemedByMemberId,
    })
    .from(membershipCodes)
    .orderBy(desc(membershipCodes.id))
    .limit(100);
  return rows.map((r) => ({
    code: r.code,
    note: r.note,
    redeemed: r.redeemedByMemberId != null,
  }));
}

/** Anzahl offener (nicht eingelöster) Codes – für die Admin-Übersicht. */
export async function countOpenCodes(): Promise<number> {
  const me = await getCurrentMember();
  if (!me || me.role !== "admin") return 0;
  const rows = await db
    .select({ id: membershipCodes.id })
    .from(membershipCodes)
    .where(isNull(membershipCodes.redeemedByMemberId));
  return rows.length;
}
