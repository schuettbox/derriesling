import { db } from "./db";
import { wines, events } from "./schema";
import { eq, desc } from "drizzle-orm";
import { memberPriceCents } from "./price";
import type { CatalogItem } from "@/components/catalog";

/** Weinkatalog inkl. berechnetem Zahlpreis (Ratspreis bei Mitgliedern). */
export async function getCatalog(discountPct: number | null): Promise<CatalogItem[]> {
  const rows = await db
    .select()
    .from(wines)
    .where(eq(wines.active, true))
    .orderBy(desc(wines.special), wines.id);

  return rows.map((w) => ({
    id: w.id,
    winzer: w.winzer,
    name: w.name,
    herkunft: w.herkunft,
    listCents: w.priceCents,
    // Sonderflasche «DerRiesling» ohne Rabatt
    payCents:
      !w.special && discountPct && discountPct > 0
        ? memberPriceCents(w.priceCents, discountPct)
        : w.priceCents,
    special: w.special,
  }));
}

export async function getUpcomingEvent() {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.status, "upcoming"))
    .orderBy(desc(events.startsAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAllEvents() {
  return db.select().from(events).orderBy(desc(events.id));
}
