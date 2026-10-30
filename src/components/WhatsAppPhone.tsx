"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatButton, ChatLocation } from "@/lib/whatsapp";
import { mapsUrl } from "@/lib/shop";

function rich(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*[^*]+\*)/g).map((part, j) => (part.startsWith("*") && part.endsWith("*") ? <strong key={j}>{part.slice(1, -1)}</strong> : part))}
    </Fragment>
  ));
}

function LocationCard({ loc }: { loc: ChatLocation }) {
  return (
    <a href={mapsUrl(loc.lat, loc.lng)} target="_blank" rel="noreferrer" className="block w-56">
      <div className="relative h-28 overflow-hidden rounded-lg bg-[#e8efe3]">
        <svg viewBox="0 0 224 112" className="absolute inset-0 size-full" aria-hidden>
          <path d="M0 70 C60 60 90 90 224 64" stroke="#fff" strokeWidth="10" fill="none" />
          <path d="M70 0 L95 112" stroke="#fff" strokeWidth="7" />
          <path d="M150 0 C140 40 175 70 160 112" stroke="#fff" strokeWidth="6" fill="none" />
          <rect x="10" y="10" width="40" height="30" rx="4" fill="#d6e4cc" />
          <rect x="175" y="8" width="38" height="40" rx="4" fill="#d6e4cc" />
          <path d="M0 100 L224 92 L224 112 L0 112z" fill="#b9dcf0" />
        </svg>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full text-3xl drop-shadow">📍</span>
      </div>
      <p className="mt-1.5 text-[13px] font-semibold text-sky-700">{loc.label}</p>
      <p className="text-[11px] text-muted" dir="ltr">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
    </a>
  );
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });

export function WhatsAppPhone({
  title,
  subtitle,
  messages,
  onButton,
  composer,
  dir,
}: {
  title: string;
  subtitle: string;
  messages: ChatMessage[];
  onButton: (b: ChatButton) => void;
  composer?: { placeholder: string; onSend: (text: string) => void; onCancel: () => void };
  dir: "ltr" | "rtl";
}) {
  // Reveal new messages one at a time with a typing indicator, like a live chat.
  const [revealed, setShown] = useState(0);
  const [draft, setDraft] = useState("");
  const shown = Math.min(revealed, messages.length);
  const scroller = useRef<HTMLDivElement>(null);
  const typing = shown < messages.length && messages[shown]?.from === "them";

  useEffect(() => {
    if (shown === messages.length) return;
    const delay = messages[shown].from === "me" ? 350 : shown === 0 ? 500 : 1100;
    const id = setTimeout(() => setShown(shown + 1), delay);
    return () => clearTimeout(id);
  }, [shown, messages]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [shown, typing]);

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[2.5rem] border-[10px] border-ink bg-ink shadow-2xl">
      <div className="overflow-hidden rounded-[1.8rem]">
        <div className="flex items-center gap-3 bg-wa-dark px-4 pb-3 pt-5 text-white" dir={dir}>
          <span className="grid size-9 place-items-center rounded-full bg-sun-400 text-sm font-extrabold text-navy-950" dir="ltr">DN</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title} <span className="text-wa" aria-label="vérifié">✔</span></p>
            <p className="text-[11px] text-white/70">{typing ? "…" : subtitle}</p>
          </div>
        </div>
        <div ref={scroller} className="wa-pattern h-[520px] space-y-2 overflow-y-auto px-3 py-4" dir={dir}>
          {messages.slice(0, shown).map((m) => (
            <div key={m.id} className={`animate-pop flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13.5px] leading-snug shadow-sm ${m.from === "me" ? "rounded-se-sm bg-wa-bubble" : "rounded-ss-sm bg-white"}`}>
                {m.text && <p className={`whitespace-pre-wrap break-words ${m.location ? "mb-2" : ""}`}>{rich(m.text)}</p>}
                {m.location && <LocationCard loc={m.location} />}
                <p className="mt-1 text-end text-[10px] text-muted" dir="ltr">
                  {time(m.at)} {m.from === "me" && <span className="text-sky-500">✓✓</span>}
                </p>
              </div>
              {m.buttons && (
                <div className="mt-1 grid w-[85%] gap-1">
                  {m.buttons.map((b) => (
                    <button
                      key={b.label}
                      onClick={() => onButton(b)}
                      className={`rounded-xl bg-white px-3 py-2 text-center text-[13px] font-semibold shadow-sm ${b.action ? "text-sky-600 ring-2 ring-wa/60 hover:bg-wa-bubble" : "text-sky-600/70"}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex">
              <div className="flex gap-1 rounded-xl rounded-ss-sm bg-white px-3 py-3 shadow-sm">
                <span className="typing-dot size-1.5 rounded-full bg-muted" />
                <span className="typing-dot size-1.5 rounded-full bg-muted" />
                <span className="typing-dot size-1.5 rounded-full bg-muted" />
              </div>
            </div>
          )}
        </div>
        {composer ? (
          <form
            className="flex items-center gap-2 bg-wa-bg px-3 py-2"
            dir={dir}
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              composer.onSend(draft.trim());
              setDraft("");
            }}
          >
            <button type="button" onClick={composer.onCancel} className="text-muted" aria-label="✕">✕</button>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={composer.placeholder}
              className="min-w-0 flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none ring-2 ring-wa/60"
            />
            <button type="submit" className="grid size-9 shrink-0 place-items-center rounded-full bg-wa-dark text-white" aria-label="➤">➤</button>
          </form>
        ) : (
          <div className="flex items-center gap-2 bg-wa-bg px-3 py-2">
            <div className="flex-1 rounded-full bg-white px-4 py-2 text-xs text-muted">Message</div>
            <span className="grid size-9 place-items-center rounded-full bg-wa-dark text-white" aria-hidden>🎤</span>
          </div>
        )}
      </div>
    </div>
  );
}
