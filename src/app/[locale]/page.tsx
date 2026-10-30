import { notFound } from "next/navigation";
import { dicts, isLocale } from "@/i18n/dict";
import { Catalog } from "@/components/Catalog";
import { CartBar } from "@/components/CartBar";
import { Footer } from "@/components/Footer";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = dicts[locale];
  return (
    <main className="pb-24">
      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-8 md:grid-cols-[1.4fr_1fr] md:items-center md:py-14">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">{t.heroTitle}</h1>
            <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">{t.heroText}</p>
            <a href="#catalogue" className="mt-6 inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950 hover:bg-sun-500">
              {t.heroCta}
            </a>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {t.perks.map((p, i) => (
              <li key={p} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold">
                <span className="mb-2 block text-2xl" aria-hidden>{["💵", "🧾", "💬", "🚚"][i]}</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Catalog />
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-extrabold">{t.howTitle}</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.how.map(([icon, title, text], i) => (
            <li key={title} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-navy-100 text-xl" aria-hidden>{icon}</span>
                <span className="text-xs font-bold text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <Footer locale={locale} />
      <CartBar />
    </main>
  );
}
