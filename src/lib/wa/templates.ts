// WhatsApp message templates. Meta only lets a business start a conversation (or write after
// 24 h of silence) with a template it approved beforehand. These definitions are used both to
// create the templates on Meta (dashboard button) and to send them.
// Rules Meta enforces: no variable at the very start or end of the body, parameters without
// line breaks, quick-reply buttons of 25 characters max.

export type TemplateKey = "order_received" | "order_confirmed" | "order_shipping" | "order_delivered" | "order_cancelled" | "seller_new" | "seller_confirmed";
export type TemplateLang = "fr" | "ar";

type Def = { name: string; body: Record<TemplateLang, string>; example: string[]; buttons?: Record<TemplateLang, string[]>; sellerOnly?: boolean };

export const TEMPLATES: Record<TemplateKey, Def> = {
  order_received: {
    name: "dn_commande_recue",
    body: {
      fr: "Salam {{1}} 👋\nMerci pour votre commande *{{2}}* chez {{3}}.\n\nArticles : {{4}}\nÀ payer à la livraison : *{{5}}*\nAdresse : {{6}}\n\nConfirmez l'adresse avec le bouton ci-dessous, ou envoyez-nous votre position 📍 ou une autre adresse.",
      ar: "السلام عليكم {{1}} 👋\nشكراً على طلبك *{{2}}* من {{3}}.\n\nالمنتجات: {{4}}\nالمبلغ عند الاستلام: *{{5}}*\nالعنوان: {{6}}\n\nأكّد العنوان بالزر أسفله، أو أرسل لنا موقعك 📍 أو عنواناً آخر.",
    },
    example: ["Karim", "DN-4F7K2Q", "Distri Nord", "2 × Monster Energy 50cl (lot 24), 1 × Sidi Ali 1,5L", "1 250 DH", "Rue 5 n° 21, Hay Riad, Rabat"],
    buttons: { fr: ["Confirmer l'adresse", "Changer l'adresse"], ar: ["تأكيد العنوان", "تغيير العنوان"] },
  },
  order_confirmed: {
    name: "dn_commande_confirmee",
    body: {
      fr: "Votre commande *{{1}}* est confirmée ✅\nLivraison prévue {{2}}.\nÀ payer à la livraison : *{{3}}*.\n\nMerci de votre confiance.",
      ar: "تم تأكيد طلبك *{{1}}* ✅\nالتوصيل متوقع {{2}}.\nالمبلغ عند الاستلام: *{{3}}*.\n\nشكراً على ثقتك.",
    },
    example: ["DN-4F7K2Q", "aujourd'hui entre 14h et 18h", "1 250 DH"],
  },
  order_shipping: {
    name: "dn_commande_en_route",
    body: {
      fr: "Votre commande *{{1}}* est en route 🚚\nContact livraison : {{2}}\nMerci de préparer *{{3}}* en espèces.",
      ar: "طلبك *{{1}}* في الطريق 🚚\nللتواصل: {{2}}\nجهّز *{{3}}* نقداً من فضلك.",
    },
    example: ["DN-4F7K2Q", "06 08 25 23 28", "1 250 DH"],
  },
  order_delivered: {
    name: "dn_commande_livree",
    body: {
      fr: "Votre commande *{{1}}* a été livrée 📦\nMerci de votre confiance, à bientôt chez {{2}} !",
      ar: "تم تسليم طلبك *{{1}}* 📦\nشكراً على ثقتك، نراك قريباً في {{2}}!",
    },
    example: ["DN-4F7K2Q", "Distri Nord"],
  },
  order_cancelled: {
    name: "dn_commande_annulee",
    body: {
      fr: "Votre commande *{{1}}* a été annulée.\nUne question ? Répondez simplement à ce message.",
      ar: "تم إلغاء طلبك *{{1}}*.\nلأي سؤال، أجبنا هنا.",
    },
    example: ["DN-4F7K2Q"],
  },
  seller_new: {
    name: "dn_vendeur_nouvelle_commande",
    sellerOnly: true,
    body: {
      fr: "🆕 Nouvelle commande *{{1}}*\nClient : {{2}} ({{3}})\nAdresse : {{4}}\nArticles : {{5}}\nÀ encaisser : *{{6}}*\n\nLe client reçoit un message pour confirmer son adresse. Vous pouvez aussi confirmer après l'avoir appelé.",
      ar: "",
    },
    example: ["DN-4F7K2Q", "Karim Alaoui", "0612345678", "Rue 5 n° 21, Hay Riad, Rabat", "2 × Monster Energy 50cl (lot 24)", "1 250 DH"],
    buttons: { fr: ["Confirmer", "Annuler"], ar: [] },
  },
  seller_confirmed: {
    name: "dn_vendeur_commande_confirmee",
    sellerOnly: true,
    body: {
      fr: "✅ Commande *{{1}}* prête à livrer.\nAdresse : {{2}}\nÀ encaisser : *{{3}}*\n\nAppuyez sur « Lancer la livraison » quand elle part.",
      ar: "",
    },
    example: ["DN-4F7K2Q", "https://maps.google.com/?q=34.0209,-6.8416", "1 250 DH"],
    buttons: { fr: ["Lancer la livraison", "Annuler"], ar: [] },
  },
};

// Payload prefixes carried by quick-reply buttons: "<action>:<orderId>".
export const BUTTON_ACTIONS: Record<TemplateKey, string[]> = {
  order_received: ["confirm", "change"],
  order_confirmed: [],
  order_shipping: [],
  order_delivered: [],
  order_cancelled: [],
  seller_new: ["s_confirm", "s_cancel"],
  seller_confirmed: ["s_ship", "s_cancel"],
};

export function templateLangs(key: TemplateKey): TemplateLang[] {
  return TEMPLATES[key].sellerOnly ? ["fr"] : ["fr", "ar"];
}

// Body for Meta's "create template" endpoint.
export function creationPayload(key: TemplateKey, lang: TemplateLang) {
  const t = TEMPLATES[key];
  const components: Record<string, unknown>[] = [{ type: "BODY", text: t.body[lang], example: { body_text: [t.example] } }];
  const buttons = t.buttons?.[lang];
  if (buttons?.length) components.push({ type: "BUTTONS", buttons: buttons.map((text) => ({ type: "QUICK_REPLY", text })) });
  return { name: t.name, language: lang, category: "UTILITY", components };
}

// Template parameters can't hold line breaks, tabs or long runs of spaces.
export const param = (s: string, max = 600) => {
  const clean = s.replace(/\s+/g, " ").trim() || "-";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

// Plain-text rendering of a sent template, for the order's message log.
export function renderTemplate(key: TemplateKey, lang: TemplateLang, params: string[]) {
  return TEMPLATES[key].body[lang].replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? "");
}
