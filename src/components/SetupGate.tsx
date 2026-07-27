"use client";

import { useEffect, useState } from "react";

type SetupResponse = {
  ok: boolean;
  seeded?: boolean;
  message?: string;
  error?: string;
  diag?: Record<string, unknown>;
};

/**
 * Wird angezeigt, wenn die Datenbank noch nicht bereit ist. Ruft einmalig
 * /api/setup auf (legt Tabellen + Startdaten an) und zeigt das Ergebnis –
 * inklusive Klartext-Fehler, falls die Verbindung nicht stimmt.
 */
export default function SetupGate({ initialError }: { initialError?: string }) {
  const [state, setState] = useState<"running" | "done" | "failed">("running");
  const [res, setRes] = useState<SetupResponse | null>(null);

  async function run() {
    setState("running");
    try {
      const r = await fetch("/api/setup", { cache: "no-store" });
      const data: SetupResponse = await r.json();
      setRes(data);
      setState(data.ok ? "done" : "failed");
    } catch (e) {
      setRes({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setState("failed");
    }
  }

  useEffect(() => {
    run();
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily:
          '"Optima","Gill Sans",system-ui,sans-serif',
        background: "#161E28",
        color: "#EDEAE0",
      }}
    >
      <div style={{ maxWidth: "36rem", width: "100%" }}>
        <p
          style={{
            fontFamily: "ui-monospace,Menlo,monospace",
            fontSize: ".7rem",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "#A9AEA8",
          }}
        >
          DerRiesling · Einrichtung
        </p>

        {state === "running" && (
          <>
            <h1
              style={{
                fontFamily: '"Hoefler Text",Georgia,serif',
                fontWeight: 400,
                fontSize: "2rem",
                margin: ".4rem 0 1rem",
              }}
            >
              Datenbank wird eingerichtet …
            </h1>
            <p style={{ color: "#C9C6BD" }}>Einen Moment bitte.</p>
          </>
        )}

        {state === "done" && (
          <>
            <h1
              style={{
                fontFamily: '"Hoefler Text",Georgia,serif',
                fontWeight: 400,
                fontSize: "2rem",
                margin: ".4rem 0 1rem",
                color: "#E4D08A",
              }}
            >
              Fertig eingerichtet.
            </h1>
            <p style={{ color: "#C9C6BD" }}>
              {res?.seeded
                ? "Weine, Sitzungen und Zugänge wurden angelegt."
                : "Die Datenbank war bereits eingerichtet."}
            </p>
            <button
              onClick={() => location.reload()}
              style={buttonStyle}
            >
              Zur Seite
            </button>
          </>
        )}

        {state === "failed" && (
          <>
            <h1
              style={{
                fontFamily: '"Hoefler Text",Georgia,serif',
                fontWeight: 400,
                fontSize: "2rem",
                margin: ".4rem 0 1rem",
                color: "#E08A7A",
              }}
            >
              Einrichtung noch nicht möglich
            </h1>
            <p style={{ color: "#C9C6BD" }}>
              Die Datenbank-Verbindung funktioniert noch nicht. Fehlermeldung:
            </p>
            <pre
              style={{
                background: "#0F151C",
                border: "1px solid rgba(237,234,224,.14)",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: ".8rem",
                color: "#E4D08A",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {res?.error ?? initialError ?? "Unbekannter Fehler"}
              {res?.diag ? "\n\n" + JSON.stringify(res.diag, null, 2) : ""}
            </pre>
            <p style={{ color: "#A9AEA8", fontSize: ".9rem" }}>
              Meist stimmt die Umgebungsvariable <code>DATABASE_URL</code> in
              Vercel nicht. Dieser Text hilft bei der Korrektur.
            </p>
            <button onClick={run} style={buttonStyle}>
              Nochmals versuchen
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  marginTop: "1.5rem",
  display: "inline-block",
  padding: ".85rem 1.6rem",
  border: "1px solid #E4D08A",
  color: "#E4D08A",
  background: "none",
  fontFamily: "ui-monospace,Menlo,monospace",
  fontSize: ".7rem",
  letterSpacing: ".2em",
  textTransform: "uppercase",
  cursor: "pointer",
};
