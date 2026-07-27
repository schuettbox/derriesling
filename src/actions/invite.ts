"use server";

import { db } from "@/lib/db";
import { invitations, events } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendMail } from "@/lib/mail";
import { getCurrentMember } from "@/lib/session";
import { formatEventDate } from "@/lib/date";

export type InviteView = {
  code: string;
  status: "open" | "accepted" | "declined";
  plusOnes: number;
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
      plusOnes: invitations.plusOnes,
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
      plusOnes: r.plusOnes,
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
  | { ok: true; status: "accepted" | "declined" }
  | { ok: false; error: string };

export async function respondInvite(
  codeRaw: string,
  decision: "accept" | "decline"
): Promise<RespondResult> {
  const code = normalize(codeRaw);
  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.code, code));
  const inv = rows[0];
  if (!inv) return { ok: false, error: "Code nicht gefunden." };

  const status = decision === "accept" ? "accepted" : "declined";
  await db
    .update(invitations)
    .set({ status, respondedAt: new Date() })
    .where(eq(invitations.code, code));

  // Benachrichtigung an den Rat
  await sendMail({
    to: process.env.ADMIN_EMAIL ?? "post@derriesling.ch",
    subject: `Einladung ${code}: ${status === "accepted" ? "Zusage" : "Absage"}`,
    text: `Code ${code} wurde ${
      status === "accepted" ? "zugesagt" : "abgesagt"
    }.`,
  });

  return { ok: true, status };
}

export type CreateInviteResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

/** Admin: erzeugt einen neuen Einladungscode für ein Event. */
export async function createInvite(input: {
  eventId: number;
  guestName?: string;
  guestEmail?: string;
  plusOnes?: number;
}): Promise<CreateInviteResult> {
  const member = await getCurrentMember();
  if (!member || member.role !== "admin") {
    return { ok: false, error: "Nur für die Verwaltung." };
  }

  const evRows = await db
    .select()
    .from(events)
    .where(eq(events.id, input.eventId));
  const ev = evRows[0];
  if (!ev) return { ok: false, error: "Sitzung nicht gefunden." };

  // Eindeutigen Code erzeugen (RSL-<numeral>-XXXX)
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
    plusOnes: input.plusOnes && input.plusOnes > 0 ? input.plusOnes : 1,
    status: "open",
  });

  // Konspirative Einladung per Mail (falls Adresse angegeben)
  if (input.guestEmail?.trim()) {
    await sendMail({
      to: input.guestEmail.trim(),
      subject: `Eine Einladung — Sitzung ${ev.numeral}`,
      text:
        `${input.guestName ? input.guestName + "," : "Guten Tag,"}\n\n` +
        `Sie sind für eine Sitzung von DerRiesling vorgesehen.\n\n` +
        `Ort:  ${ev.location}\n` +
        `Zeit: ${formatEventDate(ev.startsAt)}\n` +
        `Begleitung: ${input.plusOnes ?? 1}\n\n` +
        `Bestätigen unter derriesling.ch/event mit diesem Code:\n\n` +
        `   ${code}\n\n` +
        `Der Code gilt für eine Person und eine Begleitung, nur für diese ` +
        `eine Sitzung. Er ist nicht übertragbar.\n\n— DerRiesling`,
    });
  }

  return { ok: true, code };
}
