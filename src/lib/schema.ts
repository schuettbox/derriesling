import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

/* ── Konten (Kunden & Geheimrat) ─────────────────────────────────
   Jede Person registriert sich zunächst als Kunde. Wird ein gültiger
   Geheimrat-Code im Konto eingelöst, wird `council` = true — dann gilt
   der Rabatt und die direkte Teilnahmebestätigung.                  */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  // Rolle: 'customer' = normales Konto, 'admin' = Verwaltung
  role: text("role").notNull().default("customer"),
  // Geheimratsstatus (durch Code-Einlösung freigeschaltet)
  council: boolean("council").notNull().default(false),
  // Rabatt in Prozent auf den Katalogpreis (nur wirksam bei council=true)
  discountPct: integer("discount_pct").notNull().default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Produzenten (Weingüter) ────────────────────────────────────── */
export const producers = pgTable("producers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  // Bestell-Mails gehen an diese Adresse
  orderEmail: text("order_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Weine ──────────────────────────────────────────────────────── */
export const wines = pgTable("wines", {
  id: serial("id").primaryKey(),
  producerId: integer("producer_id")
    .notNull()
    .references(() => producers.id),
  winzer: text("winzer").notNull(),
  name: text("name").notNull(),
  herkunft: text("herkunft").notNull(),
  // Preise in Rappen, um Rundungsfehler zu vermeiden
  priceCents: integer("price_cents").notNull(),
  active: boolean("active").notNull().default(true),
  // Sonderprodukt: die «DerRiesling»-Flasche mit Geheimrat-Code auf der Etikette
  special: boolean("special").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Sitzungen (Events) ─────────────────────────────────────────── */
export const eventStatus = pgEnum("event_status", [
  "upcoming",
  "closed",
]);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  // Römische Sitzungsnummer, z.B. "VII"
  numeral: text("numeral").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  // Vertrauliche Details – nur für Mitglieder / Eingeladene sichtbar
  address: text("address"),
  speech: text("speech"),
  wineNote: text("wine_note"),
  startsAt: timestamp("starts_at"),
  admissionNote: text("admission_note"),
  capacity: integer("capacity").notNull().default(40),
  status: eventStatus("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Einladungen (Codes) ────────────────────────────────────────── */
export const inviteStatus = pgEnum("invite_status", [
  "open",
  "accepted",
  "declined",
]);

export const invitations = pgTable("invitations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  // Name der eingeladenen Person (optional, für die Karte)
  guestName: text("guest_name"),
  // Einladung gilt für eine Person; eine Begleitung kann dazugekauft werden
  companion: boolean("companion").notNull().default(false),
  status: inviteStatus("status").notNull().default("open"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Geheimrat-Codes (Einmal-Codes von den Flaschen) ─────────────
   Beim ersten Event verkaufte Flaschen tragen je einen Code. Wird er
   im Konto eingelöst, erhält das Konto Geheimratsstatus.            */
export const membershipCodes = pgTable("membership_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  note: text("note"),
  redeemedByMemberId: integer("redeemed_by_member_id").references(
    () => members.id
  ),
  redeemedAt: timestamp("redeemed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ── Teilnahme an Sitzungen (direkte Bestätigung für Mitglieder) ── */
export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    memberId: integer("member_id")
      .notNull()
      .references(() => members.id),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    status: text("status").notNull().default("confirmed"),
    // Wurde die inbegriffene (kostenlose) Teilnahme hier eingelöst?
    included: boolean("included").notNull().default(false),
    // Wurde eine Begleitung dazugebucht (+CHF 95)?
    companion: boolean("companion").notNull().default(false),
    // Zu zahlender Betrag in Rappen (0, wenn inbegriffen und ohne Begleitung)
    amountCents: integer("amount_cents").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqMemberEvent: unique("attendance_member_event").on(t.memberId, t.eventId),
  })
);

/* ── Bestellungen ───────────────────────────────────────────────── */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  // Optional verknüpft mit einem Mitglied (für Ratspreis)
  memberId: integer("member_id").references(() => members.id),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  shipAddress: text("ship_address").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("received"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  wineId: integer("wine_id")
    .notNull()
    .references(() => wines.id),
  producerId: integer("producer_id")
    .notNull()
    .references(() => producers.id),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export type Member = typeof members.$inferSelect;
export type Producer = typeof producers.$inferSelect;
export type Wine = typeof wines.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type Order = typeof orders.$inferSelect;
