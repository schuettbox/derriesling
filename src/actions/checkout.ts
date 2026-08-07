"use server";

import { db } from "@/lib/db";
import { wines, orders, orderItems, producers } from "@/lib/schema";
import { inArray, eq } from "drizzle-orm";
import { getCurrentMember } from "@/lib/session";
import { memberPriceCents, formatCHF } from "@/lib/price";
import { sendMail } from "@/lib/mail";

export type CheckoutInput = {
  lines: { wineId: number; qty: number }[];
  name: string;
  email: string;
  address: string;
};

export type CheckoutResult =
  | { ok: true; orderId: number; producerCount: number; totalCents: number }
  | { ok: false; error: string };

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const name = input.name?.trim();
  const email = input.email?.trim();
  const address = input.address?.trim();

  if (!name || !email || !address) {
    return { ok: false, error: "Bitte Name, E-Mail und Lieferadresse angeben." };
  }
  if (!/.+@.+\..+/.test(email)) {
    return { ok: false, error: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const cleanLines = (input.lines ?? []).filter(
    (l) => Number.isInteger(l.wineId) && l.qty > 0
  );
  if (cleanLines.length === 0) {
    return { ok: false, error: "Der Korb ist leer." };
  }

  // Preise & Produzenten immer serverseitig bestimmen
  const ids = cleanLines.map((l) => l.wineId);
  const rows = await db
    .select({
      id: wines.id,
      producerId: wines.producerId,
      winzer: wines.winzer,
      name: wines.name,
      priceCents: wines.priceCents,
      active: wines.active,
      producerName: producers.name,
      producerEmail: producers.orderEmail,
    })
    .from(wines)
    .innerJoin(producers, eq(wines.producerId, producers.id))
    .where(inArray(wines.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  const member = await getCurrentMember();
  // Rabatt nur für Geheimrat-Mitglieder
  const isCouncil = !!member?.council;
  const discount = isCouncil ? member!.discountPct : 0;

  // Positionen berechnen
  const items = cleanLines.map((l) => {
    const w = byId.get(l.wineId);
    if (!w || !w.active) return null;
    const unit = isCouncil ? memberPriceCents(w.priceCents, discount) : w.priceCents;
    return {
      wineId: w.id,
      producerId: w.producerId,
      producerName: w.producerName,
      producerEmail: w.producerEmail,
      winzer: w.winzer,
      wineName: w.name,
      quantity: l.qty,
      unitPriceCents: unit,
    };
  });

  if (items.some((i) => i === null)) {
    return { ok: false, error: "Ein Wein ist nicht mehr verfügbar. Bitte Korb prüfen." };
  }
  const valid = items as NonNullable<(typeof items)[number]>[];
  const totalCents = valid.reduce(
    (s, i) => s + i.unitPriceCents * i.quantity,
    0
  );

  // Bestellung speichern
  const [order] = await db
    .insert(orders)
    .values({
      memberId: member?.id ?? null,
      buyerName: name,
      buyerEmail: email,
      shipAddress: address,
      totalCents,
      status: "received",
    })
    .returning();

  await db.insert(orderItems).values(
    valid.map((i) => ({
      orderId: order.id,
      wineId: i.wineId,
      producerId: i.producerId,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    }))
  );

  // Pro Produzent eine Bestellmail (DerRiesling ist nur Vermittler)
  const groups = new Map<number, typeof valid>();
  for (const i of valid) {
    const arr = groups.get(i.producerId) ?? [];
    arr.push(i);
    groups.set(i.producerId, arr);
  }

  await Promise.all(
    [...groups.values()].map(async (grp) => {
      const p = grp[0];
      const lines = grp
        .map(
          (i) =>
            `  ${i.quantity} × ${i.winzer} — ${i.wineName}  (${formatCHF(
              i.unitPriceCents
            )}/Fl.)`
        )
        .join("\n");
      const sum = grp.reduce(
        (s, i) => s + i.unitPriceCents * i.quantity,
        0
      );
      await sendMail({
        to: p.producerEmail,
        subject: `DerRiesling — Bestellung #${order.id}`,
        text:
          `Neue Bestellung über die Plattform DerRiesling.\n\n` +
          `Bestellnummer: ${order.id}\n\n` +
          `Bitte direkt an folgende Adresse versenden:\n` +
          `${name}\n${address}\nE-Mail: ${email}\n\n` +
          `Positionen (Ihr Weingut):\n${lines}\n\n` +
          `Zwischensumme: ${formatCHF(sum)}\n\n` +
          `Der Versand erfolgt durch Ihr Weingut. DerRiesling ist Vermittler.`,
      });
    })
  );

  // Bestätigung an Kundschaft
  await sendMail({
    to: email,
    subject: `DerRiesling — Bestellbestätigung #${order.id}`,
    text:
      `Vielen Dank, ${name}.\n\n` +
      `Ihre Bestellung #${order.id} ist eingegangen und wurde an die ` +
      `jeweiligen Weingüter weitergeleitet. Der Versand erfolgt getrennt ` +
      `durch jedes Weingut.\n\nSumme: ${formatCHF(totalCents)}\n\n— DerRiesling`,
  });

  return {
    ok: true,
    orderId: order.id,
    producerCount: groups.size,
    totalCents,
  };
}
