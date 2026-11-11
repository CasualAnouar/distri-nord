import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";
import { LocaleProvider } from "@/i18n/locale";
import { StoreProvider } from "@/lib/store";
import { AdminNav } from "@/components/admin/AdminNav";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { adminAuthorized } from "@/lib/admin-auth";
import { getFreshConfig, listOrders } from "@/lib/server/data";

export const metadata: Metadata = { title: "Gestion", robots: { index: false, follow: false } };

// Always read straight from the database: the seller must see the current orders and stock.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The proxy already asked for the login; checking again here keeps the data safe if it is bypassed.
  if (!adminAuthorized((await headers()).get("authorization"))) notFound();
  const [config, orders] = await Promise.all([getFreshConfig(), listOrders()]);
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale="fr">
          <StoreProvider initialConfig={config} initialOrders={orders}>
            <AdminNav />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </StoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
