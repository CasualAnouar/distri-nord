"use client";

import { useLocale } from "@/i18n/locale";
import { statusFlow, type OrderStatus } from "@/lib/shop";

export function StatusSteps({ status }: { status: OrderStatus }) {
  const { t } = useLocale();
  if (status === "cancelled") return <p className="rounded-xl bg-danger/10 p-3 text-center font-semibold text-danger">{t.status.cancelled}</p>;
  const idx = statusFlow.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-1">
      {statusFlow.map((s, i) => (
        <li key={s} className="text-center">
          <div className={`h-1.5 rounded-full ${i <= idx ? "bg-ok" : "bg-line"}`} />
          <p className={`mt-2 text-[11px] font-semibold sm:text-xs ${i <= idx ? "text-ok" : "text-muted"}`}>{t.status[s]}</p>
        </li>
      ))}
    </ol>
  );
}
