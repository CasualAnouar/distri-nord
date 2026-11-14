"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatDh, type OrderStatus } from "@/lib/shop";
import { dicts } from "@/i18n/dict";
import { addDays, chartBuckets, computeStats, dayKey, daysBetween, periodRange, previousRange, type PeriodId, type Range, type Row } from "@/lib/stats";

const t = dicts.fr;

const periods: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "yesterday", label: "Hier" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "30 jours" },
  { id: "month", label: "Ce mois" },
  { id: "lastMonth", label: "Mois dernier" },
  { id: "all", label: "Tout" },
  { id: "custom", label: "Dates…" },
];

const statusColor: Record<OrderStatus, string> = {
  new: "bg-sun-400",
  confirmed: "bg-navy-800",
  shipping: "bg-sky-500",
  delivered: "bg-ok",
  cancelled: "bg-danger",
};

const dateFmt = new Intl.DateTimeFormat("fr-MA", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("fr-MA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("fr-MA", { month: "short", year: "2-digit", timeZone: "UTC" });
const showDay = (k: string) => dateFmt.format(new Date(`${k}T12:00:00Z`));
const showMonth = (k: string) => monthFmt.format(new Date(`${k}-15T12:00:00Z`));
const n = (v: number) => new Intl.NumberFormat("fr-MA").format(v);
const dh = (v: number) => formatDh(Math.round(v * 100) / 100);

function rangeLabel(r: Range) {
  if (r.from === r.to) return longDate.format(new Date(`${r.from}T12:00:00Z`));
  return `du ${showDay(r.from)} au ${showDay(r.to)}`;
}

function Change({ now, before }: { now: number; before: number }) {
  if (!before && !now) return null;
  if (!before) return <span className="text-xs font-semibold text-ok">nouveau</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const cls = pct > 0 ? "text-ok" : pct < 0 ? "text-danger" : "text-muted";
  return (
    <span className={`text-xs font-semibold ${cls}`} dir="ltr">
      {pct > 0 ? "▲" : pct < 0 ? "▼" : "="} {Math.abs(pct)} %
    </span>
  );
}

function Tile({ label, value, hint, now, before }: { label: string; value: string; hint?: string; now?: number; before?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-navy-900 sm:text-2xl">{value}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
        {now !== undefined && before !== undefined && <Change now={now} before={before} />}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold sm:text-lg">{title}</h2>
          {subtitle && <p className="text-xs text-muted sm:text-sm">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-muted">Aucune vente sur cette période.</p>;
}

/** One line per item, with a bar showing its share of the biggest one. */
function Bars({ rows, total, by, detail }: { rows: Row[]; total: number; by: "revenue" | "units"; detail: (r: Row) => string }) {
  const max = Math.max(...rows.map((r) => r[by]), 1);
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.key || "none"}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">
              <span className="me-1.5 inline-block w-5 text-muted tabular-nums">{i + 1}.</span>
              {r.icon && <span className="me-1">{r.icon}</span>}
              {r.label}
            </span>
            <span className="shrink-0 font-bold tabular-nums">{by === "revenue" ? dh(r.revenue) : `${n(r.units)} u.`}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-navy-800" style={{ width: `${(r[by] / max) * 100}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {detail(r)}
            {total > 0 && by === "revenue" && ` · ${Math.round((r.revenue / total) * 100)} % des ventes`}
          </p>
        </li>
      ))}
    </ol>
  );
}

