"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { useStore } from "@/lib/store";

// The dashboard lives under a secret prefix (see src/proxy.ts); read it back from the URL so the
// secret never ships in the bundle.
const links = [
  { href: "", label: "Commandes" },
  { href: "/produits", label: "Produits & stock" },
  { href: "/parametres", label: "Paramètres" },
];

export function AdminNav() {
  const pathname = usePathname();
  const base = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const { orders, resetDemo, settings } = useStore();
  const pending = orders.filter((o) => o.status === "new").length;
  return (
    <header className="sticky top-0 z-30 bg-navy-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={base} className="flex items-center gap-2">
          <Logo name={settings.storeName.fr} />
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold">Gestion</span>
        </Link>
        <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
          {links.map((l) => (
            <Link
              key={l.href}
              href={base + l.href}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${pathname === base + l.href ? "bg-white/15" : "text-white/70 hover:text-white"}`}
            >
              {l.label}
              {l.href === "" && pending > 0 && <span className="ms-2 rounded-full bg-sun-400 px-1.5 text-xs text-navy-950">{pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => confirm("Remettre la démo à zéro ? Les commandes, produits, zones et paramètres reviennent aux exemples.") && resetDemo()}
            className="rounded-lg px-3 py-2 text-white/60 hover:text-white"
          >
            ↺ Réinitialiser
          </button>
          <Link href="/fr" className="rounded-lg bg-sun-400 px-3 py-2 font-bold text-navy-950">Voir la boutique</Link>
        </div>
      </div>
    </header>
  );
}
