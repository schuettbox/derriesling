/**
 * Befüllt eine leere Datenbank mit Startdaten:
 *  – Produzenten & Weine (aus dem Gestaltungsentwurf)
 *  – Sitzung VII (EuroAirport) + vergangene Sitzungen
 *  – Zwei Beispiel-Einladungscodes
 *  – Ein Admin-/Mitgliedskonto
 *
 * Aufruf:  npm run db:seed
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import * as schema from "../lib/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log("Seed startet …");

  // ── Produzenten ────────────────────────────────────────────────
  const producerRows = await db
    .insert(schema.producers)
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

  // ── Weine ──────────────────────────────────────────────────────
  await db.insert(schema.wines).values([
    { producerId: byName["Weingut Steinkauz"], winzer: "Weingut Steinkauz", name: "«Schiefer I» Riesling trocken 2023", herkunft: "Mosel, DE", priceCents: 3400 },
    { producerId: byName["Domaine Bergrain"], winzer: "Domaine Bergrain", name: "Riesling Grand Cru «Coteau» 2022", herkunft: "Alsace, FR", priceCents: 4200 },
    { producerId: byName["Weingut Rheinwarte"], winzer: "Weingut Rheinwarte", name: "Riesling «Kalkstein» 2023", herkunft: "Baden, DE", priceCents: 2900 },
    { producerId: byName["Hangwerk"], winzer: "Hangwerk", name: "Riesling 2022", herkunft: "Bündner Herrschaft, CH", priceCents: 4600 },
    { producerId: byName["Weingut Falkenhorst"], winzer: "Weingut Falkenhorst", name: "Riesling Kabinett «Alte Reben» 2021", herkunft: "Rheingau, DE", priceCents: 3800 },
    { producerId: byName["Hofgut Donaustein"], winzer: "Hofgut Donaustein", name: "Riesling Smaragd 2022", herkunft: "Wachau, AT", priceCents: 5200 },
    { producerId: byName["Weingut Sonnenspiel"], winzer: "Weingut Sonnenspiel", name: "Riesling GG «Kreide» 2021", herkunft: "Pfalz, DE", priceCents: 5800 },
    { producerId: byName["Weingut Steinkauz"], winzer: "Weingut Steinkauz", name: "Riesling Auslese 2019 · 37.5 cl", herkunft: "Mosel, DE", priceCents: 4400 },
  ]);

  // ── Sitzungen ──────────────────────────────────────────────────
  const [naechste] = await db
    .insert(schema.events)
    .values({
      numeral: "VII",
      title: "«Ein Flughafen, drei Länder»",
      location: "EuroAirport, Frachtterminal Süd",
      address: "EuroAirport Basel–Mulhouse–Freiburg\nFrachtterminal Süd, Tor 4",
      speech: "Zur Fracht, die nachts durch drei Länder geht",
      wineNote: "Acht Rieslinge aus dem Dreiländereck — Baden, Elsass, Schweiz",
      admissionNote: "Einlass bis 19:20, danach ist das Tor zu.",
      startsAt: new Date("2026-09-24T19:00:00+02:00"),
      capacity: 40,
      status: "upcoming",
    })
    .returning();

  await db.insert(schema.events).values([
    { numeral: "VI", title: "«Wie eine Stadt ihre Zeit rechnet»", location: "Münster Basel, Krypta", wineNote: "Mosel, Steillage", status: "closed" },
    { numeral: "V", title: "«Was Strom kostet, wenn niemand zusieht»", location: "Kraftwerk Birsfelden, Turbinenhalle", wineNote: "Wachau", status: "closed" },
    { numeral: "IV", title: "«Verdichtung»", location: "Turmhaus, 24. Stock", wineNote: "Rheingau, trocken", status: "closed" },
    { numeral: "III", title: "«Präzision als Kulturgut»", location: "Manufaktur im Jura", wineNote: "Alsace, Grand Cru", status: "closed" },
    { numeral: "II", title: "«Wem gehört ein Bild»", location: "Kunstdepot, Halle 3", wineNote: "Nahe", status: "closed" },
    { numeral: "I", title: "«Was der Rhein transportiert»", location: "Rheinhafen Kleinhüningen", wineNote: "Baden, Kalkstein", status: "closed" },
  ]);

  // ── Einladungscodes ────────────────────────────────────────────
  await db.insert(schema.invitations).values([
    { code: "RSL-VII-4820", eventId: naechste.id, guestName: null, plusOnes: 1, status: "open" },
    { code: "RSL-VII-1174", eventId: naechste.id, guestName: null, plusOnes: 1, status: "open" },
  ]);

  // ── Beispielkonto (Admin, zugleich Ratsmitglied) ───────────────
  const pw = await bcrypt.hash("riesling", 10);
  await db.insert(schema.members).values({
    email: "post@derriesling.ch",
    passwordHash: pw,
    name: "Der Rat",
    role: "admin",
    council: true,
    discountPct: 15,
  });

  // ── Beispiel-Geheimrat-Codes (wie auf den Flaschen) ────────────
  await db.insert(schema.membershipCodes).values([
    { code: "RAT-AAA-111", note: "Demo — Rats-Flasche" },
    { code: "RAT-BBB-222", note: "Demo — Rats-Flasche" },
  ]);

  console.log("Seed fertig.");
  console.log("Login-Demo:       post@derriesling.ch / riesling");
  console.log("Einladungscodes:  RSL-VII-4820 · RSL-VII-1174");
  console.log("Geheimrat-Codes:  RAT-AAA-111 · RAT-BBB-222");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
