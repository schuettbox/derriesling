import LoginForm from "./LoginForm";
import InviteAdmin from "./InviteAdmin";
import MemberAdmin from "./MemberAdmin";
import Footer from "@/components/Footer";
import { getCurrentMember } from "@/lib/session";
import { getUpcomingEvent, getAllEvents } from "@/lib/queries";
import { logout } from "@/actions/auth";
import { listMembers, listOrders } from "@/actions/admin";
import { formatEventDate } from "@/lib/date";
import { db } from "@/lib/db";
import { invitations, events as eventsT } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const metadata = { title: "Geheimrat — DerRiesling" };

export default async function GeheimratPage() {
  const member = await getCurrentMember();

  /* ── Nicht angemeldet: Pforte ─────────────────────────────────── */
  if (!member) {
    return (
      <>
        <section className="zone geheimrat" style={{ borderTop: "none" }}>
          <div className="wrap zwei">
            <div>
              <span className="marke">Nur für Mitglieder</span>
              <h2 style={{ margin: ".6rem 0 1.25rem" }}>Der Geheimrat</h2>
              <p className="lead">
                Der Zugang ist Mitgliedern vorbehalten. Wer Mitglied ist, sieht
                hier Ort und Zeit der nächsten Sitzung, das Protokoll der letzten
                — und zahlt im Shop den Ratspreis.
              </p>
              <p style={{ color: "var(--kalk-matt)", marginTop: "1.5rem" }}>
                Keine Mitgliedschaft? Der Rat nimmt keine Bewerbungen an. Man wird
                vorgeschlagen — meistens an einer Sitzung.
              </p>
            </div>
            <div className="pforte">
              <span className="marke">Pforte</span>
              <h3 style={{ margin: ".6rem 0 1.5rem" }}>Anmelden</h3>
              <LoginForm />
              <p
                style={{
                  marginTop: "1.5rem",
                  fontSize: ".8rem",
                  color: "var(--kalk-matt)",
                }}
              >
                Demo: post@derriesling.ch / riesling
              </p>
            </div>
          </div>
        </section>
        <Footer />
      </>
    );
  }

  /* ── Angemeldet: Ratsbereich ──────────────────────────────────── */
  const upcoming = await getUpcomingEvent();
  const isAdmin = member.role === "admin";
  const allEvents = isAdmin ? await getAllEvents() : [];

  const [invites, memberList, orderList] = isAdmin
    ? await Promise.all([
        db
          .select({
            code: invitations.code,
            status: invitations.status,
            guestName: invitations.guestName,
            plusOnes: invitations.plusOnes,
            numeral: eventsT.numeral,
          })
          .from(invitations)
          .innerJoin(eventsT, eq(invitations.eventId, eventsT.id))
          .orderBy(desc(invitations.id))
          .limit(50),
        listMembers(),
        listOrders(),
      ])
    : [[], [], []];

  return (
    <>
      <section className="zone geheimrat" style={{ borderTop: "none" }}>
        <div className="wrap">
          <div className="kopf">
            <div style={{ flex: "1 1 22ch" }}>
              <span className="marke">Ratsbereich · vertraulich</span>
              <h2 style={{ margin: ".4rem 0 0" }}>Willkommen, {member.name}</h2>
            </div>
            <form action={logout}>
              <button className="knopf knopf--still">Abmelden</button>
            </form>
          </div>

          {/* Nächste Sitzung — vollständige, vertrauliche Angaben */}
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
                        <span
                          style={{
                            color: "var(--kalk-matt)",
                            fontSize: ".9rem",
                          }}
                        >
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
                <div className="zeile">
                  <dt>Ihr Platz</dt>
                  <dd>Fest reserviert · plus eine Begleitung</dd>
                </div>
              </dl>
              <p className="siegel">
                Ihr Ratspreis (−{member.discountPct}%) gilt automatisch im Shop.
              </p>
            </div>
          ) : (
            <p className="lead">
              Die nächste Sitzung steht noch nicht fest. Sie erfahren Ort und Zeit
              hier zuerst.
            </p>
          )}

          {/* Protokoll (Auszug) */}
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

          {/* Verwaltung */}
          {isAdmin && (
            <div style={{ marginTop: "3.5rem" }}>
              <div className="kopf">
                <h2>Verwaltung</h2>
                <span className="marke">Nur Admin</span>
              </div>

              {/* Einladungen */}
              <div className="zwei">
                <InviteAdmin
                  events={allEvents.map((e) => ({
                    id: e.id,
                    numeral: e.numeral,
                    location: e.location,
                  }))}
                />
                <div>
                  <span className="marke">Ausgegebene Codes</span>
                  <ul className="rechte-liste">
                    {invites.length === 0 && (
                      <li>Noch keine Einladungen ausgegeben.</li>
                    )}
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

              {/* Mitglieder */}
              <div className="zwei" style={{ marginTop: "3rem" }}>
                <MemberAdmin />
                <div>
                  <span className="marke">Mitglieder des Rats</span>
                  <ul className="rechte-liste">
                    {memberList.length === 0 && <li>Noch keine Mitglieder.</li>}
                    {memberList.map((m) => (
                      <li key={m.id}>
                        <span style={{ flex: 1 }}>
                          {m.name}{" "}
                          <span className="marke">{m.email}</span>
                        </span>
                        <span className="marke">
                          {m.role === "admin" ? "Admin" : `−${m.discountPct}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
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
                        style={{
                          borderTop: "var(--rand)",
                          padding: "1rem 0",
                        }}
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
                          <span
                            className="gold"
                            style={{ fontFamily: "var(--mono)", minWidth: "3rem" }}
                          >
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
