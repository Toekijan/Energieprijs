"use client";

export function StatusBar({ fetchedAt, error, onRefresh }: { fetchedAt: string | null; error: string | null; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/50 dark:text-white/50">
      <span>
        {error ? <span className="text-red-600 dark:text-red-400">Let op: {error}</span> : fetchedAt ? `Laatst bijgewerkt: ${new Date(fetchedAt).toLocaleTimeString("nl-NL")}` : "Laden..."}
      </span>
      <button onClick={onRefresh} className="rounded-md border border-black/10 px-2 py-1 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
        Ververs nu
      </button>
    </div>
  );
}
