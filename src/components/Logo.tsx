export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} dir="ltr">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#ffc21a" />
        <path d="M20 7 29 19h-5.5v8h-7v-8H11z" fill="#0b2654" />
        <rect x="11" y="29.5" width="18" height="3.5" rx="1.75" fill="#0b2654" />
      </svg>
      <span className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight">Distri Nord</span>
      </span>
    </span>
  );
}
