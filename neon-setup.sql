-- ============================================================
--  DerRiesling — Einmaliges Setup für Neon
--  Diesen gesamten Inhalt in Neon → Ihr Projekt → "SQL Editor"
--  einfügen und ausführen. Legt alle Tabellen an und füllt sie
--  mit den Startdaten (Weine, Sitzungen, Demo-Codes, Admin-Login).
--  Alternativ lokal:  npm run db:push && npm run db:seed
-- ============================================================

-- ── Aufzählungstypen ────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "event_status"  AS ENUM('upcoming','closed');           EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "invite_status" AS ENUM('open','accepted','declined');  EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Tabellen ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "producers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "region" text NOT NULL,
  "order_email" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wines" (
  "id" serial PRIMARY KEY NOT NULL,
  "producer_id" integer NOT NULL REFERENCES "producers"("id"),
  "winzer" text NOT NULL,
  "name" text NOT NULL,
  "herkunft" text NOT NULL,
  "price_cents" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "events" (
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
);

CREATE TABLE IF NOT EXISTS "invitations" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "event_id" integer NOT NULL REFERENCES "events"("id"),
  "guest_name" text,
  "plus_ones" integer DEFAULT 1 NOT NULL,
  "status" "invite_status" DEFAULT 'open' NOT NULL,
  "responded_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "members" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text NOT NULL,
  "role" text DEFAULT 'customer' NOT NULL,
  "council" boolean DEFAULT false NOT NULL,
  "discount_pct" integer DEFAULT 15 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "council" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "membership_codes" (
  "id" serial PRIMARY KEY NOT NULL,
  "code" text NOT NULL UNIQUE,
  "note" text,
  "redeemed_by_member_id" integer REFERENCES "members"("id"),
  "redeemed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" serial PRIMARY KEY NOT NULL,
  "member_id" integer NOT NULL REFERENCES "members"("id"),
  "event_id" integer NOT NULL REFERENCES "events"("id"),
  "status" text DEFAULT 'confirmed' NOT NULL,
  "plus_ones" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_member_event" UNIQUE ("member_id","event_id")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "member_id" integer REFERENCES "members"("id"),
  "buyer_name" text NOT NULL,
  "buyer_email" text NOT NULL,
  "ship_address" text NOT NULL,
  "total_cents" integer NOT NULL,
  "status" text DEFAULT 'received' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL REFERENCES "orders"("id"),
  "wine_id" integer NOT NULL REFERENCES "wines"("id"),
  "producer_id" integer NOT NULL REFERENCES "producers"("id"),
  "quantity" integer NOT NULL,
  "unit_price_cents" integer NOT NULL
);

-- ── Startdaten (nur einfügen, wenn noch leer) ───────────────
-- Produzenten
INSERT INTO "producers" ("name","region","order_email")
SELECT * FROM (VALUES
  ('Weingut Steinkauz','Mosel, DE','bestellung@steinkauz.example'),
  ('Domaine Bergrain','Alsace, FR','commande@bergrain.example'),
  ('Weingut Rheinwarte','Baden, DE','bestellung@rheinwarte.example'),
  ('Hangwerk','Bündner Herrschaft, CH','bestellung@hangwerk.example'),
  ('Weingut Falkenhorst','Rheingau, DE','bestellung@falkenhorst.example'),
  ('Hofgut Donaustein','Wachau, AT','bestellung@donaustein.example'),
  ('Weingut Sonnenspiel','Pfalz, DE','bestellung@sonnenspiel.example')
) AS v(name,region,order_email)
WHERE NOT EXISTS (SELECT 1 FROM "producers");

