"use client";

import { formatCurrency } from "@/lib/financial";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

type CogsMode = "percent" | "fixed-per-order";
type ScenarioKey = "pessimistic" | "base" | "aggressive";

interface SimulationRow {
  day: number;
  label: string;
  adSpend: number;
  grossRevenue: number;
  cogsOut: number;
  payoutFeesOut: number;
  vatOut: number;
  refundsOut: number;
  payoutIn: number;
  netFlow: number;
  balance: number;
  effectiveMarginPercent: number;
}

interface ChartRow {
  day: number;
  label: string;
  pessimistic: number;
  base: number;
  aggressive: number;
}

interface ScenarioSimulation {
  rows: SimulationRow[];
  breakDay: number | null;
  endBalance: number;
  minBalance: number;
  avgMarginPercent: number;
}

interface ScenarioConfig {
  budgetMultiplier: number;
  roasMultiplier: number;
  payoutDelayOffsetDays: number;
  cogsPercentOffset: number;
  fixedCogsMultiplier: number;
  refundPercentOffset: number;
}

const CashFlowChart = dynamic(() => import("./cash-flow-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/70 text-sm text-zinc-400">
      Chargement du graphique...
    </div>
  ),
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const scenarioConfigs: Record<ScenarioKey, ScenarioConfig> = {
  pessimistic: {
    budgetMultiplier: 1,
    roasMultiplier: 0.8,
    payoutDelayOffsetDays: 2,
    cogsPercentOffset: 5,
    fixedCogsMultiplier: 1.1,
    refundPercentOffset: 2,
  },
  base: {
    budgetMultiplier: 1,
    roasMultiplier: 1,
    payoutDelayOffsetDays: 0,
    cogsPercentOffset: 0,
    fixedCogsMultiplier: 1,
    refundPercentOffset: 0,
  },
  aggressive: {
    budgetMultiplier: 1.08,
    roasMultiplier: 1.15,
    payoutDelayOffsetDays: -1,
    cogsPercentOffset: -3,
    fixedCogsMultiplier: 0.95,
    refundPercentOffset: -1,
  },
};

export default function CashFlowPredictorPage() {
  const [startingCapital, setStartingCapital] = useState<number>(1500);
  const [dailyAdBudget, setDailyAdBudget] = useState<number>(80);
  const [roas, setRoas] = useState<number>(1.9);
  const [netMarginPercent, setNetMarginPercent] = useState<number>(20);
  const [payoutDelayDays, setPayoutDelayDays] = useState<number>(5);
  const [horizonDays, setHorizonDays] = useState<number>(60);
  const [cogsMode, setCogsMode] = useState<CogsMode>("percent");
  const [cogsPercent, setCogsPercent] = useState<number>(35);
  const [cogsPerOrder, setCogsPerOrder] = useState<number>(12);
  const [avgOrderValue, setAvgOrderValue] = useState<number>(45);
  const [scalingEnabled, setScalingEnabled] = useState<boolean>(true);
  const [scalingIncreasePercent, setScalingIncreasePercent] = useState<number>(20);
  const [scalingEveryDays, setScalingEveryDays] = useState<number>(7);
  const [paymentFeePercent, setPaymentFeePercent] = useState<number>(3);
  const [vatPercent, setVatPercent] = useState<number>(20);
  const [refundPercent, setRefundPercent] = useState<number>(4);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("base");

  const simulation = useMemo(() => {
    const runScenario = (scenarioKey: ScenarioKey): ScenarioSimulation => {
      const rows: SimulationRow[] = [];
      const delayedPayouts = new Map<number, number>();

      const config = scenarioConfigs[scenarioKey];
      const scenarioPayoutDelay = clamp(payoutDelayDays + config.payoutDelayOffsetDays, 1, 21);
      const scenarioRefundPercent = clamp(refundPercent + config.refundPercentOffset, 0, 40);
      const scenarioCogsPercent = clamp(cogsPercent + config.cogsPercentOffset, 0, 95);

      let balance = startingCapital;
      let breakDay: number | null = null;

      for (let day = 1; day <= horizonDays; day += 1) {
        const scalingFactor =
          scalingEnabled && scalingEveryDays > 0
            ? Math.floor((day - 1) / scalingEveryDays)
            : 0;

        const adSpend =
          dailyAdBudget *
          config.budgetMultiplier *
          (1 + (scalingIncreasePercent / 100)) ** scalingFactor;

        const grossRevenue = adSpend * Math.max(0.2, roas * config.roasMultiplier);
        const cogsOut =
          cogsMode === "percent"
            ? grossRevenue * (scenarioCogsPercent / 100)
            : (grossRevenue / Math.max(10, avgOrderValue)) * Math.max(0, cogsPerOrder * config.fixedCogsMultiplier);

        const payoutFeesOut = grossRevenue * (clamp(paymentFeePercent, 0, 12) / 100);
        const vatOut = grossRevenue * (clamp(vatPercent, 0, 30) / 100);
        const refundsOut = grossRevenue * (scenarioRefundPercent / 100);
        const payoutIn = Math.max(0, grossRevenue - payoutFeesOut - vatOut - refundsOut);

        const payoutDay = day + scenarioPayoutDelay;
        delayedPayouts.set(payoutDay, (delayedPayouts.get(payoutDay) ?? 0) + payoutIn);

        const payoutInToday = delayedPayouts.get(day) ?? 0;
        const netFlow = payoutInToday - adSpend - cogsOut;
        balance += netFlow;

        if (breakDay === null && balance < 0) {
          breakDay = day;
        }

        const effectiveMargin = grossRevenue > 0 ? ((payoutIn - adSpend - cogsOut) / grossRevenue) * 100 : 0;

        rows.push({
          day,
          label: `J+${day}`,
          adSpend,
          grossRevenue,
          cogsOut,
          payoutFeesOut,
          vatOut,
          refundsOut,
          payoutIn: payoutInToday,
          netFlow,
          balance,
          effectiveMarginPercent: effectiveMargin,
        });
      }

      return {
        rows,
        breakDay,
        endBalance: rows[rows.length - 1]?.balance ?? startingCapital,
        minBalance: rows.reduce((min, row) => Math.min(min, row.balance), startingCapital),
        avgMarginPercent:
          rows.length > 0
            ? rows.reduce((sum, row) => sum + row.effectiveMarginPercent, 0) / rows.length
            : 0,
      };
    };

    const byScenario: Record<ScenarioKey, ScenarioSimulation> = {
      pessimistic: runScenario("pessimistic"),
      base: runScenario("base"),
      aggressive: runScenario("aggressive"),
    };

    const chartRows: ChartRow[] = Array.from({ length: horizonDays }, (_, idx) => {
      const day = idx + 1;
      return {
        day,
        label: `J+${day}`,
        pessimistic: byScenario.pessimistic.rows[idx]?.balance ?? startingCapital,
        base: byScenario.base.rows[idx]?.balance ?? startingCapital,
        aggressive: byScenario.aggressive.rows[idx]?.balance ?? startingCapital,
      };
    });

    return {
      byScenario,
      chartRows,
    };
  }, [
    avgOrderValue,
    cogsMode,
    cogsPerOrder,
    cogsPercent,
    dailyAdBudget,
    horizonDays,
    paymentFeePercent,
    payoutDelayDays,
    refundPercent,
    roas,
    scalingEnabled,
    scalingEveryDays,
    scalingIncreasePercent,
    startingCapital,
    vatPercent,
  ]);

  const activeSimulation = simulation.byScenario[activeScenario];
  const worstBreakDay = simulation.byScenario.pessimistic.breakDay;

  const survivalLabel = activeSimulation.breakDay
    ? `ALERTE : RUPTURE DE CASH A J+${activeSimulation.breakDay}`
    : "SURVIE : ILLIMITEE";

  const recommendation = useMemo(() => {
    if (activeSimulation.breakDay && activeSimulation.breakDay <= 14) {
      return "Risque eleve de rupture proche: baisse le budget ads de 15% a 30% ou reduis le COGS pour retrouver de l oxygene.";
    }
    if (worstBreakDay) {
      return "Le scenario pessimiste casse le cash. Priorise un payout plus court et limite le scaling a court terme.";
    }
    if (activeSimulation.avgMarginPercent < netMarginPercent) {
      return "Ta marge effective est sous la cible. Renegocie COGS, optimise frais de paiement ou augmente le panier moyen.";
    }
    return "Projection saine sur les scenarios. Tu peux scaler progressivement en gardant un suivi journalier du ROAS et des remboursements.";
  }, [activeSimulation.avgMarginPercent, activeSimulation.breakDay, netMarginPercent, worstBreakDay]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-zinc-100">
        <h1 className="text-3xl font-bold">Cash-flow Predictor</h1>
        <p className="mt-2 text-sm text-zinc-400">Simulation 30 a 60 jours avec decalage de payout Stripe/Shopify.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-12">
        <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 xl:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">Configuration</h2>

          <label className="block text-sm text-zinc-300">
            Capital de depart
            <input
              type="number"
              value={startingCapital}
              onChange={(event) => setStartingCapital(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Budget Ads Quotidien: {formatCurrency(dailyAdBudget)}
            <input
              type="range"
              min={20}
              max={500}
              step={5}
              value={dailyAdBudget}
              onChange={(event) => setDailyAdBudget(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            ROAS estime: {roas.toFixed(1)}x
            <input
              type="range"
              min={0.8}
              max={4}
              step={0.1}
              value={roas}
              onChange={(event) => setRoas(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Marge nette estimee (%): {netMarginPercent}%
            <input
              type="range"
              min={5}
              max={60}
              step={1}
              value={netMarginPercent}
              onChange={(event) => setNetMarginPercent(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-zinc-300">
              Frais paiement (%): {paymentFeePercent}%
              <input
                type="range"
                min={0}
                max={8}
                step={0.2}
                value={paymentFeePercent}
                onChange={(event) => setPaymentFeePercent(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>

            <label className="block text-sm text-zinc-300">
              Remboursements (%): {refundPercent}%
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={refundPercent}
                onChange={(event) => setRefundPercent(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>
          </div>

          <label className="block text-sm text-zinc-300">
            TVA provisionnee (%): {vatPercent}%
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={vatPercent}
              onChange={(event) => setVatPercent(Number(event.target.value))}
              className="mt-2 w-full"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Delai de payout (jours)
            <input
              type="number"
              min={1}
              max={14}
              value={payoutDelayDays}
              onChange={(event) => setPayoutDelayDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Horizon simulation (jours)
            <input
              type="number"
              min={30}
              max={60}
              value={horizonDays}
              onChange={(event) => setHorizonDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            Mode COGS
            <select
              value={cogsMode}
              onChange={(event) => setCogsMode(event.target.value as CogsMode)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            >
              <option value="percent">% du chiffre d affaires</option>
              <option value="fixed-per-order">Montant fixe par vente</option>
            </select>
          </label>

          {cogsMode === "percent" ? (
            <label className="block text-sm text-zinc-300">
              COGS (%): {cogsPercent}%
              <input
                type="range"
                min={5}
                max={80}
                step={1}
                value={cogsPercent}
                onChange={(event) => setCogsPercent(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-zinc-300">
                COGS / vente
                <input
                  type="number"
                  min={0}
                  value={cogsPerOrder}
                  onChange={(event) => setCogsPerOrder(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                />
              </label>
              <label className="block text-sm text-zinc-300">
                AOV moyen
                <input
                  type="number"
                  min={10}
                  value={avgOrderValue}
                  onChange={(event) => setAvgOrderValue(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                />
              </label>
            </div>
          )}

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-3">
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={scalingEnabled}
                onChange={(event) => setScalingEnabled(event.target.checked)}
              />
              Scaling progressif
            </label>

            {scalingEnabled ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-zinc-300">
                  +X%
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={scalingIncreasePercent}
                    onChange={(event) => setScalingIncreasePercent(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
                <label className="text-sm text-zinc-300">
                  Tous les Y jours
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={scalingEveryDays}
                    onChange={(event) => setScalingEveryDays(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-4 xl:col-span-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Solde initial</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(startingCapital)}</p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Solde min</p>
              <p className={`mt-2 text-2xl font-semibold ${activeSimulation.minBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(activeSimulation.minBalance)}
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Solde J+{horizonDays}</p>
              <p className={`mt-2 text-2xl font-semibold ${activeSimulation.endBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(activeSimulation.endBalance)}
              </p>
            </article>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveScenario("pessimistic")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "pessimistic" ? "bg-red-900 text-red-100" : "border border-zinc-700 text-zinc-300"
              }`}
            >
              Pessimiste
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario("base")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "base" ? "bg-zinc-100 text-zinc-900" : "border border-zinc-700 text-zinc-300"
              }`}
            >
              Base
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario("aggressive")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "aggressive" ? "bg-emerald-900 text-emerald-100" : "border border-zinc-700 text-zinc-300"
              }`}
            >
              Agressif
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Evolution du Cash</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeSimulation.breakDay ? "bg-red-950 text-red-300" : "bg-emerald-950 text-emerald-300"}`}>
                {survivalLabel}
              </span>
            </div>

            <div className="h-[320px] min-h-[320px] min-w-0">
              <CashFlowChart rows={simulation.chartRows} />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
            <h2 className="text-base font-semibold">Recommandation</h2>
            <p className="mt-2 text-sm text-zinc-300">{recommendation}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
        <h2 className="text-base font-semibold">Tableau de simulation jour par jour ({activeScenario})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Jour</th>
                <th className="px-3 py-2">Sorties Ads</th>
                <th className="px-3 py-2">Sorties COGS</th>
                <th className="px-3 py-2">Frais + TVA + Remb.</th>
                <th className="px-3 py-2">Entrees Payout</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">Solde</th>
              </tr>
            </thead>
            <tbody>
              {activeSimulation.rows.map((row) => (
                <tr key={row.day} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-red-300">-{formatCurrency(row.adSpend)}</td>
                  <td className="px-3 py-2 text-red-300">-{formatCurrency(row.cogsOut)}</td>
                  <td className="px-3 py-2 text-amber-300">-{formatCurrency(row.payoutFeesOut + row.vatOut + row.refundsOut)}</td>
                  <td className="px-3 py-2 text-emerald-300">+{formatCurrency(row.payoutIn)}</td>
                  <td className={`px-3 py-2 ${row.netFlow >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {row.netFlow >= 0 ? "+" : ""}
                    {formatCurrency(row.netFlow)}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${row.balance >= 0 ? "text-zinc-100" : "text-red-300"}`}>
                    {formatCurrency(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}