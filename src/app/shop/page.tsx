import WineGrid from "@/components/WineGrid";
import Footer from "@/components/Footer";
import Link from "next/link";
import { getCurrentMember } from "@/lib/session";

export const metadata = { title: "Die Weine — DerRiesling" };

export default async function ShopPage() {
  const member = await getCurrentMember();
  return (
    <>
      <section className="zone" id="weine" style={{ borderTop: "none" }}>
        <div className="wrap">
          <div className="kopf">
            <h2>Die Weine</h2>
            <span className="marke">Versand direkt vom Weingut</span>
          </div>
          <WineGrid />
          <p className="hinweis">
            DerRiesling ist Vermittler, nicht Händler. Jede Bestellung geht an das
            jeweilige Weingut, das die Flaschen selbst versendet — auch wenn Sie
            bei mehreren Betrieben bestellen. Mitglieder des Geheimrats zahlen den
            Ratspreis.{" "}
            {member ? (
              <span className="gold">Ihr Ratspreis ist aktiv.</span>
            ) : (
              <Link href="/geheimrat" className="gold">
                Zum Geheimrat →
              </Link>
            )}
          </p>
        </div>
      </section>
      <Footer />
    </>
  );
}
