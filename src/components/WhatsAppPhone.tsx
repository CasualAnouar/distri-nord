"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatButton } from "@/lib/whatsapp";

function rich(text: string) {
  return text.split("\n").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*[^*]+\*)/g).map((part, j) => (part.startsWith("*") && part.endsWith("*") ? <strong key={j}>{part.slice(1, -1)}</strong> : part))}
    </Fragment>
  ));
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit" });

export function WhatsAppPhone({
  title,
  subtitle,
  messages,
  onButton,
  dir,
}: {
  title: string;
  subtitle: string;
  messages: ChatMessage[];
  onButton: (b: ChatButton) => void;
  dir: "ltr" | "rtl";
}) {
  // Reveal new messages one at a time with a typing indicator, like a live chat.
  const [revealed, setShown] = useState(0);
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
                <p className="whitespace-pre-wrap break-words">{rich(m.text)}</p>
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
                      className={`rounded-xl bg-white px-3 py-2 text-center text-[13px] font-semibold shadow-sm ${b.next ? "text-sky-600 ring-2 ring-wa/60 hover:bg-wa-bubble" : "text-sky-600/70"}`}
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
        <div className="flex items-center gap-2 bg-wa-bg px-3 py-2">
          <div className="flex-1 rounded-full bg-white px-4 py-2 text-xs text-muted">Message</div>
          <span className="grid size-9 place-items-center rounded-full bg-wa-dark text-white" aria-hidden>🎤</span>
        </div>
      </div>
    </div>
  );
}
