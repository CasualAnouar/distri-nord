"use client";

import { useState } from "react";
import type { Product } from "@/data/products";
import { useStore } from "@/lib/store";
import { formatDh } from "@/lib/shop";
import { Card } from "@/components/admin/ui";
import {
  boxesCsv,
  categoriesCsv,
  download,
  fullJson,
  orderLinesCsv,
  ordersCsv,
  priceChanges,
  productsCsv,
  stamp,
  zonesCsv,
  type PriceChange,
} from "@/lib/export";

const fieldLabel: Record<PriceChange["field"], string> = { unitPrice: "Prix pièce", lotQty: "Pièces par lot", lotPrice: "Prix lot", stock: "Stock" };

function PriceImport() {
  const { config, updateProduct } = useStore();
  const [result, setResult] = useState<ReturnType<typeof priceChanges> | null>(null);
  const [done, setDone] = useState(0);

  const apply = () => {
    if (!result) return;
    const byProduct = new Map<string, PriceChange[]>();
    for (const ch of result.changes) byProduct.set(ch.id, [...(byProduct.get(ch.id) ?? []), ch]);
    for (const [id, list] of byProduct) {
      const p = config.products.find((x) => x.id === id);
      if (!p) continue;
      const patch: Partial<Product> = {};
      const lot = { ...p.lot };
      for (const ch of list) {
        if (ch.field === "unitPrice") patch.unitPrice = ch.to;
        if (ch.field === "stock") patch.stock = Math.floor(ch.to);
        if (ch.field === "lotPrice") lot.price = ch.to;
        if (ch.field === "lotQty") lot.qty = Math.max(2, Math.floor(ch.to));
      }
      if (lot.price !== p.lot.price || lot.qty !== p.lot.qty) patch.lot = lot;
      updateProduct(id, patch);
    }
    setDone(result.changes.length);
    setResult(null);
  };

  return (
    <Card
      title="Mettre à jour les prix depuis un fichier"
      subtitle="Exportez « Produits », corrigez les colonnes prix_piece, lot_qte, prix_lot ou stock dans Excel, enregistrez en CSV puis importez-le ici. Vous verrez les changements avant de les appliquer."
    >
      <label className="inline-block cursor-pointer rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white">
        Choisir un fichier CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setDone(0);
            setResult(priceChanges(await file.text(), config));
          }}
        />
      </label>
      {done > 0 && <p className="mt-3 text-sm font-semibold text-ok">✓ {done} changement(s) appliqué(s). La boutique est à jour.</p>}
      {result?.error && <p className="mt-3 text-sm font-semibold text-danger">{result.error}</p>}
      {result && !result.error && (
        <div className="mt-4 space-y-3">
          {result.changes.length === 0 ? (
            <p className="text-sm text-muted">Aucun changement : le fichier correspond déjà au catalogue.</p>
          ) : (
            <div className="max-h-96 overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-paper text-xs text-muted">
                  <tr>
                    <th className="p-2 text-start">Produit</th>
                    <th className="p-2 text-start">Champ</th>
                    <th className="p-2 text-start">Avant</th>
                    <th className="p-2 text-start">Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.changes.map((ch) => (
                    <tr key={ch.id + ch.field}>
                      <td className="p-2">{ch.name}</td>
                      <td className="p-2 text-muted">{fieldLabel[ch.field]}</td>
                      <td className="p-2 line-through opacity-60">{ch.field === "unitPrice" || ch.field === "lotPrice" ? formatDh(ch.from) : ch.from}</td>
                      <td className="p-2 font-bold">{ch.field === "unitPrice" || ch.field === "lotPrice" ? formatDh(ch.to) : ch.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.unknown.length > 0 && <p className="text-xs text-warn">Ignorés (id inconnu) : {result.unknown.join(", ")}</p>}
          <div className="flex gap-2">
            <button onClick={() => setResult(null)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted">Annuler</button>
            {result.changes.length > 0 && (
              <button onClick={apply} className="rounded-xl bg-ok px-5 py-2.5 text-sm font-bold text-white">
                Appliquer {result.changes.length} changement(s)
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminExport() {
  const { ready, config, orders } = useStore();
  if (!ready) return null;
  const csv = "text/csv;charset=utf-8";
  const files = [
    { label: "Produits & prix", hint: `${config.products.length} produits : prix pièce et lot, stock, codes-barres`, run: () => download(`produits-${stamp()}.csv`, productsCsv(config), csv) },
    { label: "Commandes", hint: `${orders.length} commandes : client, adresse, montants, statut`, run: () => download(`commandes-${stamp()}.csv`, ordersCsv(orders, config), csv) },
    { label: "Lignes de commande", hint: "Une ligne par produit commandé, pour vos analyses de ventes", run: () => download(`lignes-commandes-${stamp()}.csv`, orderLinesCsv(orders), csv) },
    { label: "Box", hint: `${config.boxes.length} box : contenu et prix`, run: () => download(`box-${stamp()}.csv`, boxesCsv(config), csv) },
    { label: "Catégories", hint: `${config.categories.length} catégories`, run: () => download(`categories-${stamp()}.csv`, categoriesCsv(config), csv) },
    { label: "Zones de livraison", hint: `${config.cities.length} zones : frais et seuils`, run: () => download(`zones-${stamp()}.csv`, zonesCsv(config), csv) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Export des données</h1>
        <p className="text-sm text-muted">Toutes vos données, à garder ou à réutiliser où vous voulez (Excel, Google Sheets, comptabilité…).</p>
      </div>
      <Card title="Tout en un fichier" subtitle="Paramètres, zones, catégories, produits, box et commandes dans un seul fichier JSON (sauvegarde complète).">
        <button
          onClick={() => download(`distri-nord-export-${stamp()}.json`, fullJson(config, orders), "application/json")}
          className="rounded-xl bg-sun-400 px-5 py-2.5 text-sm font-bold text-navy-950"
        >
          ⬇ Télécharger tout (JSON)
        </button>
      </Card>
      <Card title="Fichiers pour Excel" subtitle="CSV séparés par « ; », s'ouvrent directement dans Excel en français.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {files.map((f) => (
            <li key={f.label}>
              <button onClick={f.run} className="flex w-full items-start gap-3 rounded-xl border border-line p-3 text-start hover:border-navy-800">
                <span className="text-xl" aria-hidden>⬇</span>
                <span>
                  <span className="block text-sm font-bold">{f.label}</span>
                  <span className="block text-xs text-muted">{f.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <PriceImport />
    </div>
  );
}
