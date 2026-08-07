"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  members,
  membershipCodes,
  attendance,
  orders,
  orderItems,
  wines,
} from "@/lib/schema";
import { eq, and, desc, isNull, ne } from "drizzle-orm";
import { getCurrentMember } from "@/lib/session";
import { TICKET_CENTS, formatCHF } from "@/lib/price";

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

/* ── Teilnahme an der nächsten Sitzung bestätigen (nur Rat) ────────
   Eine Teilnahme ist mit der Mitgliedschaft inbegriffen (einmalig).
   Danach kostet der Zutritt CHF 95 pro Person. Eine Begleitung kann
   für CHF 95 dazugebucht werden.                                     */
export type AttendResult =
  | { ok: true; status: "confirmed" | "declined"; amountCents: number }
  | { ok: false; error: string };

/** Hat das Mitglied seine inbegriffene Teilnahme schon bei einem anderen Event genutzt? */
async function includedUsedElsewhere(
  memberId: number,
  exceptEventId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(
      and(
        eq(attendance.memberId, memberId),
        eq(attendance.included, true),
        eq(attendance.status, "confirmed"),
        ne(attendance.eventId, exceptEventId)
      )
    );
  return rows.length > 0;
}

export async function confirmAttendance(
  eventId: number,
  decision: "confirm" | "decline",
  companion: boolean = false
): Promise<AttendResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: "Bitte zuerst anmelden." };
  if (!me.council) {
    return { ok: false, error: "Nur für Geheimrat-Mitglieder." };
  }

  if (decision === "decline") {
    await db
      .insert(attendance)
      .values({ memberId: me.id, eventId, status: "declined", included: false, companion: false, amountCents: 0 })
      .onConflictDoUpdate({
        target: [attendance.memberId, attendance.eventId],
        set: { status: "declined", included: false, companion: false, amountCents: 0 },
      });
    return { ok: true, status: "declined", amountCents: 0 };
  }

  const usedElsewhere = await includedUsedElsewhere(me.id, eventId);
  const included = !usedElsewhere; // erste Teilnahme inbegriffen
  const ownCost = included ? 0 : TICKET_CENTS;
  const companionCost = companion ? TICKET_CENTS : 0;
  const amountCents = ownCost + companionCost;

  await db
    .insert(attendance)
    .values({ memberId: me.id, eventId, status: "confirmed", included, companion, amountCents })
    .onConflictDoUpdate({
      target: [attendance.memberId, attendance.eventId],
      set: { status: "confirmed", included, companion, amountCents },
    });

  return { ok: true, status: "confirmed", amountCents };
}

export type MyAttendance = {
  status: "confirmed" | "declined";
  included: boolean;
  companion: boolean;
  amountCents: number;
} | null;

/** Aktueller Teilnahmestatus des Mitglieds für ein Event. */
export async function getMyAttendance(eventId: number): Promise<MyAttendance> {
  const me = await getCurrentMember();
  if (!me) return null;
  const rows = await db
    .select({
      status: attendance.status,
      included: attendance.included,
      companion: attendance.companion,
      amountCents: attendance.amountCents,
    })
    .from(attendance)
    .where(and(eq(attendance.memberId, me.id), eq(attendance.eventId, eventId)));
  const r = rows[0];
  if (!r) return null;
  if (r.status !== "confirmed" && r.status !== "declined") return null;
  return {
    status: r.status,
    included: r.included,
    companion: r.companion,
    amountCents: r.amountCents,
  };
}

/** Gilt die inbegriffene Teilnahme (noch) für dieses Event? (für die Anzeige) */
export async function includedAppliesTo(eventId: number): Promise<boolean> {
  const me = await getCurrentMember();
  if (!me?.council) return false;
  return !(await includedUsedElsewhere(me.id, eventId));
}

/* ── Eigene Bestellübersicht (im Konto) ─────────────────────────── */
export type MyOrderRow = {
  id: number;
  createdAt: string;
  totalLabel: string;
  items: { label: string; lineLabel: string }[];
};

export async function listMyOrders(): Promise<MyOrderRow[]> {
  const me = await getCurrentMember();
  if (!me) return [];

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.memberId, me.id))
    .orderBy(desc(orders.id))
    .limit(50);
  if (orderRows.length === 0) return [];

  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      qty: orderItems.quantity,
      unit: orderItems.unitPriceCents,
      winzer: wines.winzer,
      name: wines.name,
    })
    .from(orderItems)
    .innerJoin(wines, eq(orderItems.wineId, wines.id));

  const byOrder = new Map<number, MyOrderRow["items"]>();
  for (const it of itemRows) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push({
      label: `${it.winzer} — ${it.name}`,
      lineLabel: `${it.qty} × ${formatCHF(it.unit)}`,
    });
    byOrder.set(it.orderId, arr);
  }

  return orderRows.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString().slice(0, 10),
    totalLabel: formatCHF(o.totalCents),
    items: byOrder.get(o.id) ?? [],
  }));
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
