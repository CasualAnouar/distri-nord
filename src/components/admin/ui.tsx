"use client";

import { useState } from "react";

// Small form pieces shared by the admin pages.

export const inputCls = "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-navy-800";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-ok" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "start-[22px]" : "start-0.5"}`} />
    </button>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/60 p-4" onClick={onClose}>
      <div className="mx-auto mt-6 max-w-2xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Reads a typed amount: comma or dot for decimals, spaces ignored, nothing else accepted.
export const num = (v: string) => {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? n : 0;
};

const show = (n: number) => (n ? String(n).replace(".", ",") : "0");
// Keeps digits and one decimal separator (comma or dot), at most 2 decimals.
const clean = (v: string) => {
  const m = v.replace(/[^\d.,]/g, "").match(/^(\d{0,7})(?:[.,](\d{0,2}))?/);
  return m ? m[1] + (m[2] !== undefined ? `,${m[2]}` : "") : "";
};

/**
 * Amount field that accepts a decimal comma (32,5). A plain number input rejects the comma in
 * most browsers and lets through values like 1e176. onChange fires as you type; onCommit on blur.
 */
export function DecimalInput({
  value,
  onChange,
  onCommit,
  className = "",
  integer = false,
  ...rest
}: { value: number; onChange?: (n: number) => void; onCommit?: (n: number) => void; className?: string; integer?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [text, setText] = useState(show(value));
  const [seen, setSeen] = useState(value);
  // Follow changes made elsewhere (another tab, an import) while not being edited.
  if (value !== seen) {
    setSeen(value);
    if (num(text) !== value) setText(show(value));
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      dir="ltr"
      className={`${inputCls} ${className}`}
      value={text}
      onChange={(e) => {
        const t = integer ? e.target.value.replace(/\D/g, "").slice(0, 7) : clean(e.target.value);
        setText(t);
        onChange?.(num(t));
      }}
      onBlur={() => {
        const n = num(text);
        setText(show(n));
        onCommit?.(n);
      }}
    />
  );
}
