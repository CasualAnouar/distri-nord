import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { fontVariables } from "../fonts";
import "../globals.css";
import { isLocale, locales } from "@/i18n/dict";
import { LocaleProvider } from "@/i18n/locale";
import { StoreProvider } from "@/lib/store";
import { getStoreConfig, publicConfig } from "@/lib/server/data";
import { Header } from "@/components/Header";

// Title and description come from the seller's texts (Paramètres), in the page's language.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { settings } = await getStoreConfig();
  const title = `${settings.storeName[locale]} · ${settings.tagline[locale]}`;
  const description = settings.heroText[locale];
  return {
    title,
    description,
    alternates: { canonical: `/${locale}`, languages: { fr: "/fr", ar: "/ar", "x-default": "/fr" } },
    openGraph: { title, description, siteName: settings.storeName[locale], locale: locale === "ar" ? "ar_MA" : "fr_MA", type: "website" },
  };
}

export const viewport: Viewport = { themeColor: "#0b2654" };

// Pages are built once and kept in the cache; the dashboard refreshes them on every change.
export const revalidate = 300;

// Only /fr and /ar exist: any other first segment is a 404 (src/app/global-not-found.tsx).
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const config = publicConfig(await getStoreConfig());
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={fontVariables}>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale={locale}>
          <StoreProvider initialConfig={config}>
            <Header />
            {children}
          </StoreProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
