import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  producers,
  wines,
  events,
  invitations,
  members,
  membershipCodes,
} from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einmaliges Setup ohne SQL-Editor: legt die Tabellen an (idempotent) und
 * befüllt sie mit Startdaten, solange die Datenbank noch leer ist. Ist bereits
 * gesät, passiert nichts mehr — der Endpunkt ist danach wirkungslos.
 *
 * Aufruf einmal im Browser:  https://<deine-domain>/api/setup
 */

const DDL: string[] = [
  `DO $$ BEGIN CREATE TYPE "event_status"  AS ENUM('upcoming','closed');          EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `DO $$ BEGIN CREATE TYPE "invite_status" AS ENUM('open','accepted','declined'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `CREATE TABLE IF NOT EXISTS "producers" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "region" text NOT NULL,
    "order_email" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "wines" (
    "id" serial PRIMARY KEY NOT NULL,
    "producer_id" integer NOT NULL REFERENCES "producers"("id"),
    "winzer" text NOT NULL,
    "name" text NOT NULL,
    "herkunft" text NOT NULL,
    "price_cents" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "events" (
    "id" serial PRIMARY KEY NOT NULL,
    "numeral" text NOT NULL,
    "title" text NOT NULL,
    "location" text NOT NULL,
    "address" text,
    "speech" text,
    "wine_note" text,
    "starts_at" timestamp,
    "admission_note" text,
    "capacity" integer DEFAULT 40 NOT NULL,
    "status" "event_status" DEFAULT 'upcoming' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "invitations" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" text NOT NULL UNIQUE,
    "event_id" integer NOT NULL REFERENCES "events"("id"),
    "guest_name" text,
    "plus_ones" integer DEFAULT 1 NOT NULL,
    "status" "invite_status" DEFAULT 'open' NOT NULL,
    "responded_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "members" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "name" text NOT NULL,
    "role" text DEFAULT 'customer' NOT NULL,
    "council" boolean DEFAULT false NOT NULL,
    "discount_pct" integer DEFAULT 15 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  // Migration für bereits bestehende Datenbanken
  `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "council" boolean DEFAULT false NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS "orders" (
    "id" serial PRIMARY KEY NOT NULL,
    "member_id" integer REFERENCES "members"("id"),
    "buyer_name" text NOT NULL,
    "buyer_email" text NOT NULL,
    "ship_address" text NOT NULL,
    "total_cents" integer NOT NULL,
    "status" text DEFAULT 'received' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "order_items" (
    "id" serial PRIMARY KEY NOT NULL,
    "order_id" integer NOT NULL REFERENCES "orders"("id"),
    "wine_id" integer NOT NULL REFERENCES "wines"("id"),
    "producer_id" integer NOT NULL REFERENCES "producers"("id"),
    "quantity" integer NOT NULL,
    "unit_price_cents" integer NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "membership_codes" (
    "id" serial PRIMARY KEY NOT NULL,
    "code" text NOT NULL UNIQUE,
    "note" text,
    "redeemed_by_member_id" integer REFERENCES "members"("id"),
    "redeemed_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "attendance" (
    "id" serial PRIMARY KEY NOT NULL,
    "member_id" integer NOT NULL REFERENCES "members"("id"),
    "event_id" integer NOT NULL REFERENCES "events"("id"),
    "status" text DEFAULT 'confirmed' NOT NULL,
    "plus_ones" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "attendance_member_event" UNIQUE ("member_id","event_id")
  );`,
];

// Vorab berechneter bcrypt-Hash für das Demo-Passwort "riesling"
const ADMIN_HASH =
  "$2a$10$g1geTmIQRE.oDK2wRMUCGunZ2tAQWMlSzz/ucOHy41lOdn1tCSmP2";

async function runSetup() {
  // 1) Schema anlegen (idempotent)
  for (const stmt of DDL) {
    await db.execute(sql.raw(stmt));
  }

  // 2) Unabhängig sicherstellen (auch bei bereits vorhandener DB aus
  //    einem früheren Setup): Admin ist Ratsmitglied, Demo-Codes existieren.
  await db.update(members).set({ council: true }).where(eq(members.role, "admin"));

  const codeRows = await db
    .select({ id: membershipCodes.id })
    .from(membershipCodes)
    .limit(1);
  if (codeRows.length === 0) {
    await db
      .insert(membershipCodes)
      .values([
        { code: "RAT-AAA-111", note: "Demo — Rats-Flasche" },
        { code: "RAT-BBB-222", note: "Demo — Rats-Flasche" },
      ])
      .onConflictDoNothing();
  }

  // 3) Vollständig säen nur, wenn noch keine Konten existieren
  const existing = await db.select({ id: members.id }).from(members).limit(1);
  if (existing.length > 0) {
    return {
      seeded: false,
      message: "Datenbank bereits eingerichtet (Rechte und Codes aktualisiert).",
      geheimratscodes: ["RAT-AAA-111", "RAT-BBB-222"],
    };
  }

  // Produzenten
  const producerRows = await db
    .insert(producers)
    .values([
      { name: "Weingut Steinkauz", region: "Mosel, DE", orderEmail: "bestellung@steinkauz.example" },
      { name: "Domaine Bergrain", region: "Alsace, FR", orderEmail: "commande@bergrain.example" },
      { name: "Weingut Rheinwarte", region: "Baden, DE", orderEmail: "bestellung@rheinwarte.example" },
      { name: "Hangwerk", region: "Bündner Herrschaft, CH", orderEmail: "bestellung@hangwerk.example" },
      { name: "Weingut Falkenhorst", region: "Rheingau, DE", orderEmail: "bestellung@falkenhorst.example" },
      { name: "Hofgut Donaustein", region: "Wachau, AT", orderEmail: "bestellung@donaustein.example" },
      { name: "Weingut Sonnenspiel", region: "Pfalz, DE", orderEmail: "bestellung@sonnenspiel.example" },
    ])
    .returning();
  const byName = Object.fromEntries(producerRows.map((p) => [p.name, p.id]));

  // Weine
  await db.insert(wines).values([
    { producerId: byName["Weingut Steinkauz"], winzer: "Weingut Steinkauz", name: "«Schiefer I» Riesling trocken 2023", herkunft: "Mosel, DE", priceCents: 3400 },
    { producerId: byName["Domaine Bergrain"], winzer: "Domaine Bergrain", name: "Riesling Grand Cru «Coteau» 2022", herkunft: "Alsace, FR", priceCents: 4200 },
    { producerId: byName["Weingut Rheinwarte"], winzer: "Weingut Rheinwarte", name: "Riesling «Kalkstein» 2023", herkunft: "Baden, DE", priceCents: 2900 },
    { producerId: byName["Hangwerk"], winzer: "Hangwerk", name: "Riesling 2022", herkunft: "Bündner Herrschaft, CH", priceCents: 4600 },
    { producerId: byName["Weingut Falkenhorst"], winzer: "Weingut Falkenhorst", name: "Riesling Kabinett «Alte Reben» 2021", herkunft: "Rheingau, DE", priceCents: 3800 },
    { producerId: byName["Hofgut Donaustein"], winzer: "Hofgut Donaustein", name: "Riesling Smaragd 2022", herkunft: "Wachau, AT", priceCents: 5200 },
    { producerId: byName["Weingut Sonnenspiel"], winzer: "Weingut Sonnenspiel", name: "Riesling GG «Kreide» 2021", herkunft: "Pfalz, DE", priceCents: 5800 },
    { producerId: byName["Weingut Steinkauz"], winzer: "Weingut Steinkauz", name: "Riesling Auslese 2019 · 37.5 cl", herkunft: "Mosel, DE", priceCents: 4400 },
  ]);

  // Sitzungen — VII zuerst
  const [naechste] = await db
    .insert(events)
    .values({
      numeral: "VII",
      title: "«Ein Flughafen, drei Länder»",
      location: "EuroAirport, Frachtterminal Süd",
      address: "EuroAirport Basel–Mulhouse–Freiburg\nFrachtterminal Süd, Tor 4",
      speech: "Zur Fracht, die nachts durch drei Länder geht",
      wineNote: "Acht Rieslinge aus dem Dreiländereck — Baden, Elsass, Schweiz",
      admissionNote: "Einlass bis 19:20, danach ist das Tor zu.",
      startsAt: new Date("2026-09-24T19:00:00+02:00"),
      status: "upcoming",
    })
    .returning();

  await db.insert(events).values([
    { numeral: "VI", title: "«Wie eine Stadt ihre Zeit rechnet»", location: "Münster Basel, Krypta", wineNote: "Mosel, Steillage", status: "closed" },
    { numeral: "V", title: "«Was Strom kostet, wenn niemand zusieht»", location: "Kraftwerk Birsfelden, Turbinenhalle", wineNote: "Wachau", status: "closed" },
    { numeral: "IV", title: "«Verdichtung»", location: "Turmhaus, 24. Stock", wineNote: "Rheingau, trocken", status: "closed" },
    { numeral: "III", title: "«Präzision als Kulturgut»", location: "Manufaktur im Jura", wineNote: "Alsace, Grand Cru", status: "closed" },
    { numeral: "II", title: "«Wem gehört ein Bild»", location: "Kunstdepot, Halle 3", wineNote: "Nahe", status: "closed" },
    { numeral: "I", title: "«Was der Rhein transportiert»", location: "Rheinhafen Kleinhüningen", wineNote: "Baden, Kalkstein", status: "closed" },
  ]);

  // Einladungscodes
  await db.insert(invitations).values([
    { code: "RSL-VII-4820", eventId: naechste.id, plusOnes: 1, status: "open" },
    { code: "RSL-VII-1174", eventId: naechste.id, plusOnes: 1, status: "open" },
  ]);

  // Admin-/Demo-Login (Admin ist zugleich Ratsmitglied)
  await db
    .insert(members)
    .values({
      email: "post@derriesling.ch",
      passwordHash: ADMIN_HASH,
      name: "Der Rat",
      role: "admin",
      council: true,
      discountPct: 15,
    })
    .onConflictDoNothing();

  return {
    seeded: true,
    message: "Datenbank eingerichtet und befüllt.",
    login: "post@derriesling.ch / riesling",
    einladungscodes: ["RSL-VII-4820", "RSL-VII-1174"],
    geheimratscodes: ["RAT-AAA-111", "RAT-BBB-222"],
  };
}

/** Sichere Diagnose der DATABASE_URL – ohne Passwort preiszugeben. */
function diagnose() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return {
      hasDatabaseUrl: false,
      hint: "DATABASE_URL ist in Vercel nicht gesetzt.",
    };
  }
  const startsWithPostgres = /^postgres(ql)?:\/\//i.test(url);
  const looksLikeNeon = /neon\.tech/i.test(url);
  return {
    hasDatabaseUrl: true,
    startsWithPostgres,
    looksLikeNeon,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hint:
      !startsWithPostgres || !looksLikeNeon
        ? "DATABASE_URL sieht nicht wie ein Neon-Connection-String aus (sollte mit postgresql:// beginnen und neon.tech enthalten). Vermutlich steht dort der falsche Wert."
        : "DATABASE_URL sieht plausibel aus.",
  };
}

export async function GET() {
  try {
    const result = await runSetup();
    return NextResponse.json({ ok: true, diag: diagnose(), ...result });
  } catch (err) {
    console.error("[setup] Fehler", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        diag: diagnose(),
      },
      { status: 200 }
    );
  }
}
