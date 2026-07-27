import Link from "next/link";
import WineGrid from "@/components/WineGrid";
import Footer from "@/components/Footer";
import { getAllEvents, getUpcomingEvent } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { formatEventDate, formatShort } from "@/lib/date";

export default async function Home() {
  const [events, upcoming, member] = await Promise.all([
    getAllEvents(),
    getUpcomingEvent(),
    getCurrentMember(),
  ]);

  const nextLabel = upcoming
    ? `Sitzung ${upcoming.numeral} · ${formatShort(upcoming.startsAt)}`
    : "Sitzung folgt · Ort folgt";

  return (
    <>
      {/* ============ AUFTAKT ============ */}
      <section className="auftakt" id="oben">
        <div className="wrap">
          <span className="marke">Basel · Rebe, Schiefer, Gespräch</span>
          <h1>
            Der<em>Riesling</em>
          </h1>
          <div className="strich" />
          <p className="lead">
            Eine Hommage an die eine Rebsorte, die den Boden verrät, auf dem sie
            steht. Wir versammeln uns an Orten, die etwas zu erzählen haben, hören
            einer Person zu, die dort etwas zu sagen hat — und degustieren danach
            die Rieslinge, die zu diesem Ort gehören.
          </p>
          {upcoming && (
            <div className="naechste">
              <span className="marke">
                Sitzung {upcoming.numeral} · {formatShort(upcoming.startsAt)}
              </span>
              <b>{upcoming.location}</b>
              <p
                style={{
                  margin: 0,
                  color: "#C9C6BD",
                  fontSize: ".95rem",
                }}
              >
                {upcoming.title} — {upcoming.wineNote}. Zutritt nur mit Code.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============ MANIFEST ============ */}
      <section className="zone">
        <div className="wrap">
          <div className="drei">
            <div>
              <span className="marke">Der Ort</span>
              <h3>Wo etwas passiert</h3>
              <p>
                Ein Frachtterminal, eine Krypta, ein Kraftwerk. Wir tagen dort,
                wo der Abend ohnehin ein Thema hat — nie in einem Saal, der
                austauschbar ist.
              </p>
            </div>
            <div>
              <span className="marke">Das Wort</span>
              <h3>Eine halbe Stunde</h3>
              <p>
                Eine Rednerin oder ein Redner aus Politik, Wirtschaft, Forschung.
                Dreissig Minuten, keine Folien, keine Aufzeichnung. Was gesagt
                wird, bleibt im Raum.
              </p>
            </div>
            <div>
              <span className="marke">Der Wein</span>
              <h3>Acht Flaschen</h3>
              <p>
                Immer Riesling, immer mit Bezug zum Ort. Ausgeschenkt von jenen,
                die ihn gemacht haben. Wer will, nimmt ihn danach im Shop mit nach
                Hause.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SITZUNGEN ============ */}
      <section className="zone" id="sitzungen">
        <div className="wrap">
          <div className="kopf">
            <h2>Die Sitzungen</h2>
            <span className="marke">Verzeichnis · MMXXIV bis heute</span>
          </div>

          {events.map((e) => {
            const jetzt = e.status === "upcoming";
            return (
              <div
                className={`reihe ${jetzt ? "reihe--jetzt" : ""}`}
                key={e.id}
              >
                <span className="zahl">{e.numeral}</span>
                <span className="ort">{e.location}</span>
                <span className="thema">
                  {e.title}
                  {e.wineNote ? ` · ${e.wineNote}` : ""}
                </span>
                <span className="stand">
                  {jetzt
                    ? `${formatShort(e.startsAt)} · Nächste`
                    : "Geschlossen"}
                </span>
              </div>
            );
          })}

          <p className="hinweis">
            Jede Sitzung ist auf 40 Plätze begrenzt. Mitglieder des Geheimrats
            sind immer eingeladen; alle anderen kommen auf Einladung. Ort und Zeit
            stehen ausschliesslich auf der Einladung.
          </p>
        </div>
      </section>

      {/* ============ WEINE ============ */}
      <section className="zone" id="weine">
        <div className="wrap">
          <div className="kopf">
            <h2>Die Weine</h2>
            <span className="marke">Versand direkt vom Weingut</span>
          </div>
          <WineGrid />
          <p className="hinweis">
            DerRiesling ist Vermittler, nicht Händler. Jede Bestellung geht an das
            jeweilige Weingut, das die Flaschen selbst versendet — auch wenn Sie
            bei mehreren Betrieben bestellen. Mitglieder des Geheimrats zahlen den
            Ratspreis.{" "}
            {member ? (
              <span className="gold">Ihr Ratspreis ist aktiv.</span>
            ) : (
              <Link href="/geheimrat" className="gold">
                Zum Geheimrat →
              </Link>
            )}
          </p>
        </div>
      </section>

      {/* ============ GEHEIMRAT ============ */}
      <section className="zone geheimrat" id="geheimrat">
        <div className="wrap zwei">
          <div>
            <span className="marke">Nur für Mitglieder</span>
            <h2 style={{ margin: ".6rem 0 1.25rem" }}>Der Geheimrat</h2>
            <p className="lead">
              Vierzig Personen, die sich sonst nicht begegnen würden: eine
              Winzerin, ein Zollbeamter, zwei Grossrätinnen, ein Frachtdisponent.
              Der Rat ist keine Liste von Namen — er ist die Gästeliste jeder
              Sitzung.
            </p>
            <ul className="rechte-liste">
              <li>Ort und Zeit der nächsten Sitzung, sobald sie feststehen</li>
              <li>Fester Platz, plus eine Begleitung nach Anmeldung</li>
              <li>Ratspreis auf alle Weine im Shop</li>
              <li>Das Protokoll: was gesagt und was getrunken wurde</li>
              <li>Ein Vorschlagsrecht pro Jahr für ein neues Mitglied</li>
            </ul>
          </div>
          <div className="pforte">
            <span className="marke">Pforte</span>
            <h3 style={{ margin: ".6rem 0 1.5rem" }}>
              {member ? "Angemeldet" : "Anmelden"}
            </h3>
            {member ? (
              <p>
                Willkommen zurück, {member.name}.
                <br />
                <br />
                <Link
                  href="/geheimrat"
                  className="knopf"
                  style={{ width: "100%" }}
                >
                  In den Ratsbereich
                </Link>
              </p>
            ) : (
              <>
                <p style={{ color: "var(--kalk-matt)" }}>
                  Der Zugang ist Mitgliedern vorbehalten.
                </p>
                <Link
                  href="/geheimrat"
                  className="knopf"
                  style={{ width: "100%" }}
                >
                  Eintreten
                </Link>
                <p
                  style={{
                    margin: "1.5rem 0 0",
                    fontSize: ".85rem",
                    color: "var(--kalk-matt)",
                  }}
                >
                  Keine Mitgliedschaft? Der Rat nimmt keine Bewerbungen an. Man
                  wird vorgeschlagen — meistens an einer Sitzung.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ============ EINLADUNG ============ */}
      <section className="zone" id="einladung">
        <div className="wrap">
          <div className="kopf">
            <h2>Einladung bestätigen</h2>
            <span className="marke">derriesling.ch/event</span>
          </div>
          <p className="lead">
            Sie haben einen Code erhalten. Er gilt für eine Person und eine
            Begleitung, und nur für diese eine Sitzung.
          </p>
          <p style={{ marginTop: "2rem" }}>
            <Link href="/event" className="knopf">
              Code eingeben
            </Link>
          </p>
        </div>
      </section>

      {/* ============ ÜBER UNS ============ */}
      <section className="zone ueber">
        <div className="wrap">
          <span className="marke">Über uns</span>
          <h2 style={{ margin: ".6rem 0 1.5rem" }}>Kurz</h2>
          <p>
            DerRiesling ist in Basel entstanden, aus einer Diskussion über eine
            Flasche aus dem Elsass und der Frage, warum man interessante Leute
            meistens an uninteressanten Orten trifft.
          </p>
          <p>
            Wir sind ein kleines Team, wir verkaufen keine Tickets und wir machen
            keine Werbung. Was wir machen: acht bis zehn Abende im Jahr, und einen
            Shop, über den die Weingüter, die wir schätzen, direkt liefern.
          </p>
          <p style={{ color: "var(--kalk-matt)", fontSize: ".9rem" }}>
            Fragen: post@derriesling.ch
          </p>
        </div>
      </section>

      <Footer nextLabel={nextLabel} />
    </>
  );
}
