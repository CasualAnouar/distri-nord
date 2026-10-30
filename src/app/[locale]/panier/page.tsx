"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/i18n/locale";
import { useStore } from "@/lib/store";
import { cartTotals, cities, formatDh, linePrice, MIN_CART, normalizePhone, type Customer } from "@/lib/shop";
import { ProductTile } from "@/components/ProductTile";

const empty: Customer = { name: "", phone: "", city: "", district: "", address: "", landmark: "", note: "" };

export default function CartPage() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const { ready, cart, getProduct, setQty, placeOrder } = useStore();
  const [form, setForm] = useState<Customer>(empty);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [viaWa, setViaWa] = useState(false);

  const totals = cartTotals(cart, getProduct, form.city);
  const phone = normalizePhone(form.phone);
  const errors = {
    name: !form.name.trim(),
    phone: !phone,
    city: !form.city,
    district: !viaWa && !form.district.trim(),
    address: !viaWa && !form.address.trim(),
  };
  const valid = !Object.values(errors).some(Boolean) && totals.missing === 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setSending(true);
    const customer = viaWa ? { ...form, district: "", address: "", landmark: "" } : form;
    const order = placeOrder({ ...customer, phone: phone! }, locale);
    router.push(`/${locale}/commande/${order.id}`);
  };

  const field = (key: keyof Customer, label: string, opts: { type?: string; hint?: string; error?: string; optional?: boolean; auto?: string } = {}) => {
    const err = touched && !opts.optional && errors[key as keyof typeof errors];
    return (
      <label className="block">
        <span className="text-sm font-semibold">{label}</span>
        <input
          type={opts.type ?? "text"}
          autoComplete={opts.auto}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-base outline-none focus:border-navy-800 ${err ? "border-danger" : "border-line"}`}
          dir={opts.type === "tel" ? "ltr" : undefined}
        />
        {err ? <span className="mt-1 block text-xs text-danger">{opts.error ?? t.required}</span> : opts.hint ? <span className="mt-1 block text-xs text-muted">{opts.hint}</span> : null}
      </label>
    );
  };

  if (!ready) return <main className="min-h-[60vh]" />;

  if (cart.length === 0 && !sending) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl" aria-hidden>🛒</p>
        <p className="mt-4 text-lg font-semibold">{t.cartEmpty}</p>
        <Link href={`/${locale}`} className="mt-6 inline-block rounded-xl bg-sun-400 px-6 py-3 font-bold text-navy-950">
          {t.continueShopping}
        </Link>
      </main>
    );
  }

  const pct = Math.min(100, (totals.subtotal / MIN_CART) * 100);

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_420px]">
      <section>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-extrabold">{t.cart}</h1>
          <Link href={`/${locale}`} className="text-sm font-semibold text-navy-800">← {t.continueShopping}</Link>
        </div>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {cart.map((l) => {
            const p = getProduct(l.productId);
            if (!p) return null;
            return (
              <li key={`${l.productId}-${l.mode}`} className="flex items-center gap-3 p-3">
                <ProductTile product={p} compact className="w-20 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.size} · {l.mode === "lot" ? t.lotOf(p.lot.qty) : t.unit} · {formatDh(l.mode === "lot" ? p.lot.price : p.unitPrice, locale)}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-line" dir="ltr">
                      <button className="px-2.5 py-1 text-muted" onClick={() => setQty(l.productId, l.mode, l.qty - 1)} aria-label="-">−</button>
                      <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                      <button className="px-2.5 py-1 text-muted" onClick={() => setQty(l.productId, l.mode, l.qty + 1)} aria-label="+">+</button>
                    </div>
                    <button className="text-xs text-danger" onClick={() => setQty(l.productId, l.mode, 0)}>✕</button>
                  </div>
                </div>
                <span className="text-sm font-bold">{formatDh(linePrice(p, l.mode, l.qty), locale)}</span>
              </li>
            );
          })}
        </ul>

        <div className={`mt-4 rounded-2xl p-4 ${totals.missing > 0 ? "bg-sun-400/20" : "bg-ok/10"}`}>
          <p className={`text-sm font-semibold ${totals.missing > 0 ? "text-warn" : "text-ok"}`}>
            {totals.missing > 0 ? t.minLeft(formatDh(totals.missing, locale)) : t.minOk}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${totals.missing > 0 ? "bg-sun-500" : "bg-ok"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="h-fit space-y-4 rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-20">
        <h2 className="text-lg font-extrabold">{t.checkout}</h2>
        {field("name", t.name, { auto: "name" })}
        {field("phone", t.phone, { type: "tel", hint: t.phoneHint, error: t.phoneError, auto: "tel" })}
        <label className="block">
          <span className="text-sm font-semibold">{t.city}</span>
          <select
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={`mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-base ${touched && errors.city ? "border-danger" : "border-line"}`}
          >
            <option value="">{t.chooseCity}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c[locale]} · {c.fee === 0 ? t.free : `${formatDh(c.fee, locale)} (${t.free} ≥ ${formatDh(c.freeFrom, locale)})`}
              </option>
            ))}
          </select>
          {touched && errors.city && <span className="mt-1 block text-xs text-danger">{t.required}</span>}
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-wa/40 bg-wa/5 p-3">
          <input type="checkbox" checked={viaWa} onChange={(e) => setViaWa(e.target.checked)} className="mt-1 size-4 accent-wa" />
          <span>
            <span className="block text-sm font-semibold">{t.addressViaWa}</span>
            {viaWa && <span className="mt-1 block text-xs text-muted">{t.addressViaWaHint}</span>}
          </span>
        </label>
        {!viaWa && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {field("district", t.district)}
              {field("address", t.address, { auto: "street-address" })}
            </div>
            {field("landmark", t.landmark, { hint: t.landmarkHint, optional: true })}
          </>
        )}
        {field("note", t.note, { optional: true })}

        <dl className="space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{t.subtotal}</dt><dd className="font-semibold">{formatDh(totals.subtotal, locale)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">{t.delivery}</dt><dd className="font-semibold">{form.city ? (totals.delivery ? formatDh(totals.delivery, locale) : t.free) : "—"}</dd></div>
          <div className="flex justify-between pt-2 text-base"><dt className="font-bold">{t.total}</dt><dd className="font-extrabold text-navy-900">{formatDh(totals.total, locale)}</dd></div>
        </dl>
        <p className="rounded-xl bg-paper p-3 text-sm">{t.cod}</p>
        <button
          type="submit"
          disabled={totals.missing > 0 || sending}
          className="w-full rounded-xl bg-wa px-4 py-3.5 font-bold text-white shadow hover:brightness-95 disabled:bg-line disabled:text-muted"
        >
          {t.placeOrder} · {formatDh(totals.total, locale)}
        </button>
      </form>
    </main>
  );
}
