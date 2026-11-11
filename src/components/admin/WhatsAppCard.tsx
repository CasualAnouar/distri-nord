"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { WhatsAppSettings } from "@/lib/config";
import { useStore } from "@/lib/store";
import { normalizePhone } from "@/lib/shop";
import { Card, Field, Toggle, inputCls } from "./ui";

type Status = {
  env: { tokenHint?: string; token: boolean; phoneId: boolean; wabaId: boolean; appSecret: boolean; verifyToken: boolean; firebase: boolean };
  phone?: { display_phone_number?: string; verified_name?: string; quality_rating?: string; error?: string };
  templates?: { name: string; language: string; status: string; rejected_reason?: string }[] | { error: string };
};

const envLabels: [Exclude<keyof Status["env"], "tokenHint">, string][] = [
  ["token", "WHATSAPP_TOKEN"],
  ["phoneId", "WHATSAPP_PHONE_NUMBER_ID"],
  ["wabaId", "WHATSAPP_WABA_ID"],
  ["appSecret", "WHATSAPP_APP_SECRET"],
  ["verifyToken", "WHATSAPP_VERIFY_TOKEN"],
  ["firebase", "FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"],
];

const statusFr: Record<string, string> = { APPROVED: "Approuvé", PENDING: "En attente", REJECTED: "Refusé", PAUSED: "En pause", DISABLED: "Désactivé" };

