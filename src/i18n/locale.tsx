"use client";

import { createContext, useContext } from "react";
import { dicts, type Locale } from "./dict";

const LocaleCtx = createContext<Locale>("fr");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

export function useLocale() {
  const locale = useContext(LocaleCtx);
  return { locale, t: dicts[locale] };
}
