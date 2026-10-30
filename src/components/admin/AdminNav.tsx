"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../Logo";
import { useStore } from "@/lib/store";

const links = [
  { href: "/admin", label: "Commandes" },
  { href: "/admin/produits", label: "Produits & stock" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { orders, resetDemo } = useStore();
  const pending = orders.filter((o) => o.status === "new").length;
  return (
    <header className="sticky top-0 z-30 bg-navy-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold">Vendeur</span>
        </Link>
        <nav className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${pathname === l.href ? "bg-white/15" : "text-white/70 hover:text-white"}`}
            >
              {l.label}
              {l.href === "/admin" && pending > 0 && <span className="ms-2 rounded-full bg-sun-400 px-1.5 text-xs text-navy-950">{pending}</span>}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => confirm("Remettre la démo à zéro ? (commandes et stock d'exemple)") && resetDemo()}
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
