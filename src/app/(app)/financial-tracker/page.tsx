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
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Financial Tracker</h1>
        <p className="mt-2 text-base text-slate-600">Real-time treasury, recurring costs & monthly projections</p>
      </header>

      {risk ? (
        <AlertBanner
          title="Cash runway risk"
          description="Projected treasury is below operational safety threshold."
          severity="critical"
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="fin-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Current Treasury</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(currentCash)}</p>
        </article>
        <article className="fin-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Est. Expenses/Month</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(monthlyEstimatedExpenses)}</p>
        </article>
        <article className="fin-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">Month-End Projection</p>
          <p className={`mt-2 text-xl font-semibold ${projectedEndOfMonth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(projectedEndOfMonth)}
          </p>
        </article>
        <article className="fin-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">30-Day Projection</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(projection(currentCash, 30))}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="fin-card rounded-2xl p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-slate-900">Starting Capital</h2>
          <p className="mt-1 text-sm text-slate-600">Initial treasury balance - update anytime.</p>
          <label className="mt-3 block text-sm text-slate-700">
            Author
            <select
              value={actorUserId}
              onChange={(event) => setActorUserId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            >
              {TEAM_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm text-slate-700">
            Starting Capital (EUR)
            <input
              type="number"
              step="0.01"
              value={startingCapital}
              onChange={(event) => setStartingCapital(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={() => void saveStartingCapital()}
            className="fin-btn-primary mt-3 px-4 py-2 text-sm"
          >
            Sauvegarder capital
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">60d: {formatCurrency(projection(currentCash, 60))}</div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">90d: {formatCurrency(projection(currentCash, 90))}</div>
          </div>
        </div>

        <form onSubmit={addEntry} className="fin-card rounded-2xl p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-slate-900">Add Revenue / Expense</h2>
          <div className="mt-3 grid gap-3">
            <select
              value={entryForm.type}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, type: event.target.value as "inflow" | "outflow" }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            >
              <option value="inflow">Revenue</option>
              <option value="outflow">Expense</option>
            </select>
            <input
              value={entryForm.label}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="e.g., Meta Ads / Shopify Revenue"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={entryForm.amount}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              className="fin-input"
            />
            <input
              type="date"
              value={entryForm.date}
              onChange={(event) => setEntryForm((prev) => ({ ...prev, date: event.target.value }))}
              className="fin-input"
            />
            <button className="rounded-lg bg-green-100 px-4 py-2 text-sm text-green-700 hover:bg-green-200">
              Add Transaction
            </button>
          </div>
        </form>

        <form onSubmit={addRecurring} className="fin-card rounded-2xl p-4 xl:col-span-1">
          <h2 className="text-base font-medium text-slate-900">Recurring Costs</h2>
          <p className="mt-1 text-sm text-slate-600">Fixed & variable monthly to estimate burn.</p>
          <div className="mt-3 grid gap-3">
            <input
              value={recurringForm.label}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, label: event.target.value }))}
              placeholder="e.g., Shopify, Apps, Support"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={recurringForm.amount}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, amount: Number(event.target.value) }))}
              className="fin-input"
            />
            <select
              value={recurringForm.costType}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, costType: event.target.value as "fixed" | "variable" }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            >
              <option value="fixed">Fixed</option>
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <input
              type="date"
              value={recurringForm.nextChargeDate}
              onChange={(event) => setRecurringForm((prev) => ({ ...prev, nextChargeDate: event.target.value }))}
              className="fin-input"
            />
            <button className="fin-btn-soft px-4 py-2 text-sm">
              Add Recurring
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="fin-card rounded-2xl p-4">
          <h2 className="text-base font-medium text-slate-900">Transaction Log</h2>
          <div className="mt-3 space-y-2">
            {operationalEntries.length === 0 ? <p className="text-sm text-slate-500">No transactions yet.</p> : null}
            {operationalEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-900">{entry.label}</p>
                  <p className="text-xs text-slate-500">{entry.date} - {getTeamMemberLabel(entry.userId)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={entry.type === "inflow" ? "text-green-600" : "text-red-600"}>
                    {entry.type === "inflow" ? "+" : "-"}
                    {formatCurrency(entry.amount)}
                  </p>
                  <button type="button" onClick={() => void removeEntry(entry.id)} className="text-red-600 hover:text-red-700" aria-label="Delete entry">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fin-card rounded-2xl p-4">
          <h2 className="text-base font-medium text-slate-900">Monthly Recurring (Fixed + Variable)</h2>
          <div className="mt-3 space-y-2">
            {recurring.length === 0 ? <p className="text-sm text-slate-500">No recurring costs configured.</p> : null}
            {recurring.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">
                    {item.costType === "fixed" ? "Fixed" : "Variable"} • {item.cadence} • Next: {item.nextChargeDate ?? "N/A"} • {getTeamMemberLabel(item.userId)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-amber-600">{formatCurrency(monthlyEquivalent(item))}/mo</p>
                  <button type="button" onClick={() => void removeRecurring(item.id)} className="text-red-600 hover:text-red-700" aria-label="Delete recurring">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              Fixed/mo: <strong>{formatCurrency(monthlyFixed)}</strong>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              Variable/mo: <strong>{formatCurrency(monthlyVariable)}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
