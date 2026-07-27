/** Anzeige-Helfer für Preise (in Rappen gespeichert). */
export function formatCHF(cents: number): string {
  const chf = cents / 100;
  // Ganze Frankenbeträge ohne Nachkommastellen, sonst mit
  if (Number.isInteger(chf)) return `CHF ${chf}.—`;
  return `CHF ${chf.toFixed(2)}`;
}

/** Ratspreis (Mitgliederpreis) aus Katalogpreis und Rabatt. */
export function memberPriceCents(priceCents: number, discountPct: number): number {
  return Math.round((priceCents * (100 - discountPct)) / 100);
}
