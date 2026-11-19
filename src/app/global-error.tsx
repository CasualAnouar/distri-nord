"use client";

import "./globals.css";
import { dicts } from "@/i18n/dict";

// Last resort when a root layout itself fails (it replaces the whole page, so it brings its own html).
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="fr">
      <body className="grid min-h-dvh place-items-center px-4">
        <title>{dicts.fr.errorTitle}</title>
        <main className="max-w-md space-y-6 text-center">
          {(["fr", "ar"] as const).map((l) => (
            <div key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"}>
              <h1 className="text-xl font-bold">{dicts[l].errorTitle}</h1>
              <p className="mt-1 text-muted">{dicts[l].errorText}</p>
            </div>
          ))}
          <button onClick={() => retry()} className="rounded-xl bg-navy-900 px-5 py-2.5 font-bold text-white">
            {dicts.fr.retry} · {dicts.ar.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
