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
            <span className="marke">Lieferung nach Hause</span>
          </div>
          <WineGrid />
          <p className="hinweis">
            Die Weine stammen von Weingütern, die wir schätzen. Zum Start wickeln
            wir den Versand selbst ab und liefern zu Ihnen nach Hause. Mitglieder
            des Geheimrats zahlen den Ratspreis.{" "}
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
