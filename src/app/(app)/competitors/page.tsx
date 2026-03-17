"use client";

import { TEAM_MEMBERS } from "@/lib/team";
import type { Competitor } from "@/types/domain";
import { useEffect, useMemo, useState } from "react";

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [niche, setNiche] = useState<string>("All");
  const [minimumThreat, setMinimumThreat] = useState<number>(0);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [form, setForm] = useState({
    brandName: "",
    niche: "",
    storeUrl: "https://",
    adLibraryUrl: "https://",
    marketingAngle: "",
    observations: "",
    threatScore: 50,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadCompetitors = async (signal?: AbortSignal) => {
    const response = await fetch("/api/competitors", { cache: "no-store", signal });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { competitors: Competitor[] };
    if (signal?.aborted) {
      return;
    }
    setCompetitors(payload.competitors);
  };

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompetitors(controller.signal);

    return () => {
      controller.abort();
    };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.brandName.trim() || !form.niche.trim()) {
      return;
    }

    if (editingId) {
      await fetch("/api/competitors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, actorUserId, ...form }),
      });
    } else {
      await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorUserId, ...form }),
      });
    }

    setForm({
      brandName: "",
      niche: "",
      storeUrl: "https://",
      adLibraryUrl: "https://",
      marketingAngle: "",
      observations: "",
      threatScore: 50,
    });
    setEditingId(null);
    await loadCompetitors();
  };

  const startEdit = (competitor: Competitor) => {
    setEditingId(competitor.id);
    setForm({
      brandName: competitor.brandName,
      niche: competitor.niche,
      storeUrl: competitor.storeUrl,
      adLibraryUrl: competitor.adLibraryUrl,
      marketingAngle: competitor.marketingAngle,
      observations: competitor.observations,
      threatScore: competitor.threatScore,
    });
  };

  const removeCompetitor = async (id: string) => {
    await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
    await loadCompetitors();
  };

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
        <p className="mt-2 text-sm text-slate-400">Filtre, edition et suppression de vos concurrents.</p>
      </header>

      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-300 sm:col-span-2">
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
        <input value={form.brandName} onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))} placeholder="Nom marque" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2" />
        <input value={form.niche} onChange={(event) => setForm((prev) => ({ ...prev, niche: event.target.value }))} placeholder="Niche" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2" />
        <input value={form.storeUrl} onChange={(event) => setForm((prev) => ({ ...prev, storeUrl: event.target.value }))} placeholder="URL store" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2" />
        <input value={form.adLibraryUrl} onChange={(event) => setForm((prev) => ({ ...prev, adLibraryUrl: event.target.value }))} placeholder="URL ad library" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2" />
        <input value={form.marketingAngle} onChange={(event) => setForm((prev) => ({ ...prev, marketingAngle: event.target.value }))} placeholder="Angle marketing" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 sm:col-span-2" />
        <input value={form.observations} onChange={(event) => setForm((prev) => ({ ...prev, observations: event.target.value }))} placeholder="Observations" className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 sm:col-span-2" />
        <label className="text-sm text-slate-300 sm:col-span-2">
          Threat score: {form.threatScore}
          <input type="range" min={0} max={100} value={form.threatScore} onChange={(event) => setForm((prev) => ({ ...prev, threatScore: Number(event.target.value) }))} className="mt-2 w-full" />
        </label>
        <button className="rounded-lg bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/30 sm:col-span-2">
          {editingId ? "Mettre a jour" : "Ajouter concurrent"}
        </button>
      </form>

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
              <button type="button" onClick={() => startEdit(competitor)} className="rounded-md border border-cyan-400/30 px-2 py-1 text-cyan-200">
                Modifier
              </button>
              <button type="button" onClick={() => void removeCompetitor(competitor.id)} className="rounded-md border border-rose-400/30 px-2 py-1 text-rose-200">
                Supprimer
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
