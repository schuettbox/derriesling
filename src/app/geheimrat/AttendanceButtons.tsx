"use client";

import { useState } from "react";
import { confirmAttendance } from "@/actions/membership";

export default function AttendanceButtons({
  eventId,
  initial,
}: {
  eventId: number;
  initial: "confirmed" | "declined" | null;
}) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function act(decision: "confirm" | "decline") {
    setBusy(true);
    const res = await confirmAttendance(eventId, decision);
    setBusy(false);
    if (res.ok) setStatus(res.status);
  }

  return (
    <div style={{ marginTop: "1.75rem" }}>
      {status === "confirmed" && (
        <p className="erfolg" style={{ marginBottom: "1rem" }}>
          Teilnahme bestätigt. Wir freuen uns — plus eine Begleitung ist
          eingeplant.
        </p>
      )}
      {status === "declined" && (
        <p className="fehler" style={{ marginBottom: "1rem" }}>
          Abgesagt. Bis zur nächsten Sitzung.
        </p>
      )}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <button className="knopf" onClick={() => act("confirm")} disabled={busy}>
          {status === "confirmed" ? "Bestätigt ✓" : "Teilnahme bestätigen"}
        </button>
        <button className="knopf knopf--still" onClick={() => act("decline")} disabled={busy}>
          Absagen
        </button>
      </div>
    </div>
  );
}
