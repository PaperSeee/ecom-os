"use client";

import type { Competitor } from "@/types/domain";
import { useEffect, useMemo, useState } from "react";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [niche, setNiche] = useState<string>("All");
  const [minimumThreat, setMinimumThreat] = useState<number>(0);

  useEffect(() => {
    const loadCompetitors = async () => {
      const response = await fetch("/api/competitors", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { competitors: Competitor[] };
      setCompetitors(payload.competitors);
    };

    void loadCompetitors();
  }, []);

  const niches = useMemo(
    () => ["All", ...Array.from(new Set(competitors.map((competitor) => competitor.niche)))],
    [competitors],
  );

  const filtered = competitors.filter(
    (competitor) =>
      (niche === "All" || competitor.niche === niche) && competitor.threatScore >= minimumThreat,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Spy & Competitor Tracker</h1>
        <p className="mt-2 text-sm text-slate-400">Filtre par niche et score de menace.</p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          Niche
          <select
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2"
          >
            {niches.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">
          Menace minimum: {minimumThreat}
          <input
            type="range"
            min={0}
            max={100}
            value={minimumThreat}
            onChange={(event) => setMinimumThreat(Number(event.target.value))}
            className="mt-3 w-full"
          />
        </label>
      </section>

      <section className="grid gap-3">
        {filtered.map((competitor) => (
          <article key={competitor.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-medium text-white">{competitor.brandName}</h2>
              <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs text-rose-200">
                Threat {competitor.threatScore}/100
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">{competitor.marketingAngle}</p>
            <p className="mt-1 text-sm text-slate-500">{competitor.observations}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-cyan-200">
              <a href={competitor.storeUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Store URL
              </a>
              <a href={competitor.adLibraryUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                Ad Library
              </a>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
