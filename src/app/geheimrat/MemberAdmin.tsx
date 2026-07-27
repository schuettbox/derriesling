"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMember } from "@/actions/admin";

export default function MemberAdmin() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [discount, setDiscount] = useState(15);
  const [withMail, setWithMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string; emailed: boolean } | null>(
    null
  );

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await createMember({
      name,
      email,
      discountPct: Number(discount),
      sendMailToMember: withMail,
    });
    setBusy(false);
    if (res.ok) {
      setResult({ email: res.email, password: res.password, emailed: res.emailed });
      setName("");
      setEmail("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="pforte">
      <span className="marke">Verwaltung</span>
      <h3 style={{ margin: ".6rem 0 1.5rem" }}>Mitglied aufnehmen</h3>

      <label className="marke" htmlFor="m-name">
        Name
      </label>
      <input
        id="m-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Vor- und Nachname"
      />

      <label className="marke" htmlFor="m-mail">
        E-Mail
      </label>
      <input
        id="m-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@domain.ch"
      />

      <label className="marke" htmlFor="m-disc">
        Ratspreis-Rabatt (%)
      </label>
      <input
        id="m-disc"
        data-mono
        type="number"
        min={0}
        max={90}
        value={discount}
        onChange={(e) => setDiscount(Number(e.target.value))}
      />

      <label style={{ display: "flex", gap: ".6rem", alignItems: "center", marginBottom: "1.1rem" }}>
        <input
          type="checkbox"
          checked={withMail}
          onChange={(e) => setWithMail(e.target.checked)}
          style={{ width: "auto", margin: 0 }}
        />
        <span style={{ fontSize: ".85rem", color: "var(--kalk-matt)" }}>
          Zugangsdaten per E-Mail schicken
        </span>
      </label>

      {error && <p className="formfehler">{error}</p>}
      <button className="knopf" style={{ width: "100%" }} onClick={submit} disabled={busy}>
        {busy ? "Nehme auf …" : "In den Rat aufnehmen"}
      </button>

      {result && (
        <div className="erfolg" style={{ marginTop: "1.25rem" }}>
          Aufgenommen: <span className="gold">{result.email}</span>
          <br />
          Passwort: <span className="gold">{result.password}</span>
          <br />
          <span style={{ color: "var(--kalk-matt)" }}>
            {result.emailed
              ? "Zugangsdaten wurden per E-Mail verschickt."
              : "Bitte diese Zugangsdaten sicher weitergeben."}
          </span>
        </div>
      )}
    </div>
  );
}
