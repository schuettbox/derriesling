import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { CatalogProvider } from "@/components/catalog";
import Header from "@/components/Header";
import CartDrawer from "@/components/CartDrawer";
import { getCurrentMember } from "@/lib/session";
import { getCatalog } from "@/lib/queries";

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
  const member = await getCurrentMember();
  const catalog = await getCatalog(member?.discountPct ?? null);

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
