import "server-only";

/**
 * Sendet eine E-Mail über Resend, sofern RESEND_API_KEY gesetzt ist.
 * Ohne Key wird die Mail nur geloggt – so läuft die App auch ohne
 * Mail-Provider vollständig durch (Bestellungen/Einladungen liegen
 * in der Datenbank).
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "DerRiesling <post@derriesling.ch>";

  if (!key) {
    console.log(
      `[mail:stub] an=${opts.to} betreff="${opts.subject}"\n${opts.text}`
    );
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      console.error("[mail] Resend-Fehler", res.status, await res.text());
    }
  } catch (err) {
    console.error("[mail] Versand fehlgeschlagen", err);
  }
}
