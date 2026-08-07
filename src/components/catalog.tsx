"use client";

import { createContext, useContext, type ReactNode } from "react";

export type CatalogItem = {
  id: number;
  winzer: string;
  name: string;
  herkunft: string;
  listCents: number; // Katalogpreis
  payCents: number; // tatsächlich zu zahlender Preis (Ratspreis bei Mitgliedern)
  special: boolean; // «DerRiesling»-Flasche mit Geheimrat-Code
};

const Ctx = createContext<{ items: CatalogItem[]; isMember: boolean }>({
  items: [],
  isMember: false,
});

export function CatalogProvider({
  items,
  isMember,
  children,
}: {
  items: CatalogItem[];
  isMember: boolean;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ items, isMember }}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  return useContext(Ctx);
}
