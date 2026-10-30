import Link from "next/link";
import { dicts, type Locale } from "@/i18n/dict";

export function Footer({ locale }: { locale: Locale }) {
  const t = dicts[locale];
  return (
    <footer className="mt-8 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <span>{t.footer}</span>
        <Link href="/admin" className="font-semibold text-navy-800 underline-offset-4 hover:underline">{t.seller} →</Link>
      </div>
    </footer>
  );
}
