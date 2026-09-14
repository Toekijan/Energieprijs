import type { ReactNode } from "react";

export function Card({ title, subtitle, children, className = "" }: { title?: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${className}`}>
      {title && (
        <header className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60 dark:text-white/60">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-black/40 dark:text-white/40">{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