-- Weine (verknüpft über den Produzentennamen)
INSERT INTO "wines" ("producer_id","winzer","name","herkunft","price_cents")
SELECT p.id, w.winzer, w.name, w.herkunft, w.price_cents FROM (VALUES
  ('Weingut Steinkauz','Weingut Steinkauz','«Schiefer I» Riesling trocken 2023','Mosel, DE',3400),
  ('Domaine Bergrain','Domaine Bergrain','Riesling Grand Cru «Coteau» 2022','Alsace, FR',4200),
  ('Weingut Rheinwarte','Weingut Rheinwarte','Riesling «Kalkstein» 2023','Baden, DE',2900),
  ('Hangwerk','Hangwerk','Riesling 2022','Bündner Herrschaft, CH',4600),
  ('Weingut Falkenhorst','Weingut Falkenhorst','Riesling Kabinett «Alte Reben» 2021','Rheingau, DE',3800),
  ('Hofgut Donaustein','Hofgut Donaustein','Riesling Smaragd 2022','Wachau, AT',5200),
  ('Weingut Sonnenspiel','Weingut Sonnenspiel','Riesling GG «Kreide» 2021','Pfalz, DE',5800),
  ('Weingut Steinkauz','Weingut Steinkauz','Riesling Auslese 2019 · 37.5 cl','Mosel, DE',4400)
) AS w(pname,winzer,name,herkunft,price_cents)
JOIN "producers" p ON p.name = w.pname
WHERE NOT EXISTS (SELECT 1 FROM "wines");

-- Sitzungen (VII zuerst → bekommt id 1, darauf zeigen die Codes)
INSERT INTO "events" ("numeral","title","location","address","speech","wine_note","starts_at","admission_note","status")
SELECT * FROM (VALUES
  ('VII','«Ein Flughafen, drei Länder»','EuroAirport, Frachtterminal Süd',
   E'EuroAirport Basel–Mulhouse–Freiburg\nFrachtterminal Süd, Tor 4',
   'Zur Fracht, die nachts durch drei Länder geht',
   'Acht Rieslinge aus dem Dreiländereck — Baden, Elsass, Schweiz',
   TIMESTAMP '2026-09-24 19:00:00','Einlass bis 19:20, danach ist das Tor zu.','upcoming'),
  ('VI','«Wie eine Stadt ihre Zeit rechnet»','Münster Basel, Krypta',NULL,NULL,'Mosel, Steillage',NULL,NULL,'closed'),
  ('V','«Was Strom kostet, wenn niemand zusieht»','Kraftwerk Birsfelden, Turbinenhalle',NULL,NULL,'Wachau',NULL,NULL,'closed'),
  ('IV','«Verdichtung»','Turmhaus, 24. Stock',NULL,NULL,'Rheingau, trocken',NULL,NULL,'closed'),
  ('III','«Präzision als Kulturgut»','Manufaktur im Jura',NULL,NULL,'Alsace, Grand Cru',NULL,NULL,'closed'),
  ('II','«Wem gehört ein Bild»','Kunstdepot, Halle 3',NULL,NULL,'Nahe',NULL,NULL,'closed'),
  ('I','«Was der Rhein transportiert»','Rheinhafen Kleinhüningen',NULL,NULL,'Baden, Kalkstein',NULL,NULL,'closed')
) AS e(numeral,title,location,address,speech,wine_note,starts_at,admission_note,status)
WHERE NOT EXISTS (SELECT 1 FROM "events");

-- Einladungscodes für Sitzung VII
INSERT INTO "invitations" ("code","event_id","plus_ones","status")
SELECT c.code, e.id, 1, 'open' FROM (VALUES
  ('RSL-VII-4820'),('RSL-VII-1174')
) AS c(code)
JOIN "events" e ON e.numeral = 'VII'
WHERE NOT EXISTS (SELECT 1 FROM "invitations");

-- Admin-/Demo-Login:  post@derriesling.ch / riesling  (zugleich Ratsmitglied)
INSERT INTO "members" ("email","password_hash","name","role","council","discount_pct")
SELECT 'post@derriesling.ch',
       '$2a$10$g1geTmIQRE.oDK2wRMUCGunZ2tAQWMlSzz/ucOHy41lOdn1tCSmP2',
       'Der Rat','admin',true,15
WHERE NOT EXISTS (SELECT 1 FROM "members" WHERE email='post@derriesling.ch');

-- Beispiel-Geheimrat-Codes (wie auf den Rats-Flaschen)
INSERT INTO "membership_codes" ("code","note")
SELECT * FROM (VALUES
  ('RAT-AAA-111','Demo — Rats-Flasche'),
  ('RAT-BBB-222','Demo — Rats-Flasche')
) AS c(code,note)
WHERE NOT EXISTS (SELECT 1 FROM "membership_codes");
