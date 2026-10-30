import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";
import { LocaleProvider } from "@/i18n/locale";
import { StoreProvider } from "@/lib/store";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: "Espace vendeur · Distri Nord", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale="fr">
          <StoreProvider>
            <AdminNav />
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          </StoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
