"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export default function Header() {
  const { count, setOpen } = useCart();
  return (
    <header className="site">
      <div className="kopfzeile">
        <Link href="/" className="wortmarke">
          Der<span>Riesling</span>
        </Link>
        <nav className="site">
          <Link href="/shop" className="nav-weit">
            Weine
          </Link>
          <Link href="/geheimrat" className="nav-weit">
            Geheimrat
          </Link>
          <Link href="/#sitzungen">Sitzungen</Link>
          <button className="korb-knopf" onClick={() => setOpen(true)}>
            Korb <span>{count}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