function Switch<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg bg-paper p-0.5 text-xs font-semibold">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} className={`rounded-md px-2.5 py-1.5 ${value === v ? "bg-white text-navy-900 shadow-sm" : "text-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function AdminStats() {
  const { ready, orders, config } = useStore();
  const [period, setPeriod] = useState<PeriodId>("30d");
  const today = dayKey(new Date());
  const [custom, setCustom] = useState<Range>({ from: addDays(today, -6), to: today });
  const [productsBy, setProductsBy] = useState<"revenue" | "units">("revenue");
  const [allProducts, setAllProducts] = useState(false);

  const range = useMemo(() => {
    if (period !== "custom") return periodRange(period, orders);
    return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
  }, [period, custom, orders]);
  const s = useMemo(() => computeStats(orders, range, config), [orders, range, config]);
  const before = useMemo(() => computeStats(orders, previousRange(range), config), [orders, range, config]);

  if (!ready) return null;

  const buckets = chartBuckets(s.byDay);
  const monthly = buckets.length > 0 && buckets[0].key.length === 7;
  const peak = Math.max(...buckets.map((b) => b.revenue), 1);
  const best = buckets.reduce<(typeof buckets)[number] | null>((m, b) => (b.revenue > (m?.revenue ?? 0) ? b : m), null);
  const products = productsBy === "units" ? [...s.byProduct].sort((a, b) => b.units - a.units || b.revenue - a.revenue) : s.byProduct;
  const shownProducts = allProducts ? products : products.slice(0, 10);
  const statusOrders = Object.values(s.byStatus).reduce((a, v) => a + v.orders, 0);
  const days = daysBetween(range.from, range.to) + 1;
  const compareHint = period === "all" ? undefined : `vs ${days === 1 ? "la veille" : `les ${days} jours d'avant`}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Statistiques</h1>
        <p className="text-sm text-muted first-letter:uppercase">{rangeLabel(range)}</p>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${period === p.id ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Du</span>
            <input type="date" value={custom.from} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} className="rounded-lg border border-line px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Au</span>
            <input type="date" value={custom.to} max={today} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} className="rounded-lg border border-line px-3 py-2" />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Ventes" value={dh(s.sales)} now={s.sales} before={period === "all" ? undefined : before.sales} hint={compareHint} />
        <Tile label="Commandes vendues" value={n(s.orders)} now={s.orders} before={period === "all" ? undefined : before.orders} />
        <Tile label="Panier moyen" value={dh(s.basket)} now={s.basket} before={period === "all" ? undefined : before.basket} />
        <Tile label="Unités vendues" value={n(s.units)} hint="pièces, lots comptés à l'unité" />
        <Tile label="Encaissé (livrées)" value={dh(s.collected)} hint={`${s.byStatus.delivered.orders} commande${s.byStatus.delivered.orders > 1 ? "s" : ""}`} />
        <Tile label="À encaisser" value={dh(s.pending)} hint="confirmées ou en livraison" />
        <Tile label="Produits (hors livraison)" value={dh(s.products)} />
        <Tile label="Frais de livraison" value={dh(s.delivery)} />
      </div>
      <p className="-mt-2 text-xs text-muted">
        Comptées comme ventes : les commandes confirmées, en livraison et livrées. Les commandes annulées et celles pas encore confirmées ne comptent pas.
      </p>

      <Section
        title={monthly ? "Ventes par mois" : "Ventes par jour"}
        subtitle={best ? `Meilleur ${monthly ? "mois" : "jour"} : ${monthly ? showMonth(best.key) : showDay(best.key)}, ${dh(best.revenue)} (${best.orders} cmd)` : undefined}
      >
        {s.orders === 0 ? (
          <Empty />
        ) : (
          <div dir="ltr">
            <div className="flex h-40 items-end gap-px sm:gap-1">
              {buckets.map((b) => (
                <div key={b.key} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${monthly ? showMonth(b.key) : showDay(b.key)} : ${dh(b.revenue)} · ${b.orders} commande(s)`}>
                  <div className={`w-full rounded-t ${b.revenue ? "bg-navy-800 group-hover:bg-sun-500" : "bg-line"}`} style={{ height: b.revenue ? `${Math.max(4, (b.revenue / peak) * 100)}%` : "2px" }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-muted">
              <span>{monthly ? showMonth(buckets[0].key) : showDay(buckets[0].key)}</span>
              {buckets.length > 2 && <span>{monthly ? showMonth(buckets[Math.floor(buckets.length / 2)].key) : showDay(buckets[Math.floor(buckets.length / 2)].key)}</span>}
              {buckets.length > 1 && <span>{monthly ? showMonth(buckets.at(-1)!.key) : showDay(buckets.at(-1)!.key)}</span>}
            </div>
            <p className="mt-1 text-end text-[11px] text-muted">Plus haute barre : {dh(peak)}</p>
          </div>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title="Produits les plus vendus"
          action={
            <Switch
              value={productsBy}
              onChange={setProductsBy}
              options={[
                ["revenue", "Par montant"],
                ["units", "Par quantité"],
              ]}
            />
          }
        >
          {products.length === 0 ? (
            <Empty />
          ) : (
            <>
              <Bars
                rows={shownProducts}
                total={s.sales - s.delivery}
                by={productsBy}
                detail={(r) =>
                  [productsBy === "revenue" ? `${n(r.units)} u.` : dh(r.revenue), r.lots ? `${n(r.lots)} lot${r.lots > 1 ? "s" : ""}` : "", r.pieces ? `${n(r.pieces)} à la pièce` : "", `${r.orders} cmd`]
                    .filter(Boolean)
                    .join(" · ")
                }
              />
              {products.length > 10 && (
                <button onClick={() => setAllProducts(!allProducts)} className="mt-4 w-full rounded-lg bg-paper py-2 text-sm font-semibold text-navy-800">
                  {allProducts ? "Voir le top 10" : `Voir les ${products.length} produits`}
                </button>
              )}
            </>
          )}
        </Section>

        <div className="space-y-5">
          <Section title="Par catégorie">
            {s.byCategory.length === 0 ? <Empty /> : <Bars rows={s.byCategory} total={s.sales - s.delivery} by="revenue" detail={(r) => `${n(r.units)} u. · ${r.orders} cmd`} />}
          </Section>

          <Section title="Par zone de livraison">
            {s.byZone.length === 0 ? <Empty /> : <Bars rows={s.byZone} total={s.sales} by="revenue" detail={(r) => `${r.orders} cmd · panier moyen ${dh(r.revenue / r.orders)}`} />}
          </Section>
        </div>
      </div>

      <Section title="Toutes les commandes de la période" subtitle={`${statusOrders} commande${statusOrders > 1 ? "s" : ""} reçue${statusOrders > 1 ? "s" : ""}, par étape`}>
        {statusOrders === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucune commande sur cette période.</p>
        ) : (
          <>
            <div className="flex h-3 overflow-hidden rounded-full bg-paper">
              {(Object.keys(s.byStatus) as OrderStatus[]).map((k) =>
                s.byStatus[k].orders ? <div key={k} className={statusColor[k]} style={{ width: `${(s.byStatus[k].orders / statusOrders) * 100}%` }} title={t.status[k]} /> : null,
              )}
            </div>
            <ul className="mt-3 divide-y divide-line text-sm">
              {(Object.keys(s.byStatus) as OrderStatus[]).map((k) => (
                <li key={k} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${statusColor[k]}`} />
                    {t.status[k]}
                  </span>
                  <span className="tabular-nums">
                    <b>{s.byStatus[k].orders}</b> <span className="text-muted">· {dh(s.byStatus[k].amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
            {s.byStatus.cancelled.orders > 0 && (
              <p className="mt-2 text-xs text-muted">
                Taux d&apos;annulation : {Math.round((s.byStatus.cancelled.orders / statusOrders) * 100)} %
              </p>
            )}
          </>
        )}
      </Section>
    </div>
  );
}
