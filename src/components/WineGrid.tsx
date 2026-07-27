"use client";

import { useCart } from "./CartProvider";
import { useCatalog } from "./catalog";
import { formatCHF } from "@/lib/price";

export default function WineGrid() {
  const { add } = useCart();
  const { items, isMember } = useCatalog();

  return (
    <div className="regal">
      {items.map((w) => (
        <article className="flasche" key={w.id}>
          <span className="marke">{w.herkunft}</span>
          <span className="winzer">{w.winzer}</span>
          <span className="name">{w.name}</span>
          <div className="preise">
            {isMember ? (
              <>
                <span className="preis gold">{formatCHF(w.payCents)}</span>
                <span className="preis preis--weg">{formatCHF(w.listCents)}</span>
              </>
            ) : (
              <>
                <span className="preis">{formatCHF(w.listCents)}</span>
                <span className="preis preis--gr">
                  Rat {formatCHF(w.payCents)}
                </span>
              </>
            )}
          </div>
          <button onClick={() => add(w.id)}>In den Korb</button>
        </article>
      ))}
    </div>
  );
}
