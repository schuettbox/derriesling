"use client";

import { useState } from "react";
import { confirmAttendance, type MyAttendance } from "@/actions/membership";
import { formatCHF } from "@/lib/price";

export default function AttendanceButtons({
  eventId,
  initial,
  includedApplies,
  ticketCents,
}: {
  eventId: number;
  initial: MyAttendance;
  includedApplies: boolean;
  ticketCents: number;
}) {
  const [att, setAtt] = useState<MyAttendance>(initial);
  const [companion, setCompanion] = useState(initial?.companion ?? false);
  const [busy, setBusy] = useState(false);

  // Vorschau des zu zahlenden Betrags
  const ownCost = includedApplies ? 0 : ticketCents;
  const companionCost = companion ? ticketCents : 0;
  const preview = ownCost + companionCost;

  async function act(decision: "confirm" | "decline") {
    setBusy(true);
    const res = await confirmAttendance(eventId, decision, companion);
    setBusy(false);
    if (res.ok) {
      setAtt(
        decision === "confirm"
          ? { status: "confirmed", included: includedApplies, companion, amountCents: res.amountCents }
          : { status: "declined", included: false, companion: false, amountCents: 0 }
      );
    }
  }

  const confirmed = att?.status === "confirmed";

  return (
    <div style={{ marginTop: "1.75rem" }}>
      {/* Konditionen */}
      <div style={{ borderTop: "1px solid var(--mostgold)", paddingTop: "1rem", marginBottom: "1rem" }}>
        <div className="zeile" style={{ borderTop: "none", paddingTop: 0 }}>
          <dt>Zutritt</dt>
          <dd>
            {includedApplies ? (
              <>
                <span className="gold">inbegriffen</span>{" "}
                <span style={{ color: "var(--kalk-matt)", fontSize: ".85rem" }}>
                  (Ihre mit der Mitgliedschaft enthaltene Teilnahme)
                </span>
              </>
            ) : (
              <>{formatCHF(ticketCents)} pro Person</>
            )}
          </dd>
        </div>
        <label
          className="zeile"
          style={{ cursor: "pointer", alignItems: "center" }}
        >
          <dt>Begleitung</dt>
          <dd style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
            <input
              type="checkbox"
              checked={companion}
              disabled={busy}
              onChange={(e) => setCompanion(e.target.checked)}
              style={{ width: "auto", margin: 0 }}
            />
            <span>1 Person dazubuchen (+{formatCHF(ticketCents)})</span>
          </dd>
        </label>
        <div className="zeile">
          <dt>Zu zahlen</dt>
          <dd className="gold" style={{ fontFamily: "var(--mono)" }}>
            {preview === 0 ? "CHF 0.— (inbegriffen)" : formatCHF(preview)}
          </dd>
        </div>
      </div>

      {confirmed && (
        <p className="erfolg" style={{ marginBottom: "1rem" }}>
          Teilnahme bestätigt
          {att?.companion ? " · mit Begleitung" : ""}
          {att && att.amountCents > 0
            ? ` · offen: ${formatCHF(att.amountCents)}`
            : " · inbegriffen"}
          .
        </p>
      )}
      {att?.status === "declined" && (
        <p className="fehler" style={{ marginBottom: "1rem" }}>
          Abgesagt. Bis zur nächsten Sitzung.
        </p>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="knopf" onClick={() => act("confirm")} disabled={busy}>
          {confirmed ? "Bestätigt ✓ · aktualisieren" : "Teilnahme bestätigen"}
        </button>
        <button className="knopf knopf--still" onClick={() => act("decline")} disabled={busy}>
          Absagen
        </button>
      </div>
      {preview > 0 && (
        <p style={{ marginTop: ".9rem", fontSize: ".8rem", color: "var(--kalk-matt)" }}>
          Der Betrag wird derzeit erfasst; die Bezahlung folgt (Rechnung bzw.
          Kartenzahlung in Kürze).
        </p>
      )}
    </div>
  );
}
