import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { CatalogProvider } from "@/components/catalog";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import SetupGate from "@/components/SetupGate";
import { getCurrentMember } from "@/lib/session";
import { getCatalog } from "@/lib/queries";
import type { CatalogItem } from "@/components/catalog";
import type { Member } from "@/lib/schema";

export const metadata: Metadata = {
  title: "DerRiesling — Eine Hommage",
  description:
    "Eine Hommage an Riesling. Sitzungen an Orten, die etwas zu erzählen haben, und ein Shop, über den die Weingüter direkt liefern.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let member: Member | null = null;
  let catalog: CatalogItem[] = [];
  let dbError: string | null = null;

  try {
    member = await getCurrentMember();
    catalog = await getCatalog(member?.discountPct ?? null);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  // Datenbank noch nicht bereit → Einrichtungs-Seite statt Absturz
  if (dbError) {
    return (
      <html lang="de-CH">
        <body>
          <SetupGate initialError={dbError} />
        </body>
      </html>
    );
  }

  return (
    <html lang="de-CH">
      <body>
        <CatalogProvider items={catalog} isMember={!!member}>
          <CartProvider>
            <Header isMember={!!member} />
            {children}
            <CartDrawer />
          </CartProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
