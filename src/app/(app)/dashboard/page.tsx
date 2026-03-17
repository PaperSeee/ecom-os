"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { StatsCard } from "@/components/ui/stats-card";
import { Stepper } from "@/components/ui/stepper";
import type { DashboardKpi } from "@/types/domain";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PerformanceChart = dynamic(
  () => import("@/components/charts/performance-chart").then((mod) => mod.PerformanceChart),
  { ssr: false },
);

const launchSteps = ["Validation produit", "Setup acquisition", "Ready to Launch"];

interface DashboardPayload {
  kpis: DashboardKpi[];
  blockers: Array<{ title: string }>;
  alerts: Array<{ id: string; title: string; description: string; severity: "critical" | "warning" | "info" }>;
  progress: number;
  chartData: Array<{ label: string; revenue: number; spend: number; profit: number }>;
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
  const chartData = dashboard?.chartData ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Executive Dashboard</h1>
        <p className="mt-2 text-base text-slate-600">Real-time business intelligence & KPIs</p>
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
        </div>
      </section>
    </div>
  );
}