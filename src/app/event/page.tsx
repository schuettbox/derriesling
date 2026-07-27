import EventClient from "./EventClient";
import Footer from "@/components/Footer";

export const metadata = { title: "Einladung bestätigen — DerRiesling" };

export default function EventPage() {
  return (
    <>
      <section className="zone" id="einladung" style={{ borderTop: "none" }}>
        <div className="wrap">
          <div className="kopf">
            <h2>Einladung bestätigen</h2>
            <span className="marke">derriesling.ch/event</span>
          </div>
          <p className="lead">
            Sie haben einen Code erhalten. Er gilt für eine Person und eine
            Begleitung, und nur für diese eine Sitzung. Ort und Zeit erscheinen
            erst, wenn der Code stimmt.
          </p>
          <EventClient />
        </div>
      </section>
      <Footer />
    </>
  );
}
