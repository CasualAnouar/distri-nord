import type { Config } from "./config";
import type { Order } from "./shop";

// Data export for the seller: CSV for spreadsheets (Excel in French: ";" separator, comma
// decimals, UTF-8 with BOM so accents and Arabic open correctly) and one JSON file with everything.

type Cell = string | number | boolean | undefined | null;

const cell = (v: Cell) => {
  if (v === undefined || v === null) return "";
  if (typeof v === "number") return String(v).replace(".", ",");
  if (typeof v === "boolean") return v ? "oui" : "non";
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function toCsv(header: string[], rows: Cell[][]) {
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}

export function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const stamp = () => new Date().toISOString().slice(0, 10);

const date = (iso: string) => new Date(iso).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" });

export function productsCsv(c: Config) {
  const cat = (id: string) => c.categories.find((x) => x.id === id)?.fr ?? id;
  return toCsv(
    ["id", "nom", "marque", "format", "categorie", "prix_piece", "lot_qte", "prix_lot", "prix_lot_par_piece", "remise_lot_pct", "stock", "visible", "badge", "code_barres", "photo"],
    c.products.map((p) => [
      p.id, p.name, p.brand, p.size, cat(p.category), p.unitPrice, p.lot.qty, p.lot.price,
      +(p.lot.price / p.lot.qty).toFixed(2), Math.round((1 - p.lot.price / (p.unitPrice * p.lot.qty)) * 100),
      p.stock, !p.hidden, p.tag ?? "", p.barcode ?? "", p.image?.startsWith("data:") ? "(photo importée)" : (p.image ?? ""),
    ]),
  );
}

export function boxesCsv(c: Config) {
  const name = (id: string) => c.products.find((p) => p.id === id)?.name ?? id;
  return toCsv(
    ["id", "nom_fr", "nom_ar", "prix", "contenu", "visible", "badge"],
    c.boxes.map((b) => [b.id, b.name.fr, b.name.ar, b.price, b.items.map((it) => `${it.qty} x ${name(it.productId)}`).join(" + "), !b.hidden, b.tag ?? ""]),
  );
}

export function ordersCsv(orders: Order[], c: Config) {
  const city = (id: string) => c.cities.find((x) => x.id === id)?.fr ?? id;
  return toCsv(
    ["commande", "date", "statut", "type", "client", "telephone", "ville", "quartier", "adresse", "repere", "note", "adresse_whatsapp", "nb_lignes", "sous_total", "livraison", "total"],
    orders.map((o) => [
      o.id, date(o.createdAt), o.status, o.channel === "gros" ? "gros" : "detail", o.customer.name, o.customer.phone, city(o.customer.city),
      o.customer.district, o.customer.address, o.customer.landmark, o.customer.note,
      o.addressReply?.via === "text" ? o.addressReply.text : o.addressReply?.via === "location" ? `${o.addressReply.lat},${o.addressReply.lng}` : "",
      o.lines.length, o.subtotal, o.delivery, o.total,
    ]),
  );
}

export function orderLinesCsv(orders: Order[]) {
  return toCsv(
    ["commande", "date", "statut", "produit_id", "produit", "format", "mode", "quantite", "pieces_par_unite", "montant"],
    orders.flatMap((o) => o.lines.map((l) => [o.id, date(o.createdAt), o.status, l.productId, l.name, l.size, l.mode, l.qty, l.unitsPerLine, l.price])),
  );
}

export function zonesCsv(c: Config) {
  return toCsv(["id", "ville_fr", "ville_ar", "frais", "gratuit_des", "active"], c.cities.map((z) => [z.id, z.fr, z.ar, z.fee, z.freeFrom, z.active]));
}

export function categoriesCsv(c: Config) {
  return toCsv(["id", "icone", "nom_fr", "nom_ar", "nb_produits"], c.categories.map((x) => [x.id, x.icon, x.fr, x.ar, c.products.filter((p) => p.category === x.id).length]));
}

export function fullJson(c: Config, orders: Order[]) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...c, orders }, null, 2);
}

// --- Price import ---------------------------------------------------------------------------

/** Parses a CSV (";" or "," separated, quoted fields allowed) into rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export type PriceChange = { id: string; name: string; field: "unitPrice" | "lotQty" | "lotPrice" | "stock"; from: number; to: number };

const columns = { unitPrice: "prix_piece", lotQty: "lot_qte", lotPrice: "prix_lot", stock: "stock" } as const;

/** Compares a products CSV (as exported) with the catalogue and lists what would change. */
export function priceChanges(text: string, c: Config): { changes: PriceChange[]; unknown: string[]; error?: string } {
  const rows = parseCsv(text);
  if (rows.length < 2) return { changes: [], unknown: [], error: "Fichier vide." };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idCol = head.indexOf("id");
  if (idCol < 0) return { changes: [], unknown: [], error: "Colonne « id » introuvable. Partez du fichier « Produits » exporté ici." };
  const cols = Object.entries(columns).map(([field, name]) => [field, head.indexOf(name)] as const).filter(([, i]) => i >= 0);
  if (cols.length === 0) return { changes: [], unknown: [], error: "Aucune colonne prix_piece, lot_qte, prix_lot ou stock." };
  const changes: PriceChange[] = [];
  const unknown: string[] = [];
  for (const r of rows.slice(1)) {
    const id = r[idCol]?.trim();
    if (!id) continue;
    const p = c.products.find((x) => x.id === id);
    if (!p) {
      unknown.push(id);
      continue;
    }
    const current = { unitPrice: p.unitPrice, lotQty: p.lot.qty, lotPrice: p.lot.price, stock: p.stock };
    for (const [field, i] of cols) {
      const raw = (r[i] ?? "").trim().replace(/\s/g, "").replace(",", ".");
      if (!raw) continue;
      const to = Number(raw);
      if (!Number.isFinite(to) || to < 0) continue;
      const f = field as PriceChange["field"];
      if (to !== current[f]) changes.push({ id, name: p.name, field: f, from: current[f], to });
    }
  }
  return { changes, unknown };
}
