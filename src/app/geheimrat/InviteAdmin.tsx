"use client";

import { useState } from "react";
import { createInvite } from "@/actions/invite";

export default function InviteAdmin({
  events,
}: {
  events: { id: number; numeral: string; location: string }[];
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? 0);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [plusOnes, setPlusOnes] = useState(1);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setCode(null);
    const res = await createInvite({
      eventId: Number(eventId),
      guestName,
      guestEmail,
      plusOnes: Number(plusOnes),
    });
    setBusy(false);
    if (res.ok) {
      setCode(res.code);
      setGuestName("");
      setGuestEmail("");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="pforte">
      <span className="marke">Verwaltung</span>
      <h3 style={{ margin: ".6rem 0 1.5rem" }}>Einladung erstellen</h3>

      <label className="marke" htmlFor="ev">
        Sitzung
      </label>
      <select
        id="ev"
        value={eventId}
        onChange={(e) => setEventId(Number(e.target.value))}
        style={{
          width: "100%",
          background: "rgba(22,30,40,.9)",
          border: "1px solid rgba(237,234,224,.22)",
          color: "var(--kalk)",
          padding: ".85rem 1rem",
          fontFamily: "var(--mono)",
          fontSize: ".9rem",
          marginBottom: "1.1rem",
        }}
      >
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            Sitzung {e.numeral} — {e.location}
          </option>
        ))}
      </select>

      <label className="marke" htmlFor="gn">
        Name (optional)
      </label>
      <input
        id="gn"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="Eingeladene Person"
      />

      <label className="marke" htmlFor="ge">
        E-Mail (optional — versendet die Einladung)
      </label>
      <input
        id="ge"
        type="email"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
        placeholder="name@domain.ch"
      />

      <label className="marke" htmlFor="po">
        Begleitpersonen
      </label>
      <input
        id="po"
        data-mono
        type="number"
        min={0}
        max={4}
        value={plusOnes}
        onChange={(e) => setPlusOnes(Number(e.target.value))}
      />

      {error && <p className="formfehler">{error}</p>}
      <button
        className="knopf"
        style={{ width: "100%" }}
        onClick={submit}
        disabled={busy}
      >
        {busy ? "Erzeuge …" : "Code erzeugen"}
      </button>

      {code && (
        <p className="erfolg" style={{ marginTop: "1.25rem" }}>
          Neuer Code: <span className="gold">{code}</span>
          {guestEmail ? " — Einladung versendet." : ""}
        </p>
      )}
    </div>
  );
}
