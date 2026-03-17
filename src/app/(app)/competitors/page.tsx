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

  const loadCompetitors = async () => {
    try {
      const response = await fetch("/api/competitors", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { competitors: Competitor[] };
      setCompetitors(payload.competitors);
    } catch {
      // Keep screen stable when network calls are interrupted.
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCompetitors();
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
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Spy & Competitor Tracker</h1>
        <p className="mt-2 text-base text-slate-600">Track, filter and update your competitor intelligence in real time.</p>
      </header>

      <form onSubmit={submit} className="fin-panel grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700 sm:col-span-2">
          Edit author
          <select
            value={actorUserId}
            onChange={(event) => setActorUserId(event.target.value)}
            className="fin-input mt-1"
          >
            {TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </label>
        <input value={form.brandName} onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))} placeholder="Brand name" className="fin-input" />
        <input value={form.niche} onChange={(event) => setForm((prev) => ({ ...prev, niche: event.target.value }))} placeholder="Niche" className="fin-input" />
        <input value={form.storeUrl} onChange={(event) => setForm((prev) => ({ ...prev, storeUrl: event.target.value }))} placeholder="Store URL" className="fin-input" />
        <input value={form.adLibraryUrl} onChange={(event) => setForm((prev) => ({ ...prev, adLibraryUrl: event.target.value }))} placeholder="Ad library URL" className="fin-input" />
        <input value={form.marketingAngle} onChange={(event) => setForm((prev) => ({ ...prev, marketingAngle: event.target.value }))} placeholder="Marketing angle" className="fin-input sm:col-span-2" />
        <input value={form.observations} onChange={(event) => setForm((prev) => ({ ...prev, observations: event.target.value }))} placeholder="Observations" className="fin-input sm:col-span-2" />
        <label className="text-sm text-slate-700 sm:col-span-2">
          Threat score: {form.threatScore}
          <input type="range" min={0} max={100} value={form.threatScore} onChange={(event) => setForm((prev) => ({ ...prev, threatScore: Number(event.target.value) }))} className="mt-2 w-full" />
        </label>
        <button className="fin-btn-primary px-4 py-2 text-sm sm:col-span-2">
          {editingId ? "Update competitor" : "Add competitor"}
        </button>
      </form>

      <section className="fin-panel grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Niche
          <select
            value={niche}
            onChange={(event) => setNiche(event.target.value)}
            className="fin-input mt-1"
          >
            {niches.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
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
          <article key={competitor.id} className="fin-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">{competitor.brandName}</h2>
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs text-rose-700">
                Threat {competitor.threatScore}/100
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{competitor.marketingAngle}</p>
            <p className="mt-1 text-sm text-slate-500">{competitor.observations}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-700">
              <a href={competitor.storeUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-zinc-900">
                Store URL
              </a>
              <a href={competitor.adLibraryUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-zinc-900">
                Ad Library
              </a>
              <button type="button" onClick={() => startEdit(competitor)} className="fin-btn-soft px-2 py-1">
                Edit
              </button>
              <button type="button" onClick={() => void removeCompetitor(competitor.id)} className="fin-btn-danger px-2 py-1">
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
