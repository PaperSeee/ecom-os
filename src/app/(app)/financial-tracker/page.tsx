"use client";

import { AlertBanner } from "@/components/ui/alert-banner";
import { formatCurrency } from "@/lib/financial";
import { useEffect, useState } from "react";

interface CashflowEntry {
  id: string;
  type: "inflow" | "outflow";
  label: string;
  amount: number;
  date: string;
}

const projection = (balance: number, days: number): number => {
  const dailyNet = 95;
  return balance + dailyNet * days;
};

export default function FinancialTrackerPage() {
  const [entries, setEntries] = useState<CashflowEntry[]>([]);

  useEffect(() => {
    const loadCashflow = async () => {
      const response = await fetch("/api/cashflow", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { entries: CashflowEntry[] };
      setEntries(payload.entries);
    };

    void loadCashflow();
  }, []);

  const inflow = entries
    .filter((entry) => entry.type === "inflow")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const outflow = entries
    .filter((entry) => entry.type === "outflow")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const currentCash = inflow - outflow;
  const risk = currentCash < 1500;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Financial Tracker</h1>
        <p className="mt-2 text-sm text-slate-400">Tresorerie, entries/sorties et projection 30/60/90 jours.</p>
      </header>

      {risk ? (
        <AlertBanner
          title="Risque de rupture de cash"
          description="La tresorerie projetee est sous le seuil de securite operationnel."
          severity="critical"
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Tresorerie actuelle</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(currentCash)}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Projection 30j</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(projection(currentCash, 30))}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Projection 60j</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(projection(currentCash, 60))}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Projection 90j</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(projection(currentCash, 90))}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <h2 className="text-base font-medium text-white">Journal entrees / sorties</h2>
        <div className="mt-3 space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm">
              <p className="text-slate-300">{entry.label}</p>
              <p className={entry.type === "inflow" ? "text-emerald-300" : "text-rose-300"}>
                {entry.type === "inflow" ? "+" : "-"}
                {formatCurrency(entry.amount)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
