"use server";

import { db } from "@/lib/db";
import { invitations, events } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendMail } from "@/lib/mail";
import { getCurrentMember } from "@/lib/session";
import { formatEventDate } from "@/lib/date";
import { TICKET_CENTS, formatCHF } from "@/lib/price";

export type InviteView = {
  code: string;
  status: "open" | "accepted" | "declined";
  companion: boolean;
  companionCents: number;
  guestName: string | null;
  event: {
    numeral: string;
    title: string;
    location: string;
    address: string | null;
    speech: string | null;
    wineNote: string | null;
    startsAt: string | null;
    admissionNote: string | null;
  };
};

export type VerifyResult =
  | { ok: true; invite: InviteView }
  | { ok: false; error: string };

function normalize(code: string) {
  return code.trim().toUpperCase();
}

export async function verifyInvite(codeRaw: string): Promise<VerifyResult> {
  const code = normalize(codeRaw);
  if (!code) return { ok: false, error: "Bitte einen Code eingeben." };

  const rows = await db
    .select({
      code: invitations.code,
      status: invitations.status,
      companion: invitations.companion,
      guestName: invitations.guestName,
      numeral: events.numeral,
      title: events.title,
      location: events.location,
      address: events.address,
      speech: events.speech,
      wineNote: events.wineNote,
      startsAt: events.startsAt,
      admissionNote: events.admissionNote,
    })
    .from(invitations)
    .innerJoin(events, eq(invitations.eventId, events.id))
    .where(eq(invitations.code, code));

  const r = rows[0];
  if (!r) {
    return {
      ok: false,
      error: "Dieser Code gilt nicht. Prüfen Sie die Schreibweise auf Ihrer Einladung.",
    };
  }

  return {
    ok: true,
    invite: {
      code: r.code,
      status: r.status,
      companion: r.companion,
      companionCents: TICKET_CENTS,
      guestName: r.guestName,
      event: {
        numeral: r.numeral,
        title: r.title,
        location: r.location,
        address: r.address,
        speech: r.speech,
        wineNote: r.wineNote,
        startsAt: r.startsAt ? r.startsAt.toISOString() : null,
        admissionNote: r.admissionNote,
      },
    },
  };
}

export type RespondResult =
  | { ok: true; status: "accepted" | "declined"; companion: boolean }
  | { ok: false; error: string };

export async function respondInvite(
  codeRaw: string,
  decision: "accept" | "decline",
  companion: boolean = false
): Promise<RespondResult> {
  const code = normalize(codeRaw);
  const rows = await db.select().from(invitations).where(eq(invitations.code, code));
  const inv = rows[0];
  if (!inv) return { ok: false, error: "Code nicht gefunden." };

  const status = decision === "accept" ? "accepted" : "declined";
  const withCompanion = decision === "accept" ? companion : false;
  await db
    .update(invitations)
    .set({ status, companion: withCompanion, respondedAt: new Date() })
    .where(eq(invitations.code, code));

  await sendMail({
    to: process.env.ADMIN_EMAIL ?? "post@derriesling.ch",
    subject: `Einladung ${code}: ${status === "accepted" ? "Zusage" : "Absage"}`,
    text:
      `Code ${code} wurde ${status === "accepted" ? "zugesagt" : "abgesagt"}.` +
      (withCompanion ? `\nMit Begleitung (+${formatCHF(TICKET_CENTS)}).` : ""),
  });

  return { ok: true, status, companion: withCompanion };
}

export type CreateInviteResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/** Admin: erzeugt einen neuen Einladungscode für ein Event (gilt für 1 Person). */
export async function createInvite(input: {
  eventId: number;
  guestName?: string;
  guestEmail?: string;
}): Promise<CreateInviteResult> {
  const member = await getCurrentMember();
  if (!member || member.role !== "admin") {
    return { ok: false, error: "Nur für die Verwaltung." };
  }

  const evRows = await db.select().from(events).where(eq(events.id, input.eventId));
  const ev = evRows[0];
  if (!ev) return { ok: false, error: "Sitzung nicht gefunden." };

  let code = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const candidate = `RSL-${ev.numeral}-${suffix}`;
    const exists = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.code, candidate));
    if (exists.length === 0) {
      code = candidate;
      break;
    }
  }
  if (!code) return { ok: false, error: "Code-Erzeugung fehlgeschlagen. Nochmals versuchen." };

  await db.insert(invitations).values({
    code,
    eventId: ev.id,
    guestName: input.guestName?.trim() || null,
    status: "open",
  });

  if (input.guestEmail?.trim()) {
    await sendMail({
      to: input.guestEmail.trim(),
      subject: `Eine Einladung — Sitzung ${ev.numeral}`,
      text:
        `${input.guestName ? input.guestName + "," : "Guten Tag,"}\n\n` +
        `Sie sind für eine Sitzung von DerRiesling vorgesehen.\n\n` +
        `Ort:  ${ev.location}\n` +
        `Zeit: ${formatEventDate(ev.startsAt)}\n` +
        `Die Einladung gilt für eine Person; eine Begleitung kann für ` +
        `${formatCHF(TICKET_CENTS)} dazugebucht werden.\n\n` +
        `Bestätigen unter derriesling.ch/event mit diesem Code:\n\n` +
        `   ${code}\n\n` +
        `Der Code gilt nur für diese eine Sitzung und ist nicht übertragbar.\n\n— DerRiesling`,
    });
  }

  return { ok: true, code };
}
