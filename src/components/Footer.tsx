export default function Footer({ nextLabel }: { nextLabel?: string }) {
  return (
    <footer className="site">
      <div className="wrap fusszeile">
        <span>DerRiesling · Basel</span>
        <span className="marke">{nextLabel ?? "Sitzung folgt · Ort folgt"}</span>
        <span>Impressum · AGB · Datenschutz · Jugendschutz ab 18</span>
      </div>
    </footer>
  );
}
