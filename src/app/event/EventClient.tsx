"use client";

import { useState } from "react";
import { verifyInvite, respondInvite, type InviteView } from "@/actions/invite";
import { formatEventDate } from "@/lib/date";

export default function EventClient() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [busy, setBusy] = useState(false);

  async function pruefen() {
    setBusy(true);
    setError(null);
    const res = await verifyInvite(code);
    setBusy(false);
    if (res.ok) {
      setInvite(res.invite);
    } else {
      setInvite(null);
      setError(res.error);
    }
  }

  async function antwort(decision: "accept" | "decline") {
    if (!invite) return;
    setBusy(true);
    const res = await respondInvite(invite.code, decision);
    setBusy(false);
    if (res.ok) {
      setInvite({ ...invite, status: res.status });
    }
  }

  return (
    <>
      <div style={{ maxWidth: "420px", marginTop: "2rem" }}>
        <label className="marke" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          data-mono
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pruefen()}
          placeholder="RSL-VII-0000"
          style={{ textTransform: "uppercase" }}
          autoComplete="off"
        />
        {error && <p className="fehler">{error}</p>}
        <button
          className="knopf"
          onClick={pruefen}
          disabled={busy}
          style={{ marginTop: ".5rem" }}
        >
          {busy ? "Prüfe …" : "Prüfen"}
        </button>
        <p className="probecodes">
          Zum Ausprobieren: RSL-VII-4820 · RSL-VII-1174
        </p>
      </div>

      {invite && (
        <div className="karte" id="karte">
          <span className="marke gold">
            Sitzung {invite.event.numeral} · Persönlich
          </span>
          <h3>
            {invite.status === "declined"
              ? "Schade."
              : "Sie sind eingeladen."}
          </h3>
          <dl style={{ margin: 0 }}>
            <div className="zeile">
              <dt>Ort</dt>
              <dd>
                {(invite.event.address ?? invite.event.location)
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
                {formatEventDate(invite.event.startsAt)}
                {invite.event.admissionNote && (
                  <>
                    <br />
                    <span
                      style={{
                        color: "var(--kalk-matt)",
                        fontSize: ".9rem",
                      }}
                    >
                      {invite.event.admissionNote}
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div className="zeile">
              <dt>Begleitung</dt>
              <dd>
                {invite.plusOnes} {invite.plusOnes === 1 ? "Person" : "Personen"}
              </dd>
            </div>
            {invite.event.speech && (
              <div className="zeile">
                <dt>Wort</dt>
                <dd>{invite.event.speech}</dd>
              </div>
            )}
            {invite.event.wineNote && (
              <div className="zeile">
                <dt>Wein</dt>
                <dd>{invite.event.wineNote}</dd>
              </div>
            )}
          </dl>

          {invite.status === "open" && (
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
                marginTop: "1.75rem",
              }}
            >
              <button
                className="knopf"
                onClick={() => antwort("accept")}
                disabled={busy}
              >
                Zusagen
              </button>
              <button
                className="knopf knopf--still"
                onClick={() => antwort("decline")}
                disabled={busy}
              >
                Absagen
              </button>
            </div>
          )}
          {invite.status === "accepted" && (
            <p className="erfolg" style={{ marginTop: "1.5rem" }}>
              Zugesagt. Wir freuen uns. Bringen Sie diesen Code am Tor mit.
            </p>
          )}
          {invite.status === "declined" && (
            <p className="fehler" style={{ marginTop: "1.5rem" }}>
              Abgesagt. Der Platz geht an jemand anderen — bis zum nächsten Mal.
            </p>
          )}

          <p className="siegel" id="siegel">
            Code {invite.code} · gültig für eine Sitzung · nicht übertragbar
          </p>
        </div>
      )}
    </>
  );
}
