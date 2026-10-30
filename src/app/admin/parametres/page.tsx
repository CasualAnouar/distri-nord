"use client";

import { useState } from "react";
import type { Category } from "@/data/products";
import { slugify, type City, type Localized, type Settings } from "@/lib/config";
import { useStore } from "@/lib/store";
import { normalizePhone } from "@/lib/shop";
import { Card, Field, Toggle, inputCls, num } from "@/components/admin/ui";

function LocalizedInputs({ label, value, onChange, textarea }: { label: string; value: Localized; onChange: (v: Localized) => void; textarea?: boolean }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={`${label} · Français`}>
        <Tag className={inputCls} rows={2} value={value.fr} onChange={(e) => onChange({ ...value, fr: e.target.value })} />
      </Field>
      <Field label={`${label} · العربية`}>
        <Tag className={inputCls} rows={2} dir="rtl" lang="ar" value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} />
      </Field>
    </div>
  );
}

function GeneralSettings() {
  const { settings, saveSettings } = useStore();
  const [s, setS] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const phoneOk = Boolean(normalizePhone(s.sellerPhone)) || s.sellerPhone === "06 00 00 00 00";
  const dirty = JSON.stringify(s) !== JSON.stringify(settings);
  const set = (patch: Partial<Settings>) => {
    setS({ ...s, ...patch });
    setSaved(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!phoneOk || s.minCart <= 0) return;
        saveSettings(s);
        setSaved(true);
      }}
      className="space-y-6"
    >
      <Card title="Boutique" subtitle="Nom et textes affichés en haut de la boutique.">
        <div className="space-y-4">
          <LocalizedInputs label="Nom de la boutique" value={s.storeName} onChange={(storeName) => set({ storeName })} />
          <LocalizedInputs label="Slogan" value={s.tagline} onChange={(tagline) => set({ tagline })} />
          <LocalizedInputs label="Titre d'accueil" value={s.heroTitle} onChange={(heroTitle) => set({ heroTitle })} textarea />
          <LocalizedInputs label="Texte d'accueil" value={s.heroText} onChange={(heroText) => set({ heroText })} textarea />
        </div>
      </Card>

      <Card title="Commandes & WhatsApp" subtitle="Règles de commande et informations envoyées aux clients.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Minimum de commande (DH)" hint="Le panier est bloqué en dessous.">
              <input type="number" min={1} className={inputCls} value={s.minCart} onChange={(e) => set({ minCart: num(e.target.value) })} />
            </Field>
            <Field label="Votre numéro WhatsApp" hint={phoneOk ? "Envoyé au client quand la commande part." : "Numéro marocain invalide (06/07)."}>
              <input type="tel" dir="ltr" className={`${inputCls} ${phoneOk ? "" : "border-danger"}`} value={s.sellerPhone} onChange={(e) => set({ sellerPhone: e.target.value })} />
            </Field>
            <Field label="Alerte stock bas (pièces)" hint="« Stock limité » s'affiche en dessous.">
              <input type="number" min={0} className={inputCls} value={s.lowStockAt} onChange={(e) => set({ lowStockAt: Math.floor(num(e.target.value)) })} />
            </Field>
          </div>
          <LocalizedInputs label="Créneau de livraison annoncé" value={s.deliveryWindow} onChange={(deliveryWindow) => set({ deliveryWindow })} />
          <p className="text-xs text-muted">Exemple de message : « Votre commande est confirmée ✅ Livraison prévue {s.deliveryWindow.fr}. »</p>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
        {saved && !dirty && <span className="text-sm font-semibold text-ok">✓ Enregistré</span>}
        {dirty && (
          <button type="button" onClick={() => setS(settings)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted">
            Annuler
          </button>
        )}
        <button type="submit" disabled={!dirty || !phoneOk} className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          Enregistrer les paramètres
        </button>
      </div>
    </form>
  );
}

