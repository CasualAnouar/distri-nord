import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";
import { dicts } from "@/i18n/dict";

// Any address that matches no page (the shop has two root layouts, /[locale] and the dashboard,
// so this one page answers for both, in French and Arabic).
export const metadata: Metadata = { title: `404 · ${dicts.fr.notFoundTitle}`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={fontVariables}>
      <body className="grid min-h-dvh place-items-center px-4 antialiased">
        <main className="max-w-md space-y-8 text-center">
          <p className="text-6xl font-extrabold text-navy-900">404</p>
          {(["fr", "ar"] as const).map((l) => (
            <div key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} className={l === "ar" ? "font-[family-name:var(--font-sans-ar)]" : ""}>
              <h1 className="text-xl font-bold">{dicts[l].notFoundTitle}</h1>
              <p className="mt-1 text-muted">{dicts[l].notFoundText}</p>
              <a href={`/${l}`} className="mt-3 inline-block rounded-xl bg-navy-900 px-5 py-2.5 font-bold text-white">
                {dicts[l].backToShop}
              </a>
            </div>
          ))}
        </main>
      </body>
    </html>
  );
}
