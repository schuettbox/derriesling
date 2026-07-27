"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartLine = { wineId: number; qty: number };

type CartCtx = {
  lines: CartLine[];
  add: (wineId: number) => void;
  setQty: (wineId: number, qty: number) => void;
  remove: (wineId: number) => void;
  clear: () => void;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "derriesling.korb";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const api = useMemo<CartCtx>(
    () => ({
      lines,
      open,
      setOpen,
      count: lines.reduce((s, l) => s + l.qty, 0),
      add: (wineId) => {
        setLines((prev) => {
          const found = prev.find((l) => l.wineId === wineId);
          if (found)
            return prev.map((l) =>
              l.wineId === wineId ? { ...l, qty: l.qty + 1 } : l
            );
          return [...prev, { wineId, qty: 1 }];
        });
        setOpen(true);
      },
      setQty: (wineId, qty) =>
        setLines((prev) =>
          qty <= 0
            ? prev.filter((l) => l.wineId !== wineId)
            : prev.map((l) => (l.wineId === wineId ? { ...l, qty } : l))
        ),
      remove: (wineId) =>
        setLines((prev) => prev.filter((l) => l.wineId !== wineId)),
      clear: () => setLines([]),
    }),
    [lines, open]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart ausserhalb des CartProviders");
  return ctx;
}
