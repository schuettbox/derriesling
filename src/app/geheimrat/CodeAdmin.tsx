"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMembershipCodes } from "@/actions/membership";

export default function CodeAdmin() {
  const router = useRouter();
  const [count, setCount] = useState(10);
  const [note, setNote] = useState("Sitzung VII — Rats-Flaschen");
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createMembershipCodes({ count: Number(count), note });
    setBusy(false);
    if (res.ok) {
      setCodes(res.codes);
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="pforte">
      <span className="marke">Verwaltung</span>
      <h3 style={{ margin: ".6rem 0 1.5rem" }}>Geheimrat-Codes erzeugen</h3>
      <p style={{ color: "var(--kalk-matt)", fontSize: ".88rem", marginTop: "-.5rem" }}>
        Für die Rats-Flaschen. Jeder Code macht genau ein Konto zum Mitglied.
      </p>

      <label className="marke" htmlFor="c-count">Anzahl</label>
      <input
        id="c-count"
        data-mono
        type="number"
        min={1}
        max={200}
        value={count}
        onChange={(e) => setCount(Number(e.target.value))}
      />

      <label className="marke" htmlFor="c-note">Notiz (optional)</label>
      <input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} />

      {error && <p className="formfehler">{error}</p>}
      <button className="knopf" style={{ width: "100%" }} onClick={submit} disabled={busy}>
        {busy ? "Erzeuge …" : "Codes erzeugen"}
      </button>

      {codes && (
        <div style={{ marginTop: "1.25rem" }}>
          <span className="marke">Neue Codes (zum Aufdrucken)</span>
          <pre
            style={{
              marginTop: ".5rem",
              background: "var(--schiefer-tief)",
              border: "var(--rand)",
              padding: "1rem",
              fontFamily: "var(--mono)",
              fontSize: ".8rem",
              color: "var(--mostgold)",
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {codes.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
