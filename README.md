# DerRiesling

Eine Hommage an Riesling — Eventserie, Geheimrat und Weinshop als Plattform.

Gebaut mit **Next.js (App Router)**, **Neon (Postgres)** und **Drizzle ORM**,
deploybar auf **Vercel**.

## Was die Seite kann

- **Startseite** — Auftakt, Manifest, Verzeichnis der Sitzungen, Weinshop,
  Geheimrat-Teaser, Einladung, Über uns.
- **Shop** (`/shop`) — Rieslinge als Plattform: Jede Bestellung wird pro
  Weingut aufgeteilt und geht per Mail direkt an den jeweiligen Produzenten,
  der selbst versendet. DerRiesling ist Vermittler, nicht Händler.
- **Geheimrat** (`/geheimrat`) — Login-geschützter Mitgliederbereich mit den
  vertraulichen Angaben zur nächsten Sitzung, Protokoll-Auszug und
  automatischem **Ratspreis** (Rabatt) im Shop. Admins können hier
  Einladungscodes erzeugen und versenden.
- **Einladung** (`/event`) — Konspirativ wirkende Einladung: Code eingeben,
  danach erscheinen Ort und Zeit. Zusagen / Absagen wird gespeichert.

## Was es zum Betrieb noch braucht

Du hast GitHub, Vercel und Neon bereits verbunden. Es fehlt nur noch:

1. **Neon-Datenbank anlegen** (falls noch nicht geschehen) und die
   Environment-Variable `DATABASE_URL` setzen.
   - Nutzt du die **Neon-Vercel-Integration**, wird `DATABASE_URL` automatisch
     in Vercel gesetzt. Sonst den *Pooled connection string* aus dem
     Neon-Dashboard kopieren.
2. **`AUTH_SECRET`** in Vercel setzen — ein langer Zufallswert
   (`openssl rand -base64 32`). Ohne diesen sind die Sitzungs-Cookies nicht
   sicher signiert.
3. **Datenbankschema anlegen und Startdaten laden** (einmalig, lokal mit
   gesetzter `DATABASE_URL`):
   ```bash
   npm install
   npm run db:push     # legt die Tabellen in Neon an
   npm run db:seed     # Weine, Sitzungen, Demo-Codes, Demo-Login
   ```
4. *(Optional)* **`RESEND_API_KEY`** + `MAIL_FROM` setzen, damit Bestell- und
   Einladungs-Mails wirklich versendet werden. Ohne Key läuft alles trotzdem
   durch — die Mails werden nur in die Server-Logs geschrieben, die
   Bestellungen/Zusagen liegen in der Datenbank.

Alle Variablen sind in `.env.example` dokumentiert. Für die lokale Entwicklung
eine `.env` mit denselben Werten anlegen.

## Lokal starten

```bash
cp .env.example .env      # Werte eintragen (mind. DATABASE_URL, AUTH_SECRET)
npm install
npm run db:push
npm run db:seed
npm run dev               # http://localhost:3000
```

### Demo-Zugänge nach dem Seed

- **Geheimrat-Login:** `post@derriesling.ch` / `riesling` (Admin)
- **Einladungscodes:** `RSL-VII-4820` · `RSL-VII-1174`

## Deployment auf Vercel

1. Repo in Vercel importieren (Framework wird als *Next.js* erkannt).
2. Environment-Variablen setzen: `DATABASE_URL`, `AUTH_SECRET`
   (optional `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL`).
3. Deploy. Das Schema/Seeding einmalig lokal gegen dieselbe Neon-DB laufen
   lassen (Schritt 3 oben) — Vercel selbst führt keine Migrationen aus.

## Projektstruktur

```
src/
  app/
    layout.tsx            Root-Layout: Header, Warenkorb, Kataloge, Provider
    page.tsx              Startseite
    shop/page.tsx         Weinshop
    event/                Einladung (Code prüfen, zu-/absagen)
    geheimrat/            Login + Ratsbereich + Admin
  actions/               Server Actions: checkout, auth, invite
  components/            Warenkorb, Weinregal, Header/Footer (Client + Server)
  lib/                   db (Drizzle/Neon), schema, session (JWT), mail, helpers
  db/seed.ts             Startdaten
drizzle.config.ts        Drizzle-Kit-Konfiguration
```

## Hinweis

Weingut- und Personennamen sowie Texte sind erfunden. Preise sind in Rappen
gespeichert, um Rundungsfehler zu vermeiden.
