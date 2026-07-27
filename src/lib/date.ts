const TAGE = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];
const MONATE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/** «Donnerstag, 24. September, 19:00» */
export function formatEventDate(iso: string | Date | null): string {
  if (!iso) return "Termin folgt";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const tag = TAGE[d.getDay()];
  const monat = MONATE[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${tag}, ${d.getDate()}. ${monat}, ${hh}:${mm}`;
}

/** «24.09.» */
export function formatShort(iso: string | Date | null): string {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.`;
}
