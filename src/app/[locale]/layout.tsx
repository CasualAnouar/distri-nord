import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontVariables } from "../fonts";
import "../globals.css";
import { isLocale, locales } from "@/i18n/dict";
import { LocaleProvider } from "@/i18n/locale";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Distri Nord · Grossiste à Rabat",
  description: "Boissons, snacks, épicerie et hygiène en lot ou à la pièce. Paiement à la livraison, suivi WhatsApp.",
};

export const viewport: Viewport = { themeColor: "#0b2654" };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale={locale}>
          <StoreProvider>
            <Header />
            {children}
          </StoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