function Zones() {
  const { config, saveCity, removeCity, orders } = useStore();
  const add = () => {
    const base = config.cities[0];
    saveCity({ id: slugify("zone"), fr: "Nouvelle zone", ar: "منطقة جديدة", fee: 20, freeFrom: 400, lat: base?.lat ?? 34.0209, lng: base?.lng ?? -6.8416, active: true });
  };
  return (
    <Card
      title="Zones de livraison"
      subtitle="Villes proposées au client, frais et seuil de livraison gratuite."
      action={<button onClick={add} className="rounded-xl bg-sun-400 px-4 py-2 text-sm font-bold text-navy-950">+ Ajouter une zone</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-2 text-start">Ville (FR)</th>
              <th className="pb-2 text-start">Ville (AR)</th>
              <th className="pb-2 text-start">Frais (DH)</th>
              <th className="pb-2 text-start">Gratuit dès (DH)</th>
              <th className="pb-2 text-start">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {config.cities.map((c) => {
              const save = (patch: Partial<City>) => saveCity({ ...c, ...patch });
              const used = orders.some((o) => o.customer.city === c.id);
              return (
                <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                  <td className="py-1.5 pe-2"><input key={c.fr} className={inputCls} defaultValue={c.fr} onBlur={(e) => e.target.value.trim() && save({ fr: e.target.value.trim() })} /></td>
                  <td className="py-1.5 pe-2"><input key={c.ar} className={inputCls} dir="rtl" defaultValue={c.ar} onBlur={(e) => e.target.value.trim() && save({ ar: e.target.value.trim() })} /></td>
                  <td className="py-1.5 pe-2"><input key={`f${c.fee}`} type="number" min={0} className={`${inputCls} w-24`} defaultValue={c.fee} onBlur={(e) => save({ fee: num(e.target.value) })} /></td>
                  <td className="py-1.5 pe-2"><input key={`g${c.freeFrom}`} type="number" min={0} className={`${inputCls} w-24`} defaultValue={c.freeFrom} onBlur={(e) => save({ freeFrom: num(e.target.value) })} /></td>
                  <td className="py-1.5 pe-2"><Toggle checked={c.active} onChange={(active) => save({ active })} label={`Active : ${c.fr}`} /></td>
                  <td className="py-1.5 text-end">
                    <button
                      onClick={() => (used ? alert("Des commandes utilisent cette zone : désactivez-la plutôt.") : confirm(`Supprimer ${c.fr} ?`) && removeCity(c.id))}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-danger"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">Frais à 0 = livraison toujours gratuite. Une zone désactivée n&apos;apparaît plus au moment de la commande.</p>
    </Card>
  );
}

function Categories() {
  const { categories, saveCategory, removeCategory, config } = useStore();
  const add = () => saveCategory({ id: slugify("categorie"), icon: "📦", fr: "Nouvelle catégorie", ar: "فئة جديدة" });
  return (
    <Card
      title="Catégories"
      subtitle="Filtres affichés au-dessus du catalogue."
      action={<button onClick={add} className="rounded-xl bg-sun-400 px-4 py-2 text-sm font-bold text-navy-950">+ Ajouter une catégorie</button>}
    >
      <ul className="grid gap-2 md:grid-cols-2">
        {categories.map((c) => {
          const save = (patch: Partial<Category>) => saveCategory({ ...c, ...patch });
          const count = config.products.filter((p) => p.category === c.id).length;
          return (
            <li key={c.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
              <input key={c.icon} className={`${inputCls} w-12 text-center`} defaultValue={c.icon} onBlur={(e) => e.target.value.trim() && save({ icon: e.target.value.trim() })} aria-label="Icône" />
              <input key={c.fr} className={inputCls} defaultValue={c.fr} onBlur={(e) => e.target.value.trim() && save({ fr: e.target.value.trim() })} aria-label="Nom FR" />
              <input key={c.ar} className={inputCls} dir="rtl" defaultValue={c.ar} onBlur={(e) => e.target.value.trim() && save({ ar: e.target.value.trim() })} aria-label="Nom AR" />
              <span className="shrink-0 text-xs text-muted">{count} prod.</span>
              <button
                onClick={() => (count ? alert("Déplacez d'abord les produits de cette catégorie.") : confirm(`Supprimer ${c.fr} ?`) && removeCategory(c.id))}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-danger"
                aria-label={`Supprimer ${c.fr}`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function AdminSettings() {
  const { ready } = useStore();
  if (!ready) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Paramètres</h1>
        <p className="text-sm text-muted">Tout ce que la boutique affiche et envoie sur WhatsApp se règle ici.</p>
      </div>
      <GeneralSettings />
      <Zones />
      <Categories />
    </div>
  );
}
