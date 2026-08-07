"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemMembershipCode } from "@/actions/membership";

export default function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await redeemMembershipCode(code);
    setBusy(false);
    if (res.ok) {
      setDone(res.message);
      setCode("");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="pforte">
      <span className="marke">Geheimrat freischalten</span>
      <h3 style={{ margin: ".6rem 0 1rem" }}>Code einlösen</h3>
      <p style={{ color: "var(--kalk-matt)", fontSize: ".92rem" }}>
        Auf jeder Rats-Flasche steht ein einmaliger Code. Trag ihn hier ein, um
        Geheimrat-Mitglied zu werden — mit Rabatt im Shop und direkter
        Teilnahme an den Sitzungen.
      </p>
      <label className="marke" htmlFor="mc" style={{ marginTop: "1rem" }}>
        Code
      </label>
      <input
        id="mc"
        data-mono
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="RAT-XXX-XXX"
        style={{ textTransform: "uppercase" }}
        autoComplete="off"
      />
      {error && <p className="formfehler">{error}</p>}
      {done && <p className="erfolg" style={{ marginBottom: "1rem" }}>{done}</p>}
      <button className="knopf" style={{ width: "100%" }} onClick={submit} disabled={busy}>
        {busy ? "Prüfe …" : "Einlösen"}
      </button>
    </div>
  );
}
