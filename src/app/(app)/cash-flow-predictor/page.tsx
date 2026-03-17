"use client";

import { formatCurrency } from "@/lib/financial";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

type ScenarioKey = "pessimistic" | "base" | "aggressive";

interface SimulationRow {
  day: number;
  label: string;
  adSpend: number;
  grossRevenue: number;
  payoutFeesOut: number;
  vatOut: number;
  refundsOut: number;
  pendingPayout: number;
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
  mcP10?: number;
  mcP50?: number;
  mcP90?: number;
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
  refundPercentOffset: number;
}

interface MonteCarloSummary {
  breakProbability: number;
  p10EndBalance: number;
  p50EndBalance: number;
  p90EndBalance: number;
  medianBreakDay: number | null;
  dailyP10: number[];
  dailyP50: number[];
  dailyP90: number[];
}

const CashFlowChart = dynamic(() => import("./cash-flow-chart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
      Chargement du graphique...
    </div>
  ),
});

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) {
    return sorted[lower];
  }
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

const seededNoise = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const fractional = x - Math.floor(x);
  return fractional * 2 - 1;
};

const applyNoise = (value: number, volatilityPercent: number, seed: number): number => {
  const drift = seededNoise(seed) * (volatilityPercent / 100);
  return value * (1 + drift);
};

const collectWeeklyPayout = (
  delayedPayouts: Map<number, number>,
  day: number,
  isPayoutDay: boolean,
): { payoutInToday: number; pendingPayout: number } => {
  let payoutInToday = 0;
  let pendingPayout = 0;

  for (const [eligibleDay, amount] of delayedPayouts.entries()) {
    if (eligibleDay <= day) {
      if (isPayoutDay) {
        payoutInToday += amount;
        delayedPayouts.delete(eligibleDay);
      } else {
        pendingPayout += amount;
      }
    }
  }

  return { payoutInToday, pendingPayout };
};

const scenarioConfigs: Record<ScenarioKey, ScenarioConfig> = {
  pessimistic: {
    budgetMultiplier: 1,
    roasMultiplier: 0.8,
    payoutDelayOffsetDays: 2,
    refundPercentOffset: 2,
  },
  base: {
    budgetMultiplier: 1,
    roasMultiplier: 1,
    payoutDelayOffsetDays: 0,
    refundPercentOffset: 0,
  },
  aggressive: {
    budgetMultiplier: 1.08,
    roasMultiplier: 1.15,
    payoutDelayOffsetDays: -1,
    refundPercentOffset: -1,
  },
};

