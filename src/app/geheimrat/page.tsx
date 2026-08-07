import AuthPanel from "./AuthPanel";
import RedeemForm from "./RedeemForm";
import AttendanceButtons from "./AttendanceButtons";
import CodeAdmin from "./CodeAdmin";
import InviteAdmin from "./InviteAdmin";
import Footer from "@/components/Footer";
import { getCurrentMember } from "@/lib/session";
import { getUpcomingEvent, getAllEvents } from "@/lib/queries";
import { logout } from "@/actions/auth";
import { listMembers, listOrders } from "@/actions/admin";
import {
  getMyAttendance,
  listMembershipCodes,
  countOpenCodes,
} from "@/actions/membership";
import { formatEventDate } from "@/lib/date";
import { db } from "@/lib/db";
import { invitations, events as eventsT } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const metadata = { title: "Geheimrat — DerRiesling" };

export default async function GeheimratPage() {
  const member = await getCurrentMember();

  /* ── (1) Nicht angemeldet: Pforte mit Login/Registrierung ──────── */
  if (!member) {
    return (
      <>
        <section className="zone geheimrat" style={{ borderTop: "none" }}>
          <div className="wrap zwei">
            <div>
              <span className="marke">Der innere Kreis</span>
              <h2 style={{ margin: ".6rem 0 1.25rem" }}>Der Geheimrat</h2>
              <p className="lead">
                Ein Konto genügt, um im Shop zu bestellen. Zum Geheimrat gehört,
                wer eine Rats-Flasche geöffnet und den Code darin im Konto
                eingelöst hat. Mitglieder bestätigen ihre Teilnahme an jeder
                Sitzung direkt — und zahlen im Shop den Ratspreis.
              </p>
              <ul className="rechte-liste">
                <li>Registrieren wie ein normaler Kunde</li>
                <li>Code von der Rats-Flasche im Konto einlösen</li>
                <li>Danach: direkte Teilnahme an jeder Sitzung, ohne weiteren Code</li>
                <li>Ratspreis auf alle Weine im Shop</li>
              </ul>
            </div>
            <AuthPanel />
          </div>
        </section>
        <Footer />
      </>
    );
  }

  const isAdmin = member.role === "admin";

  /* ── (2) Angemeldet, aber (noch) kein Geheimrat: Kundenkonto ───── */
  if (!member.council && !isAdmin) {
    return (
      <>
        <section className="zone geheimrat" style={{ borderTop: "none" }}>
          <div className="wrap">
            <div className="kopf">
              <div style={{ flex: "1 1 22ch" }}>
                <span className="marke">Konto</span>
                <h2 style={{ margin: ".4rem 0 0" }}>Willkommen, {member.name}</h2>
              </div>
              <form action={logout}>
                <button className="knopf knopf--still">Abmelden</button>
              </form>
            </div>
            <div className="zwei">
              <div>
                <p className="lead">
                  Dein Konto ist aktiv — du kannst im Shop bestellen. Noch bist du
                  kein Mitglied des Geheimrats.
                </p>
                <p style={{ color: "var(--kalk-matt)" }}>
                  Der Weg hinein führt über eine Flasche: Auf jeder Rats-Flasche,
                  die es an einer Sitzung gibt, steht ein einmaliger Code. Sobald
                  du ihn hier einlöst, öffnet sich der Ratsbereich — mit Rabatt
                  und direkter Teilnahme.
                </p>
              </div>
              <RedeemForm />
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  /* ── (3) + (4) Geheimrat / Admin ───────────────────────────────── */
  const upcoming = await getUpcomingEvent();
  const myAttendance = upcoming ? await getMyAttendance(upcoming.id) : null;

  const [allEvents, invites, memberList, orderList, codeList, openCodes] =
    isAdmin
      ? await Promise.all([
          getAllEvents(),
          db
            .select({
              code: invitations.code,
              status: invitations.status,
              guestName: invitations.guestName,
              numeral: eventsT.numeral,
            })
            .from(invitations)
            .innerJoin(eventsT, eq(invitations.eventId, eventsT.id))
            .orderBy(desc(invitations.id))
            .limit(50),
          listMembers(),
          listOrders(),
          listMembershipCodes(),
          countOpenCodes(),
        ])
      : [[], [], [], [], [], 0];

  return (
    <>
      <section className="zone geheimrat" style={{ borderTop: "none" }}>
        <div className="wrap">
          <div className="kopf">
            <div style={{ flex: "1 1 22ch" }}>
              <span className="marke">
                {isAdmin ? "Ratsbereich · Verwaltung" : "Ratsbereich · vertraulich"}
              </span>
              <h2 style={{ margin: ".4rem 0 0" }}>Willkommen, {member.name}</h2>
            </div>
            <form action={logout}>
              <button className="knopf knopf--still">Abmelden</button>
            </form>
          </div>

          {/* Nächste Sitzung mit direkter Teilnahmebestätigung */}
          {upcoming ? (
            <div className="karte" style={{ marginTop: 0 }}>
              <span className="marke gold">
                Sitzung {upcoming.numeral} · Nächste
              </span>
              <h3>{upcoming.title}</h3>
              <dl style={{ margin: 0 }}>
                <div className="zeile">
                  <dt>Ort</dt>
                  <dd>
                    {(upcoming.address ?? upcoming.location)
                      .split("\n")
                      .map((l, i) => (
                        <span key={i}>
                          {l}
                          <br />
                        </span>
                      ))}
                  </dd>
                </div>
                <div className="zeile">
                  <dt>Zeit</dt>
                  <dd>
                    {formatEventDate(upcoming.startsAt)}
                    {upcoming.admissionNote && (
                      <>
                        <br />
                        <span style={{ color: "var(--kalk-matt)", fontSize: ".9rem" }}>
                          {upcoming.admissionNote}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                {upcoming.speech && (
                  <div className="zeile">
                    <dt>Wort</dt>
                    <dd>{upcoming.speech}</dd>
                  </div>
                )}
                {upcoming.wineNote && (
                  <div className="zeile">
                    <dt>Wein</dt>
                    <dd>{upcoming.wineNote}</dd>
                  </div>
                )}
              </dl>

              <AttendanceButtons eventId={upcoming.id} initial={myAttendance} />

              <p className="siegel">
                Ratspreis (−{member.discountPct}%) gilt automatisch im Shop.
              </p>
            </div>
          ) : (
            <p className="lead">
              Die nächste Sitzung steht noch nicht fest. Als Mitglied erfährst du
              Ort und Zeit hier zuerst.
            </p>
          )}

          {/* Protokoll */}
          <div style={{ marginTop: "3.5rem" }}>
            <span className="marke">Aus dem Protokoll</span>
            <h3 style={{ margin: ".5rem 0 1rem" }}>Sitzung VI, Krypta</h3>
            <p style={{ color: "#C9C6BD", maxWidth: "60ch" }}>
              «Wie eine Stadt ihre Zeit rechnet.» Der Redner sprach über
              Kirchturmuhren und darüber, wer im Mittelalter das Recht hatte, den
              Tag einzuteilen. Danach sechs Mosel-Rieslinge aus Steillage. Der
              1971er blieb am längsten im Gespräch.
            </p>
          </div>

          {/* ── Verwaltung (nur Admin) ── */}
          {isAdmin && (
            <div style={{ marginTop: "4rem" }}>
              <div className="kopf">
                <h2>Verwaltung</h2>
                <span className="marke">
                  {openCodes} Codes offen · {memberList.length} Konten
                </span>
              </div>

              {/* Geheimrat-Codes */}
              <div className="zwei">
                <CodeAdmin />
                <div>
                  <span className="marke">Ausgegebene Geheimrat-Codes</span>
                  <ul className="rechte-liste">
                    {codeList.length === 0 && <li>Noch keine Codes erzeugt.</li>}
                    {codeList.slice(0, 20).map((c) => (
                      <li key={c.code}>
                        <span style={{ flex: 1 }}>
                          <span className="gold" style={{ fontFamily: "var(--mono)" }}>
                            {c.code}
                          </span>
                          {c.note ? <span className="marke"> {c.note}</span> : null}
                        </span>
                        <span className="marke">
                          {c.redeemed ? "eingelöst" : "offen"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Einladungen für individuelle Gäste */}
              <div className="zwei" style={{ marginTop: "3rem" }}>
                <InviteAdmin
                  events={allEvents.map((e) => ({
                    id: e.id,
                    numeral: e.numeral,
                    location: e.location,
                  }))}
                />
                <div>
                  <span className="marke">Persönliche Einladungen</span>
                  <ul className="rechte-liste">
                    {invites.length === 0 && <li>Noch keine Einladungen.</li>}
                    {invites.map((i) => (
                      <li key={i.code}>
                        <span style={{ flex: 1 }}>
                          <span className="gold" style={{ fontFamily: "var(--mono)" }}>
                            {i.code}
                          </span>{" "}
                          — Sitzung {i.numeral}
                          {i.guestName ? ` · ${i.guestName}` : ""}
                        </span>
                        <span className="marke">{i.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Konten */}
              <div style={{ marginTop: "3rem" }}>
                <span className="marke">Konten</span>
                <ul className="rechte-liste">
                  {memberList.length === 0 && <li>Noch keine Konten.</li>}
                  {memberList.map((m) => (
                    <li key={m.id}>
                      <span style={{ flex: 1 }}>
                        {m.name} <span className="marke">{m.email}</span>
                      </span>
                      <span className="marke">
                        {m.role === "admin"
                          ? "Admin"
                          : m.council
                            ? `Rat · −${m.discountPct}%`
                            : "Kunde"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bestellungen */}
              <div style={{ marginTop: "3rem" }}>
                <span className="marke">Bestellungen (letzte 50)</span>
                {orderList.length === 0 ? (
                  <p className="lead" style={{ marginTop: "1rem" }}>
                    Noch keine Bestellungen.
                  </p>
                ) : (
                  <div style={{ marginTop: "1rem" }}>
                    {orderList.map((o) => (
                      <details
                        key={o.id}
                        style={{ borderTop: "var(--rand)", padding: "1rem 0" }}
                      >
                        <summary
                          style={{
                            display: "flex",
                            gap: "1rem",
                            cursor: "pointer",
                            listStyle: "none",
                            alignItems: "baseline",
                          }}
                        >
                          <span className="gold" style={{ fontFamily: "var(--mono)", minWidth: "3rem" }}>
                            #{o.id}
                          </span>
                          <span style={{ flex: 1 }}>
                            {o.buyerName}{" "}
                            {o.isMember && <span className="badge">Rat</span>}
                            <br />
                            <span className="marke">{o.createdAt}</span>
                          </span>
                          <span className="preis">{o.totalLabel}</span>
                        </summary>
                        <div style={{ padding: "1rem 0 0 4rem" }}>
                          <p style={{ color: "#C9C6BD", fontSize: ".9rem" }}>
                            {o.buyerEmail} · {o.shipAddress}
                          </p>
                          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                            {o.items.map((it, idx) => (
                              <li
                                key={idx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "1rem",
                                  fontSize: ".9rem",
                                  padding: ".3rem 0",
                                }}
                              >
                                <span>{it.label}</span>
                                <span className="marke">{it.lineLabel}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </>
  );
}
