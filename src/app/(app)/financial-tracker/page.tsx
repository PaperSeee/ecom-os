"use client";

import { AlertBanner } from "@/components/ui/alert-banner";
import { formatCurrency } from "@/lib/financial";
import { getTeamMemberLabel, TEAM_MEMBERS } from "@/lib/team";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CashflowEntry {
  id: string;
  type: "inflow" | "outflow";
  label: string;
  amount: number;
  date: string;
  userId?: string;
}

interface RecurringCost {
  id: string;
  label: string;
  amount: number;
  costType: "fixed" | "variable";
  cadence: "weekly" | "monthly" | "quarterly";
  nextChargeDate: string | null;
  userId?: string;
  updatedAt?: string;
}

export default function FinancialTrackerPage() {
  const [entries, setEntries] = useState<CashflowEntry[]>([]);
  const [recurring, setRecurring] = useState<RecurringCost[]>([]);
  const [startingCapital, setStartingCapital] = useState<number>(0);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [entryForm, setEntryForm] = useState({
    type: "outflow" as "inflow" | "outflow",
    label: "",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
  });
  const [recurringForm, setRecurringForm] = useState({
    label: "",
    amount: 0,
    costType: "fixed" as "fixed" | "variable",
    cadence: "monthly" as "weekly" | "monthly" | "quarterly",
    nextChargeDate: new Date().toISOString().slice(0, 10),
  });

  const fetchEntries = async (): Promise<CashflowEntry[]> => {
    const response = await fetch("/api/cashflow", { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { entries: CashflowEntry[] };
    return payload.entries;
  };

  const fetchRecurring = async (): Promise<RecurringCost[]> => {
    const response = await fetch("/api/financial/recurring", { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as { recurring: RecurringCost[] };
    return payload.recurring;
  };

  const fetchSettings = async (): Promise<number> => {
    const response = await fetch("/api/financial/settings", { cache: "no-store" });
    if (!response.ok) {
      return 0;
    }
    const payload = (await response.json()) as { startingCapital: number };
    return payload.startingCapital;
  };

  const refreshAll = async () => {
    const [nextEntries, nextRecurring, nextStartingCapital] = await Promise.all([
      fetchEntries(),
      fetchRecurring(),
      fetchSettings(),
    ]);

    setEntries(nextEntries);
    setRecurring(nextRecurring);
    setStartingCapital(nextStartingCapital);
  };

  useEffect(() => {
    void Promise.all([fetchEntries(), fetchRecurring(), fetchSettings()]).then(
      ([nextEntries, nextRecurring, nextStartingCapital]) => {
        setEntries(nextEntries);
        setRecurring(nextRecurring);
        setStartingCapital(nextStartingCapital);
      },
    );
  }, []);

  const saveStartingCapital = async () => {
    await fetch("/api/financial/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startingCapital, actorUserId }),
    });
    await refreshAll();
  };

  const addEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entryForm.label.trim() || entryForm.amount <= 0) {
      return;
    }

    await fetch("/api/cashflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entryForm, label: entryForm.label.trim(), actorUserId }),
    });

    setEntryForm({
      type: "outflow",
      label: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    await refreshAll();
  };

  const removeEntry = async (id: string) => {
    await fetch(`/api/cashflow?id=${id}`, { method: "DELETE" });
    await refreshAll();
  };

  const addRecurring = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recurringForm.label.trim() || recurringForm.amount <= 0) {
      return;
    }

    await fetch("/api/financial/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...recurringForm, label: recurringForm.label.trim(), actorUserId }),
    });

    setRecurringForm({
      label: "",
      amount: 0,
      costType: "fixed",
      cadence: "monthly",
      nextChargeDate: new Date().toISOString().slice(0, 10),
    });
    await refreshAll();
  };

  const removeRecurring = async (id: string) => {
    await fetch(`/api/financial/recurring?id=${id}`, { method: "DELETE" });
    await refreshAll();
  };

  const operationalEntries = entries.filter((entry) => entry.label !== "__STARTING_CAPITAL__");

  const inflow = operationalEntries
    .filter((entry) => entry.type === "inflow")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const outflow = operationalEntries
    .filter((entry) => entry.type === "outflow")
    .reduce((sum, entry) => sum + entry.amount, 0);

  const monthlyEquivalent = (item: RecurringCost): number => {
    if (item.cadence === "weekly") {
      return (item.amount * 52) / 12;
    }
    if (item.cadence === "quarterly") {
      return item.amount / 3;
    }
    return item.amount;
  };

  const monthlyFixed = recurring
    .filter((item) => item.costType === "fixed")
    .reduce((sum, item) => sum + monthlyEquivalent(item), 0);

  const monthlyVariable = recurring
    .filter((item) => item.costType === "variable")
    .reduce((sum, item) => sum + monthlyEquivalent(item), 0);

  const monthlyEstimatedExpenses = monthlyFixed + monthlyVariable;

  const byMonth = useMemo(() => {
    const map = new Map<string, { inflow: number; outflow: number }>();
    for (const entry of operationalEntries) {
      const monthKey = entry.date.slice(0, 7);
      const current = map.get(monthKey) ?? { inflow: 0, outflow: 0 };
      if (entry.type === "inflow") {
        current.inflow += entry.amount;
      } else {
        current.outflow += entry.amount;
      }
      map.set(monthKey, current);
    }
    return map;
  }, [operationalEntries]);

  const monthStats = Array.from(byMonth.values());
  const avgMonthlyRevenue = monthStats.length > 0 ? monthStats.reduce((sum, m) => sum + m.inflow, 0) / monthStats.length : 0;
  const avgMonthlyOutflow = monthStats.length > 0 ? monthStats.reduce((sum, m) => sum + m.outflow, 0) / monthStats.length : 0;
  const estimatedMonthlyNet = avgMonthlyRevenue - avgMonthlyOutflow - monthlyEstimatedExpenses;

  const currentCash = startingCapital + inflow - outflow;
  const projectedEndOfMonth = currentCash + estimatedMonthlyNet;

  const dailyProjectedNet = estimatedMonthlyNet / 30;
  const projection = (balance: number, days: number): number => balance + dailyProjectedNet * days;
  const risk = currentCash < monthlyEstimatedExpenses * 1.5;

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Financial Tracker</h1>
        <p className="mt-2 text-sm text-slate-400">Tresorerie live, recurring costs et projections reelles mensuelles.</p>
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
          <p className="text-xs uppercase tracking-wide text-slate-500">Depenses estimees / mois</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(monthlyEstimatedExpenses)}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Projection fin de mois</p>
          <p className={`mt-2 text-xl font-semibold ${projectedEndOfMonth >= 0 ? "text-white" : "text-rose-300"}`}>
            {formatCurrency(projectedEndOfMonth)}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Projection 30j</p>
          <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(projection(currentCash, 30))}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-white">Capital de depart</h2>
          <p className="mt-1 text-sm text-slate-400">Modifiable a tout moment pour refleter la tresorerie initiale.</p>
          <label className="mt-3 block text-sm text-slate-300">
            Auteur modif
            <select
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              {TEAM_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm text-slate-300">
            Capital initial (EUR)
            <input
              type="number"
              step="0.01"
              value={startingCapital}
              onChange={(event) => setStartingCapital(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => void saveStartingCapital()}
            className="mt-3 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400"
          >
            Sauvegarder capital
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2">60j: {formatCurrency(projection(currentCash, 60))}</div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2">90j: {formatCurrency(projection(currentCash, 90))}</div>
          </div>
        </div>

        <form onSubmit={addEntry} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-white">Encoder revenu / depense</h2>
          <div className="mt-3 grid gap-3">
            <select
              value={entryForm.type}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, type: event.target.value as "inflow" | "outflow" }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              <option value="inflow">Revenu</option>
              <option value="outflow">Depense</option>
            </select>
            <input
              value={entryForm.label}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Ex: Meta Ads / CA Shopify"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={entryForm.amount}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <input
              type="date"
              value={entryForm.date}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, date: event.target.value }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <button className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/30">
              Ajouter transaction
            </button>
          </div>
        </form>

        <form onSubmit={addRecurring} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-white">Abos recurrents</h2>
          <p className="mt-1 text-sm text-slate-400">Fixes et variables mensuels pour estimer le burn.</p>
          <div className="mt-3 grid gap-3">
            <input
              value={recurringForm.label}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="Ex: Shopify, Apps, SAV"
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={recurringForm.amount}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <select
              value={recurringForm.costType}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, costType: event.target.value as "fixed" | "variable" }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              <option value="fixed">Fixe</option>
              <option value="variable">Variable</option>
            </select>
            <select
              value={recurringForm.cadence}
              onChange={(event) =>
                setRecurringForm((prev) => ({
                  ...prev,
                  cadence: event.target.value as "weekly" | "monthly" | "quarterly",
                }))
              }
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            >
              <option value="weekly">Chaque semaine</option>
              <option value="monthly">Chaque mois</option>
              <option value="quarterly">Chaque trimestre</option>
            </select>
            <input
              type="date"
              value={recurringForm.nextChargeDate}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, nextChargeDate: event.target.value }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
            />
            <button className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30">
              Ajouter recurrent
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h2 className="text-base font-medium text-white">Journal entrees / sorties</h2>
          <div className="mt-3 space-y-2">
            {operationalEntries.length === 0 ? <p className="text-sm text-slate-400">Aucune transaction pour l&apos;instant.</p> : null}
            {operationalEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-200">{entry.label}</p>
                  <p className="text-xs text-slate-500">{entry.date} - {getTeamMemberLabel(entry.userId)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={entry.type === "inflow" ? "text-emerald-300" : "text-rose-300"}>
                    {entry.type === "inflow" ? "+" : "-"}
                    {formatCurrency(entry.amount)}
                  </p>
                  <button type="button" onClick={() => void removeEntry(entry.id)} className="text-rose-300 hover:text-rose-200" aria-label="Delete entry">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <h2 className="text-base font-medium text-white">Recurrents mensuels (fixe + variable)</h2>
          <div className="mt-3 space-y-2">
            {recurring.length === 0 ? <p className="text-sm text-slate-400">Aucun cout recurrent configure.</p> : null}
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-200">{item.label}</p>
                  <p className="text-xs text-slate-500">
                    {item.costType === "fixed" ? "Fixe" : "Variable"} - {item.cadence} - Prochain: {item.nextChargeDate ?? "N/A"} - {getTeamMemberLabel(item.userId)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-amber-300">{formatCurrency(monthlyEquivalent(item))}/mois</p>
                  <button type="button" onClick={() => void removeRecurring(item.id)} className="text-rose-300 hover:text-rose-200" aria-label="Delete recurring">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-300">
              Fixe/mois: <strong>{formatCurrency(monthlyFixed)}</strong>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-300">
              Variable/mois: <strong>{formatCurrency(monthlyVariable)}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
