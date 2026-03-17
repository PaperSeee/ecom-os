"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { StatsCard } from "@/components/ui/stats-card";
import { Stepper } from "@/components/ui/stepper";
import type { DashboardKpi } from "@/types/domain";
import dynamic from "next/dynamic";
import { formatDateEU } from "@/lib/date";
import { useEffect, useMemo, useState } from "react";

const PerformanceChart = dynamic(
  () => import("@/components/charts/performance-chart").then((mod) => mod.PerformanceChart),
  { ssr: false },
);

const launchSteps = ["Validation produit", "Setup acquisition", "Ready to Launch"];
const EMPTY_CHART_DATA: Array<{ label: string; revenue: number; spend: number; profit: number }> = [];

interface DashboardPayload {
  kpis: DashboardKpi[];
  blockers: Array<{ title: string }>;
  alerts: Array<{ id: string; title: string; description: string; severity: "critical" | "warning" | "info" }>;
  progress: number;
  chartData: Array<{ label: string; revenue: number; spend: number; profit: number }>;
  generatedAt?: string;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as DashboardPayload;
      setDashboard(payload);
    };
    void fetchDashboard();
  }, []);

  const progress = dashboard?.progress ?? 0;
  const kpis = dashboard?.kpis ?? [];
  const chartData = dashboard?.chartData ?? EMPTY_CHART_DATA;
  const blockers = dashboard?.blockers ?? [];
  const alerts = dashboard?.alerts ?? [];

  const snapshot = useMemo(() => {
    const revenue7d = chartData.reduce((sum, row) => sum + row.revenue, 0);
    const spend7d = chartData.reduce((sum, row) => sum + row.spend, 0);
    const profit7d = chartData.reduce((sum, row) => sum + row.profit, 0);
    return { revenue7d, spend7d, profit7d };
  }, [chartData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="fin-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Executive Dashboard</h1>
            <p className="mt-2 text-base text-slate-600">Real-time business intelligence and execution signal</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Last sync: {dashboard?.generatedAt ? formatDateEU(dashboard.generatedAt) : formatDateEU(new Date())}
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.length === 0 ? (
          <div className="col-span-full fin-card rounded-2xl p-8 text-center">
            <p className="text-slate-500">Loading KPIs...</p>
          </div>
        ) : (
          kpis.map((kpi) => (
            <StatsCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              trendValue={kpi.trendValue}
            />
          ))
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="fin-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenue 7d</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.revenue7d.toFixed(2)} EUR</p>
        </article>
        <article className="fin-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Spend 7d</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.spend7d.toFixed(2)} EUR</p>
        </article>
        <article className="fin-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Profit 7d</p>
          <p className={`mt-2 text-2xl font-semibold ${snapshot.profit7d >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {snapshot.profit7d.toFixed(2)} EUR
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PerformanceChart data={chartData} />
        </div>
        <div className="space-y-4 fin-card rounded-2xl p-4">
          <p className="text-sm font-medium text-slate-900">LaunchPad Status</p>
          <ProgressBar value={progress} label="Progression globale lancement" />
          <Stepper
            steps={launchSteps}
            currentStep={progress < 45 ? 0 : progress < 90 ? 1 : 2}
          />
          <div className="rounded-xl border border-zinc-200 bg-zinc-100 p-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ready to Launch</p>
            <p className="mt-1 text-base font-semibold text-zinc-900">
              {progress >= 90 ? "Eligible" : "In Progress"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Critical blockers</p>
            <p className={`mt-1 text-base font-semibold ${blockers.length === 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {blockers.length === 0 ? "No blocker" : `${blockers.length} blocker(s)`}
            </p>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className="fin-panel p-4">
          <h2 className="text-base font-semibold text-slate-900">Operational Alerts</h2>
          <div className="mt-3 grid gap-2">
            {alerts.map((alert) => (
              <article key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                <p className="text-xs text-slate-600">{alert.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}