// Real WhatsApp (Cloud API): connection check, template setup, test message and on/off switch.
export function WhatsAppCard() {
  const { settings, saveSettings } = useStore();
  const pathname = usePathname();
  const base = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const api = `${base}/api/whatsapp`;
  const [w, setW] = useState<WhatsAppSettings>(settings.whatsapp);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [testPhone, setTestPhone] = useState(settings.sellerPhone);
  const dirty = JSON.stringify(w) !== JSON.stringify(settings.whatsapp);

  const [reload, setReload] = useState(0);
  useEffect(() => {
    let off = false;
    fetch(api, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Status>) : null))
      .catch(() => null)
      .then((s) => !off && setStatus(s));
    return () => {
      off = true;
    };
  }, [api, reload]);
  const load = () => setReload((n) => n + 1);

  const post = async (action: string, extra: Record<string, string> = {}) => {
    setBusy(action);
    setNote("");
    try {
      const r = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const json = await r.json();
      if (!r.ok) setNote(`❌ ${json.error ?? "Erreur"}`);
      else if (action === "test") setNote("✅ Message de test envoyé. Vérifiez WhatsApp sur ce numéro.");
      else if (action === "templates") {
        const res = json.results as { name: string; language: string; result: string }[];
        setNote(res.length ? res.map((x) => `${x.name} (${x.language}) : ${x.result}`).join("\n") : "Tous les modèles existent déjà.");
      }
      load();
    } catch {
      setNote("❌ Serveur injoignable");
    } finally {
      setBusy("");
    }
  };

  const env = status?.env;
  const envOk = env ? envLabels.every(([k]) => env[k]) : false;
  const templates = Array.isArray(status?.templates) ? status.templates : [];
  const approved = templates.filter((t) => t.status === "APPROVED").length;
  const detected = status?.phone?.display_phone_number;
  const webhook = typeof window === "undefined" ? "/api/whatsapp/webhook" : `${window.location.origin}/api/whatsapp/webhook`;

  return (
    <Card
      title="WhatsApp automatique"
      subtitle="Messages envoyés par le vrai WhatsApp Business (API Cloud de Meta) : confirmation d'adresse, suivi et alertes vendeur."
      action={
        <div className="flex items-center gap-2 text-sm font-semibold">
          {w.enabled ? "Activé" : "Démo (conversation simulée)"}
          <Toggle checked={w.enabled} onChange={(enabled) => setW({ ...w, enabled })} label="Activer WhatsApp" />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Numéro WhatsApp de la boutique" hint={detected ? `Détecté chez Meta : ${detected}` : "Numéro qui envoie les messages (affiché au client après la commande)."}>
            <div className="flex gap-2">
              <input dir="ltr" className={inputCls} value={w.businessPhone} onChange={(e) => setW({ ...w, businessPhone: e.target.value })} placeholder="+212 5 37 00 00 00" />
              {detected && detected !== w.businessPhone && (
                <button type="button" onClick={() => setW({ ...w, businessPhone: detected })} className="shrink-0 rounded-lg bg-paper px-3 text-xs font-semibold">
                  Utiliser
                </button>
              )}
            </div>
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
            <span className="text-sm">
              <span className="block font-semibold">Alertes vendeur</span>
              <span className="text-xs text-muted">Nouvelles commandes et boutons « Lancer la livraison » envoyés au {settings.sellerPhone}.</span>
            </span>
            <Toggle checked={w.sellerAlerts} onChange={(sellerAlerts) => setW({ ...w, sellerAlerts })} label="Alertes vendeur" />
          </div>
        </div>
        {dirty && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setW(settings.whatsapp)} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted">Annuler</button>
            <button
              type="button"
              disabled={w.enabled && !envOk}
              onClick={() => saveSettings({ whatsapp: w })}
              className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Enregistrer WhatsApp
            </button>
          </div>
        )}
        {w.enabled && !envOk && <p className="text-xs text-danger">Configuration serveur incomplète : WhatsApp ne peut pas être activé.</p>}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-paper p-4 text-sm">
            <p className="font-bold">1 · Connexion</p>
            {!status && <p className="mt-2 text-muted">Vérification…</p>}
            {env && (
              <ul className="mt-2 space-y-1 font-mono text-xs">
                {envLabels.map(([k, label]) => (
                  <li key={k}>
                    {env[k] ? "✅" : "⬜"} {label}
                    {k === "token" && env.tokenHint && <span className="text-muted"> ({env.tokenHint}, attendu : EAA…, plus de 100 caractères)</span>}
                  </li>
                ))}
              </ul>
            )}
            {env && !envOk && <p className="mt-2 text-xs text-muted">Une variable ajoutée dans Vercel n&apos;est prise en compte qu&apos;après un nouveau déploiement.</p>}
            {status?.phone?.error && <p className="mt-2 text-xs text-danger">Meta : {status.phone.error}</p>}
            {status?.phone?.verified_name && (
              <p className="mt-2 text-xs">Compte : <strong>{status.phone.verified_name}</strong> · {detected} · qualité {status.phone.quality_rating ?? "?"}</p>
            )}
            <p className="mt-3 text-xs text-muted">Webhook à coller chez Meta (WhatsApp › Configuration), avec le même jeton que WHATSAPP_VERIFY_TOKEN, champ « messages » coché :</p>
            <code className="mt-1 block break-all rounded-lg bg-white p-2 text-xs" dir="ltr">{webhook}</code>
          </div>

          <div className="rounded-xl bg-paper p-4 text-sm">
            <p className="font-bold">2 · Modèles de messages</p>
            <p className="mt-1 text-xs text-muted">Meta doit approuver les messages envoyés en premier (souvent en quelques minutes). {templates.length ? `${approved}/${templates.length} approuvés.` : ""}</p>
            {!Array.isArray(status?.templates) && status?.templates && <p className="mt-2 text-xs text-danger">{status.templates.error}</p>}
            {templates.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs">
                {templates.map((t) => (
                  <li key={t.name + t.language} className="flex justify-between gap-2">
                    <span className="font-mono">{t.name} · {t.language}</span>
                    <span className={t.status === "APPROVED" ? "text-ok" : t.status === "REJECTED" ? "text-danger" : "text-warn"}>
                      {statusFr[t.status] ?? t.status}{t.rejected_reason && t.rejected_reason !== "NONE" ? ` (${t.rejected_reason})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" disabled={!env?.wabaId || busy !== ""} onClick={() => post("templates")} className="mt-3 rounded-xl bg-navy-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
              {busy === "templates" ? "Création…" : "Créer les modèles manquants"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-line p-3">
          <Field label="3 · Envoyer un message de test" className="min-w-48 flex-1">
            <input type="tel" dir="ltr" className={inputCls} value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
          </Field>
          <button
            type="button"
            disabled={!env?.token || !normalizePhone(testPhone) || busy !== ""}
            onClick={() => post("test", { phone: testPhone })}
            className="rounded-xl bg-wa px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy === "test" ? "Envoi…" : "Envoyer"}
          </button>
        </div>
        {note && <p className="whitespace-pre-line rounded-xl bg-paper p-3 text-xs">{note}</p>}
      </div>
    </Card>
  );
}
