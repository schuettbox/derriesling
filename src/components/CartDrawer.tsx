"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import { useCatalog } from "./catalog";
import { formatCHF } from "@/lib/price";
import { checkout } from "@/actions/checkout";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, clear, count } = useCart();
  const { items, isMember } = useCatalog();
  const [phase, setPhase] = useState<"cart" | "form" | "done">("cart");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: number; producerCount: number } | null>(
    null
  );
  const [form, setForm] = useState({ name: "", email: "", address: "" });

  const byId = new Map(items.map((i) => [i.id, i]));
  const rows = lines
    .map((l) => ({ line: l, wine: byId.get(l.wineId) }))
    .filter((r) => r.wine);
  const total = rows.reduce((s, r) => s + r.wine!.payCents * r.line.qty, 0);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await checkout({
      lines: lines.map((l) => ({ wineId: l.wineId, qty: l.qty })),
      name: form.name,
      email: form.email,
      address: form.address,
    });
    setBusy(false);
    if (res.ok) {
      setDone({ orderId: res.orderId, producerCount: res.producerCount });
      setPhase("done");
      clear();
    } else {
      setError(res.error);
    }
  }

  function close() {
    setOpen(false);
    // Zustand zurücksetzen, wenn abgeschlossen
    if (phase === "done") {
      setPhase("cart");
      setDone(null);
      setForm({ name: "", email: "", address: "" });
    }
  }

  return (
    <>
      <div
        className={`korb-overlay ${open ? "offen" : ""}`}
        onClick={close}
        aria-hidden={!open}
      />
      <aside
        className={`korb ${open ? "offen" : ""}`}
        aria-label="Warenkorb"
        aria-hidden={!open}
      >
        <button className="schliessen" onClick={close} aria-label="Korb schliessen">
          ×
        </button>

        {phase === "cart" && (
          <>
            <span className="marke">Korb</span>
            <h3 style={{ margin: ".5rem 0 0" }}>Ihre Bestellung</h3>
            {isMember && (
              <p style={{ marginTop: ".5rem" }}>
                <span className="badge">Ratspreis aktiv</span>
              </p>
            )}
            <div className="korb-liste">
              {rows.length === 0 ? (
                <p className="leer">Noch leer.</p>
              ) : (
                rows.map(({ line, wine }) => (
                  <div className="korb-zeile" key={line.wineId}>
                    <span>
                      {wine!.winzer}
                      <br />
                      <span className="marke">{wine!.herkunft}</span>
                      <span className="menge">
                        <button onClick={() => setQty(line.wineId, line.qty - 1)}>
                          −
                        </button>
                        <span>{line.qty}</span>
                        <button onClick={() => setQty(line.wineId, line.qty + 1)}>
                          +
                        </button>
                      </span>
                    </span>
                    <span className="preis">
                      {formatCHF(wine!.payCents * line.qty)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="summe">
              <span>Summe</span>
              <span>{formatCHF(total)}</span>
            </div>
            <p style={{ fontSize: ".8rem", color: "var(--kalk-matt)" }}>
              Der Versand erfolgt getrennt durch jedes Weingut.
            </p>
            <button
              className="knopf"
              style={{ width: "100%" }}
              disabled={count === 0}
              onClick={() => setPhase("form")}
            >
              Zur Kasse
            </button>
          </>
        )}

        {phase === "form" && (
          <>
            <span className="marke">Kasse</span>
            <h3 style={{ margin: ".5rem 0 1.25rem" }}>Lieferung</h3>
            <div className="korb-liste" style={{ overflow: "visible" }}>
              <label className="marke" htmlFor="k-name">
                Name
              </label>
              <input
                id="k-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vor- und Nachname"
              />
              <label className="marke" htmlFor="k-mail">
                E-Mail
              </label>
              <input
                id="k-mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@domain.ch"
              />
              <label className="marke" htmlFor="k-adr">
                Lieferadresse
              </label>
              <textarea
                id="k-adr"
                rows={3}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Strasse, PLZ Ort"
              />
              {error && <p className="formfehler">{error}</p>}
            </div>
            <div className="summe">
              <span>Summe</span>
              <span>{formatCHF(total)}</span>
            </div>
            <div style={{ display: "flex", gap: ".75rem" }}>
              <button
                className="knopf knopf--still"
                style={{ flex: 1 }}
                onClick={() => setPhase("cart")}
                disabled={busy}
              >
                Zurück
              </button>
              <button
                className="knopf"
                style={{ flex: 2 }}
                onClick={submit}
                disabled={busy}
              >
                {busy ? "Sende …" : "Bestellen"}
              </button>
            </div>
          </>
        )}

        {phase === "done" && done && (
          <>
            <span className="marke gold">Bestätigt</span>
            <h3 style={{ margin: ".5rem 0 1rem" }}>Danke.</h3>
            <p>
              Bestellung <b>#{done.orderId}</b> ist eingegangen und wurde an{" "}
              {done.producerCount}{" "}
              {done.producerCount === 1 ? "Weingut" : "Weingüter"} weitergeleitet.
            </p>
            <p style={{ color: "var(--kalk-matt)", fontSize: ".9rem" }}>
              Sie erhalten eine Bestätigung per E-Mail. Der Versand erfolgt direkt
              vom jeweiligen Weingut.
            </p>
            <button
              className="knopf"
              style={{ width: "100%", marginTop: "auto" }}
              onClick={close}
            >
              Schliessen
            </button>
          </>
        )}
      </aside>
    </>
  );
}