export default function CashFlowPredictorPage() {
  const [startingCapital, setStartingCapital] = useState<number>(1500);
  const [dailyAdBudget, setDailyAdBudget] = useState<number>(80);
  const [roas, setRoas] = useState<number>(1.9);
  const [netMarginPercent, setNetMarginPercent] = useState<number>(20);
  const [payoutDelayDays, setPayoutDelayDays] = useState<number>(5);
  const [payoutCadenceDays, setPayoutCadenceDays] = useState<number>(7);
  const [firstPayoutInDays, setFirstPayoutInDays] = useState<number>(7);
  const [horizonDays, setHorizonDays] = useState<number>(60);
  const [scalingEnabled, setScalingEnabled] = useState<boolean>(true);
  const [scalingIncreasePercent, setScalingIncreasePercent] = useState<number>(20);
  const [scalingEveryDays, setScalingEveryDays] = useState<number>(7);
  const [paymentFeePercent, setPaymentFeePercent] = useState<number>(3);
  const [vatPercent, setVatPercent] = useState<number>(20);
  const [refundPercent, setRefundPercent] = useState<number>(4);
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>("base");
  const [monteCarloEnabled, setMonteCarloEnabled] = useState<boolean>(false);
  const [mcIterations, setMcIterations] = useState<number>(400);
  const [mcRoasVolatility, setMcRoasVolatility] = useState<number>(18);
  const [mcRefundVolatility, setMcRefundVolatility] = useState<number>(25);
  const [mcPayoutJitterDays, setMcPayoutJitterDays] = useState<number>(1);

  const simulation = useMemo(() => {
    const cadence = Math.max(1, payoutCadenceDays);
    const firstPayout = clamp(firstPayoutInDays, 1, 21);

    const runScenario = (scenarioKey: ScenarioKey): ScenarioSimulation => {
      const rows: SimulationRow[] = [];
      const delayedPayouts = new Map<number, number>();

      const config = scenarioConfigs[scenarioKey];
      const scenarioPayoutDelay = clamp(payoutDelayDays + config.payoutDelayOffsetDays, 1, 21);
      const scenarioRefundPercent = clamp(refundPercent + config.refundPercentOffset, 0, 40);

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
        const payoutFeesOut = grossRevenue * (clamp(paymentFeePercent, 0, 12) / 100);
        const vatOut = grossRevenue * (clamp(vatPercent, 0, 30) / 100);
        const refundsOut = grossRevenue * (scenarioRefundPercent / 100);
        const payoutNet = Math.max(0, grossRevenue - payoutFeesOut - vatOut - refundsOut);

        const eligiblePayoutDay = day + scenarioPayoutDelay;
        delayedPayouts.set(eligiblePayoutDay, (delayedPayouts.get(eligiblePayoutDay) ?? 0) + payoutNet);

        const isPayoutDay = day >= firstPayout && (day - firstPayout) % cadence === 0;
        const { payoutInToday, pendingPayout } = collectWeeklyPayout(delayedPayouts, day, isPayoutDay);

        const netFlow = payoutInToday - adSpend;
        balance += netFlow;

        if (breakDay === null && balance < 0) {
          breakDay = day;
        }

        const effectiveMargin = grossRevenue > 0 ? ((payoutNet - adSpend) / grossRevenue) * 100 : 0;

        rows.push({
          day,
          label: `J+${day}`,
          adSpend,
          grossRevenue,
          payoutFeesOut,
          vatOut,
          refundsOut,
          pendingPayout,
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

    let monteCarlo: MonteCarloSummary | null = null;

    if (monteCarloEnabled) {
      const iterations = clamp(Math.floor(mcIterations), 100, 3000);
      const balancesByDay: number[][] = Array.from({ length: horizonDays }, () => []);
      const endBalances: number[] = [];
      const breakDays: number[] = [];

      for (let run = 0; run < iterations; run += 1) {
        const delayedPayouts = new Map<number, number>();
        let balance = startingCapital;
        let breakDay: number | null = null;

        for (let day = 1; day <= horizonDays; day += 1) {
          const scalingFactor =
            scalingEnabled && scalingEveryDays > 0
              ? Math.floor((day - 1) / scalingEveryDays)
              : 0;

          const adSpend = dailyAdBudget * (1 + (scalingIncreasePercent / 100)) ** scalingFactor;
          const dayRoas = clamp(applyNoise(roas, mcRoasVolatility, run * 1000 + day * 7 + 11), 0.2, 8);
          const grossRevenue = adSpend * dayRoas;

          const payoutFeesOut = grossRevenue * (clamp(paymentFeePercent, 0, 12) / 100);
          const vatOut = grossRevenue * (clamp(vatPercent, 0, 30) / 100);
          const refundRate = clamp(applyNoise(refundPercent, mcRefundVolatility, run * 1000 + day * 29 + 31), 0, 40);
          const refundsOut = grossRevenue * (refundRate / 100);
          const payoutNet = Math.max(0, grossRevenue - payoutFeesOut - vatOut - refundsOut);

          const jitter =
            mcPayoutJitterDays > 0
              ? Math.round(seededNoise(run * 1000 + day * 37 + 41) * mcPayoutJitterDays)
              : 0;
          const eligiblePayoutDay = day + clamp(payoutDelayDays + jitter, 1, 21);
          delayedPayouts.set(eligiblePayoutDay, (delayedPayouts.get(eligiblePayoutDay) ?? 0) + payoutNet);

          const isPayoutDay = day >= firstPayout && (day - firstPayout) % cadence === 0;
          const { payoutInToday } = collectWeeklyPayout(delayedPayouts, day, isPayoutDay);

          const netFlow = payoutInToday - adSpend;
          balance += netFlow;

          if (breakDay === null && balance < 0) {
            breakDay = day;
          }

          balancesByDay[day - 1].push(balance);
        }

        endBalances.push(balance);
        if (breakDay !== null) {
          breakDays.push(breakDay);
        }
      }

      monteCarlo = {
        breakProbability: (breakDays.length / iterations) * 100,
        p10EndBalance: percentile(endBalances, 0.1),
        p50EndBalance: percentile(endBalances, 0.5),
        p90EndBalance: percentile(endBalances, 0.9),
        medianBreakDay: breakDays.length > 0 ? Math.round(percentile(breakDays, 0.5)) : null,
        dailyP10: balancesByDay.map((series) => percentile(series, 0.1)),
        dailyP50: balancesByDay.map((series) => percentile(series, 0.5)),
        dailyP90: balancesByDay.map((series) => percentile(series, 0.9)),
      };
    }

    const mergedChartRows = chartRows.map((row, idx) => ({
      ...row,
      mcP10: monteCarlo?.dailyP10[idx],
      mcP50: monteCarlo?.dailyP50[idx],
      mcP90: monteCarlo?.dailyP90[idx],
    }));

    return {
      byScenario,
      chartRows: mergedChartRows,
      monteCarlo,
    };
  }, [
    dailyAdBudget,
    firstPayoutInDays,
    horizonDays,
    paymentFeePercent,
    payoutCadenceDays,
    payoutDelayDays,
    refundPercent,
    roas,
    mcIterations,
    mcPayoutJitterDays,
    mcRefundVolatility,
    mcRoasVolatility,
    monteCarloEnabled,
    scalingEnabled,
    scalingEveryDays,
    scalingIncreasePercent,
    startingCapital,
    vatPercent,
  ]);

  const activeSimulation = simulation.byScenario[activeScenario];
  const worstBreakDay = simulation.byScenario.pessimistic.breakDay;
  const mcRisk = simulation.monteCarlo?.breakProbability ?? null;

  const survivalLabel = mcRisk !== null
    ? `RISQUE RUPTURE (MC): ${mcRisk.toFixed(1)}%`
    : activeSimulation.breakDay
      ? `ALERTE : RUPTURE DE CASH A J+${activeSimulation.breakDay}`
      : "SURVIE : ILLIMITEE";

  const recommendation = useMemo(() => {
    if (mcRisk !== null && mcRisk >= 45) {
      return "Monte Carlo detecte un risque critique. Coupe le budget ads, baisse le delai de payout et reduis les remboursements.";
    }
    if (mcRisk !== null && mcRisk >= 20) {
      return "Risque modere selon Monte Carlo. Ralentis le scaling et augmente ton cushion de tresorerie.";
    }
    if (activeSimulation.breakDay && activeSimulation.breakDay <= 14) {
      return "Risque eleve de rupture proche: baisse le budget ads de 15% a 30% et raccourcis le delai de payout.";
    }
    if (worstBreakDay) {
      return "Le scenario pessimiste casse le cash. Negocie un payout plus frequent et limite le scaling a court terme.";
    }
    if (activeSimulation.avgMarginPercent < netMarginPercent) {
      return "Ta marge effective est sous la cible. Optimise frais de paiement, remboursements ou augmente le panier moyen.";
    }
    return "Projection saine sur les scenarios. Tu peux scaler progressivement en gardant un suivi journalier du ROAS et des remboursements.";
  }, [activeSimulation.avgMarginPercent, activeSimulation.breakDay, mcRisk, netMarginPercent, worstBreakDay]);

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="fin-card rounded-2xl p-5">
        <h1 className="text-3xl font-bold text-slate-900">Cash-flow Predictor</h1>
        <p className="mt-2 text-sm text-slate-600">Simulation 30 a 60 jours avec payout hebdomadaire en versement unique.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-12">
        <aside className="fin-card space-y-4 rounded-2xl p-4 text-slate-900 xl:col-span-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Configuration</h2>

          <label className="block text-sm text-slate-600">
            Capital de depart
            <input
              type="number"
              value={startingCapital}
              onChange={(event) => setStartingCapital(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <label className="block text-sm text-slate-600">
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

          <label className="block text-sm text-slate-600">
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

          <label className="block text-sm text-slate-600">
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
            <label className="block text-sm text-slate-600">
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

            <label className="block text-sm text-slate-600">
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

          <label className="block text-sm text-slate-600">
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={monteCarloEnabled}
                onChange={(event) => setMonteCarloEnabled(event.target.checked)}
              />
              Mode Monte Carlo
            </label>

            {monteCarloEnabled ? (
              <div className="mt-3 space-y-3">
                <label className="block text-sm text-slate-600">
                  Iterations
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    step={100}
                    value={mcIterations}
                    onChange={(event) => setMcIterations(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                  />
                </label>

                <label className="block text-sm text-slate-600">
                  Volatilite ROAS (%): {mcRoasVolatility}%
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={1}
                    value={mcRoasVolatility}
                    onChange={(event) => setMcRoasVolatility(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block text-sm text-slate-600">
                  Volatilite remboursements (%): {mcRefundVolatility}%
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={mcRefundVolatility}
                    onChange={(event) => setMcRefundVolatility(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block text-sm text-slate-600">
                  Jitter payout (+/- jours): {mcPayoutJitterDays}
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={1}
                    value={mcPayoutJitterDays}
                    onChange={(event) => setMcPayoutJitterDays(Number(event.target.value))}
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            ) : null}
          </div>

          <label className="block text-sm text-slate-600">
            Delai de payout (jours)
            <input
              type="number"
              min={1}
              max={14}
              value={payoutDelayDays}
              onChange={(event) => setPayoutDelayDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Frequence de payout (jours)
            <input
              type="number"
              min={5}
              max={10}
              value={payoutCadenceDays}
              onChange={(event) => setPayoutCadenceDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Premier payout dans (jours)
            <input
              type="number"
              min={1}
              max={14}
              value={firstPayoutInDays}
              onChange={(event) => setFirstPayoutInDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Horizon simulation (jours)
            <input
              type="number"
              min={30}
              max={60}
              value={horizonDays}
              onChange={(event) => setHorizonDays(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={scalingEnabled}
                onChange={(event) => setScalingEnabled(event.target.checked)}
              />
              Scaling progressif
            </label>

            {scalingEnabled ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-slate-600">
                  +X%
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={scalingIncreasePercent}
                    onChange={(event) => setScalingIncreasePercent(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Tous les Y jours
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={scalingEveryDays}
                    onChange={(event) => setScalingEveryDays(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="space-y-4 xl:col-span-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="fin-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Solde initial</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(startingCapital)}</p>
            </article>
            <article className="fin-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Solde min</p>
              <p className={`mt-2 text-2xl font-semibold ${activeSimulation.minBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(activeSimulation.minBalance)}
              </p>
            </article>
            <article className="fin-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Solde J+{horizonDays}</p>
              <p className={`mt-2 text-2xl font-semibold ${activeSimulation.endBalance < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {formatCurrency(activeSimulation.endBalance)}
              </p>
            </article>
          </div>

          {simulation.monteCarlo ? (
            <div className="grid gap-4 md:grid-cols-3">
              <article className="fin-card rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Risque de rupture (MC)</p>
                <p className={`mt-2 text-2xl font-semibold ${simulation.monteCarlo.breakProbability >= 30 ? "text-red-500" : "text-emerald-600"}`}>
                  {simulation.monteCarlo.breakProbability.toFixed(1)}%
                </p>
              </article>
              <article className="fin-card rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">P50 solde final</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(simulation.monteCarlo.p50EndBalance)}</p>
              </article>
              <article className="fin-card rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Median break day</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {simulation.monteCarlo.medianBreakDay ? `J+${simulation.monteCarlo.medianBreakDay}` : "Aucune"}
                </p>
              </article>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveScenario("pessimistic")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "pessimistic"
                  ? "border border-amber-200 bg-amber-100 text-amber-800"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              Pessimiste
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario("base")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "base"
                  ? "border border-slate-900 bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              Base
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario("aggressive")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeScenario === "aggressive"
                  ? "border border-sky-200 bg-sky-100 text-sky-800"
                  : "border border-slate-300 bg-white text-slate-600"
              }`}
            >
              Agressif
            </button>
          </div>

          <div className="fin-card rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Evolution du Cash</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeSimulation.breakDay ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                {survivalLabel}
              </span>
            </div>

            <div className="h-[320px] min-h-[320px] min-w-0">
              <CashFlowChart rows={simulation.chartRows} />
            </div>
          </div>

          <div className="fin-card rounded-2xl p-4">
            <h2 className="text-base font-semibold">Recommandation</h2>
            <p className="mt-2 text-sm text-slate-600">{recommendation}</p>
          </div>
        </div>
      </section>

      <section className="fin-card rounded-2xl p-4">
        <h2 className="text-base font-semibold">Tableau de simulation jour par jour ({activeScenario})</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Jour</th>
                <th className="px-3 py-2">Sorties Ads</th>
                <th className="px-3 py-2">Retenues payout</th>
                <th className="px-3 py-2">En attente payout</th>
                <th className="px-3 py-2">Entrees Payout</th>
                <th className="px-3 py-2">Net</th>
                <th className="px-3 py-2">Solde</th>
              </tr>
            </thead>
            <tbody>
              {activeSimulation.rows.map((row) => (
                <tr key={row.day} className="border-t border-slate-200">
                  <td className="px-3 py-2">{row.label}</td>
                  <td className="px-3 py-2 text-red-600">-{formatCurrency(row.adSpend)}</td>
                  <td className="px-3 py-2 text-amber-600">-{formatCurrency(row.payoutFeesOut + row.vatOut + row.refundsOut)}</td>
                  <td className="px-3 py-2 text-slate-500">{formatCurrency(row.pendingPayout)}</td>
                  <td className="px-3 py-2 text-emerald-600">+{formatCurrency(row.payoutIn)}</td>
                  <td className={`px-3 py-2 ${row.netFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {row.netFlow >= 0 ? "+" : ""}
                    {formatCurrency(row.netFlow)}
                  </td>
                  <td className={`px-3 py-2 font-semibold ${row.balance >= 0 ? "text-slate-800" : "text-red-600"}`}>
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