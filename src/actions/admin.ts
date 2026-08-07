"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { members, orders, orderItems, wines } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getCurrentMember } from "@/lib/session";
import { sendMail } from "@/lib/mail";
import { formatCHF } from "@/lib/price";

async function requireAdmin() {
  const me = await getCurrentMember();
  if (!me || me.role !== "admin") return null;
  return me;
}

/** Erzeugt ein gut lesbares Zufallspasswort (keine verwechselbaren Zeichen). */
function tempPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

export type CreateMemberResult =
  | { ok: true; email: string; password: string; emailed: boolean }
  | { ok: false; error: string };

/** Admin: nimmt ein neues Mitglied in den Rat auf. */
export async function createMember(input: {
  name: string;
  email: string;
  discountPct?: number;
  sendMailToMember?: boolean;
}): Promise<CreateMemberResult> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Nur für die Verwaltung." };

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name || !email) return { ok: false, error: "Name und E-Mail nötig." };
  if (!/.+@.+\..+/.test(email)) return { ok: false, error: "Ungültige E-Mail." };

  const exists = await db.select({ id: members.id }).from(members).where(eq(members.email, email));
  if (exists.length) return { ok: false, error: "Diese E-Mail ist bereits im Rat." };

  const discount =
    typeof input.discountPct === "number" && input.discountPct >= 0 && input.discountPct <= 90
      ? Math.round(input.discountPct)
      : 15;

  const password = tempPassword();
  const hash = await bcrypt.hash(password, 10);

  await db.insert(members).values({
    name,
    email,
    passwordHash: hash,
    role: "customer",
    council: true,
    discountPct: discount,
  });

  let emailed = false;
  if (input.sendMailToMember) {
    await sendMail({
      to: email,
      subject: "Aufnahme in den Geheimrat — DerRiesling",
      text:
        `${name},\n\n` +
        `Sie wurden in den Geheimrat von DerRiesling aufgenommen.\n\n` +
        `Zugang unter derriesling.ch/geheimrat\n` +
        `E-Mail:   ${email}\n` +
        `Passwort: ${password}\n\n` +
        `Bitte das Passwort nach der ersten Anmeldung ändern lassen wir noch ` +
        `folgen — bis dahin bewahren Sie es vertraulich auf.\n\n` +
        `Als Mitglied gilt automatisch der Ratspreis (−${discount}%) im Shop, ` +
        `und Sie sind zu jeder Sitzung eingeladen.\n\n— Der Rat`,
    });
    emailed = true;
  }

  return { ok: true, email, password, emailed };
}

export type MemberRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  council: boolean;
  discountPct: number;
};

export async function listMembers(): Promise<MemberRow[]> {
  const me = await requireAdmin();
  if (!me) return [];
  const rows = await db
    .select({
      id: members.id,
      name: members.name,
      email: members.email,
      role: members.role,
      council: members.council,
      discountPct: members.discountPct,
    })
    .from(members)
    .orderBy(desc(members.id));
  return rows;
}

export type OrderRow = {
  id: number;
  buyerName: string;
  buyerEmail: string;
  shipAddress: string;
  totalLabel: string;
  isMember: boolean;
  createdAt: string;
  items: { label: string; qty: number; lineLabel: string }[];
};

export async function listOrders(): Promise<OrderRow[]> {
  const me = await requireAdmin();
  if (!me) return [];

  const orderRows = await db
    .select()
    .from(orders)
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

  const byOrder = new Map<number, OrderRow["items"]>();
  for (const it of itemRows) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push({
      label: `${it.winzer} — ${it.name}`,
      qty: it.qty,
      lineLabel: `${it.qty} × ${formatCHF(it.unit)}`,
    });
    byOrder.set(it.orderId, arr);
  }

  return orderRows.map((o) => ({
    id: o.id,
    buyerName: o.buyerName,
    buyerEmail: o.buyerEmail,
    shipAddress: o.shipAddress,
    totalLabel: formatCHF(o.totalCents),
    isMember: o.memberId != null,
    createdAt: o.createdAt.toISOString().slice(0, 10),
    items: byOrder.get(o.id) ?? [],
  }));
}
