"use client";

import { AlertBanner } from "@/components/ui/alert-banner";
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

  const blockers = dashboard?.blockers ?? [];
  const progress = dashboard?.progress ?? 0;
  const kpis = dashboard?.kpis ?? [];
  const chartData = dashboard?.chartData ?? [];
  const alerts = dashboard?.alerts ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Executive Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Pilotage business dropshipping et priorites de lancement.</p>
      </header>

      {blockers.length > 0 ? (
        <AlertBanner
          title="Blocage critique pre-launch detecte"
          description={`Taches critiques non validees: ${blockers.map((task) => task.title).join(" | ")}`}
          severity="critical"
        />
      ) : null}

      {alerts.map((alert) => (
        <AlertBanner key={alert.id} title={alert.title} description={alert.description} severity={alert.severity} />
      ))}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((kpi) => (
          <StatsCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            trendValue={kpi.trendValue}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <PerformanceChart data={chartData} />
        </div>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-sm font-medium text-white">LaunchPad Status</p>
          <ProgressBar value={progress} label="Progression globale lancement" />
          <Stepper
            steps={launchSteps}
            currentStep={progress < 45 ? 0 : progress < 90 ? 1 : blockers.length > 0 ? 1 : 2}
          />
          <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ready to Launch</p>
            <p className="mt-1 text-base font-semibold text-white">
              {blockers.length === 0 && progress >= 90 ? "Eligible" : "Bloque"}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
