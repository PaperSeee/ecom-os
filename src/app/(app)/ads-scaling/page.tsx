"use client";

import { formatDateEU, formatDateTimeEU } from "@/lib/date";
import { TEAM_MEMBERS } from "@/lib/team";
import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  platform: "Meta" | "TikTok";
  name: string;
  budget: number;
  daily_budget?: number;
  roas: number;
  status: "testing" | "paused" | "stopped" | "scaling";
}

interface ScalingLog {
  id: string;
  campaign_id: string;
  decision: "Increase Budget" | "Cut" | "Test New Angle";
  note: string;
  author: string;
  created_at: string;
}

interface DailyStat {
  id: string;
  campaign_id: string;
  stat_date: string;
  roas: number;
  cpm: number;
  spend: number;
  budget_reached: boolean;
  notes: string;
  created_at: string;
}

export default function AdsScalingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<ScalingLog[]>([]);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [campaignForm, setCampaignForm] = useState({
    platform: "Meta" as "Meta" | "TikTok",
    name: "",
    dailyBudget: 0,
    roas: 0,
    status: "testing" as "testing" | "paused" | "stopped" | "scaling",
  });
  const [logForm, setLogForm] = useState({
    campaignId: "",
    decision: "Test New Angle" as "Increase Budget" | "Cut" | "Test New Angle",
    note: "",
    author: "Ilias",
  });
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [dailyForm, setDailyForm] = useState({
    campaignId: "",
    statDate: new Date().toISOString().slice(0, 10),
    roas: 0,
    cpm: 0,
    spend: 0,
    budgetReached: false,
    notes: "",
  });

  const loadAds = async () => {
    try {
      const response = await fetch("/api/ads", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { campaigns: Campaign[]; logs: ScalingLog[] };
      setCampaigns(payload.campaigns);
      setLogs(payload.logs);
    } catch {
      // Keep current state when network requests are interrupted.
    }
  };

  const loadDailyStats = async () => {
    try {
      const response = await fetch("/api/ads/daily", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { stats: DailyStat[] };
      setDailyStats(payload.stats);
    } catch {
      // Keep current state when network requests are interrupted.
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAds();
    void loadDailyStats();
  }, []);

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "campaign", actorUserId, budget: campaignForm.dailyBudget, ...campaignForm }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Erreur inconnue" }))) as { error?: string };
      alert(payload.error ?? "Impossible de creer la campagne");
      return;
    }

    setCampaignForm({ platform: "Meta", name: "", dailyBudget: 0, roas: 0, status: "testing" });
    await loadAds();
  };

  const updateCampaign = async (campaign: Campaign) => {
    await fetch("/api/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.id, actorUserId, dailyBudget: campaign.daily_budget ?? campaign.budget, roas: campaign.roas, status: campaign.status, name: campaign.name }),
    });
    await loadAds();
  };

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/ads?entity=campaign&id=${id}`, { method: "DELETE" });
    await loadAds();
  };

  const createLog = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!logForm.campaignId) {
      return;
    }
    const response = await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "log", actorUserId, ...logForm }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Erreur inconnue" }))) as { error?: string };
      alert(payload.error ?? "Impossible de creer le log");
      return;
    }

    setLogForm({ campaignId: "", decision: "Test New Angle", note: "", author: logForm.author });
    await loadAds();
  };

  const createDailyStat = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dailyForm.campaignId) {
      return;
    }

    const response = await fetch("/api/ads/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorUserId,
        campaignId: dailyForm.campaignId,
        statDate: dailyForm.statDate,
        roas: dailyForm.roas,
        cpm: dailyForm.cpm,
        spend: dailyForm.spend,
        budgetReached: dailyForm.budgetReached,
        notes: dailyForm.notes,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Erreur inconnue" }))) as { error?: string };
      alert(payload.error ?? "Impossible d'ajouter le suivi journalier");
      return;
    }

    setDailyForm((prev) => ({ ...prev, roas: 0, cpm: 0, spend: 0, notes: "" }));
    await loadDailyStats();
  };

  const deleteDailyStat = async (id: string) => {
    await fetch(`/api/ads/daily?id=${id}`, { method: "DELETE" });
    await loadDailyStats();
  };

  const deleteLog = async (id: string) => {
    await fetch(`/api/ads?entity=log&id=${id}`, { method: "DELETE" });
    await loadAds();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Ads & Scaling Manager</h1>
        <p className="mt-2 text-base text-slate-600">Interactive campaign cockpit with cleaner analytics workflow.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={createCampaign} className="fin-panel p-5">
          <h2 className="text-base font-semibold text-slate-900">New Campaign</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} className="fin-input sm:col-span-2">
              {TEAM_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>{member.label}</option>
              ))}
            </select>
            <select value={campaignForm.platform} onChange={(event) => setCampaignForm((prev) => ({ ...prev, platform: event.target.value as "Meta" | "TikTok" }))} className="fin-input">
              <option value="Meta">Meta</option>
              <option value="TikTok">TikTok</option>
            </select>
            <select value={campaignForm.status} onChange={(event) => setCampaignForm((prev) => ({ ...prev, status: event.target.value as "testing" | "paused" | "stopped" | "scaling" }))} className="fin-input">
              <option value="testing">testing</option>
              <option value="paused">paused</option>
              <option value="stopped">stopped</option>
              <option value="scaling">scaling</option>
            </select>
            <input value={campaignForm.name} onChange={(event) => setCampaignForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Campaign name" className="fin-input sm:col-span-2" />
            <label className="text-xs text-slate-500">
              Budget journalier
              <input type="number" step="0.01" value={campaignForm.dailyBudget} onChange={(event) => setCampaignForm((prev) => ({ ...prev, dailyBudget: Number(event.target.value) }))} placeholder="0" className="fin-input mt-1" />
            </label>
            <label className="text-xs text-slate-500">
              ROAS actuel
              <input type="number" step="0.01" value={campaignForm.roas} onChange={(event) => setCampaignForm((prev) => ({ ...prev, roas: Number(event.target.value) }))} placeholder="0" className="fin-input mt-1" />
            </label>
            <button className="fin-btn-primary px-4 py-2 text-sm sm:col-span-2 interactive-pulse">Add Campaign</button>
          </div>
        </form>

        <form onSubmit={createLog} className="fin-panel p-5">
          <h2 className="text-base font-semibold text-slate-900">New Decision Log</h2>
          <div className="mt-3 grid gap-3">
            <select value={logForm.campaignId} onChange={(event) => setLogForm((prev) => ({ ...prev, campaignId: event.target.value }))} className="fin-input">
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
            </select>
            <select value={logForm.decision} onChange={(event) => setLogForm((prev) => ({ ...prev, decision: event.target.value as "Increase Budget" | "Cut" | "Test New Angle" }))} className="fin-input">
              <option value="Increase Budget">Increase Budget</option>
              <option value="Cut">Cut</option>
              <option value="Test New Angle">Test New Angle</option>
            </select>
            <input value={logForm.author} onChange={(event) => setLogForm((prev) => ({ ...prev, author: event.target.value }))} placeholder="Author" className="fin-input" />
            <textarea value={logForm.note} onChange={(event) => setLogForm((prev) => ({ ...prev, note: event.target.value }))} placeholder="Decision notes" className="fin-input min-h-[88px]" />
            <button className="fin-btn-soft px-4 py-2 text-sm">Add Log</button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="fin-panel p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{campaign.platform}</p>
            <input className="fin-input mt-1 text-base font-semibold" value={campaign.name} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, name: event.target.value } : item))} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-700">
              <input type="number" step="0.01" className="fin-input px-2 py-1" value={campaign.daily_budget ?? campaign.budget} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, daily_budget: Number(event.target.value), budget: Number(event.target.value) } : item))} />
              <input type="number" step="0.01" className="fin-input px-2 py-1" value={campaign.roas} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, roas: Number(event.target.value) } : item))} />
              <select className="fin-input px-2 py-1" value={campaign.status} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, status: event.target.value as "testing" | "paused" | "stopped" | "scaling" } : item))}>
                <option value="testing">testing</option>
                <option value="paused">paused</option>
                <option value="stopped">stopped</option>
                <option value="scaling">scaling</option>
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void updateCampaign(campaign)} className="fin-btn-soft px-2.5 py-1 text-xs">Save</button>
              <button type="button" onClick={() => void deleteCampaign(campaign.id)} className="fin-btn-danger px-2.5 py-1 text-xs">Delete</button>
            </div>
          </article>
        ))}
      </section>

      <section className="fin-panel space-y-3 p-4">
        <h2 className="text-base font-semibold text-slate-900">Decision History</h2>
        {logs.map((log) => (
          <article key={log.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{log.decision}</p>
            <p className="mt-1">{log.note}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatDateTimeEU(log.created_at)} - {log.author}
            </p>
            <button type="button" onClick={() => void deleteLog(log.id)} className="fin-btn-danger mt-2 px-2 py-1 text-xs">
              Delete
            </button>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={createDailyStat} className="fin-panel p-5">
          <h2 className="text-base font-semibold text-slate-900">Daily Performance Update</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <select value={dailyForm.campaignId} onChange={(event) => setDailyForm((prev) => ({ ...prev, campaignId: event.target.value }))} className="fin-input sm:col-span-2">
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
            <label className="text-xs text-slate-500">
              Date de suivi
              <input type="date" className="fin-input mt-1" value={dailyForm.statDate} onChange={(event) => setDailyForm((prev) => ({ ...prev, statDate: event.target.value }))} />
            </label>
            <label className="text-xs text-slate-500">
              ROAS
              <input type="number" step="0.01" className="fin-input mt-1" value={dailyForm.roas} onChange={(event) => setDailyForm((prev) => ({ ...prev, roas: Number(event.target.value) }))} />
            </label>
            <label className="text-xs text-slate-500">
              CPM
              <input type="number" step="0.01" className="fin-input mt-1" value={dailyForm.cpm} onChange={(event) => setDailyForm((prev) => ({ ...prev, cpm: Number(event.target.value) }))} />
            </label>
            <label className="text-xs text-slate-500">
              Spend du jour
              <input type="number" step="0.01" className="fin-input mt-1" value={dailyForm.spend} onChange={(event) => setDailyForm((prev) => ({ ...prev, spend: Number(event.target.value) }))} />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={dailyForm.budgetReached} onChange={(event) => setDailyForm((prev) => ({ ...prev, budgetReached: event.target.checked }))} />
              Budget journalier atteint
            </label>
            <textarea className="fin-input min-h-[90px] sm:col-span-2" placeholder="Notes quotidiennes..." value={dailyForm.notes} onChange={(event) => setDailyForm((prev) => ({ ...prev, notes: event.target.value }))} />
            <button className="fin-btn-primary px-4 py-2 text-sm sm:col-span-2">Save Daily Update</button>
          </div>
        </form>

        <div className="fin-panel p-5">
          <h2 className="text-base font-semibold text-slate-900">Daily Stats History</h2>
          <div className="mt-3 space-y-2">
            {dailyStats.length === 0 ? <p className="text-sm text-slate-500">No daily stats yet.</p> : null}
            {dailyStats.map((stat) => (
              <article key={stat.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-900">{campaigns.find((c) => c.id === stat.campaign_id)?.name ?? "Campaign"}</p>
                <p className="mt-1 text-slate-700">{formatDateEU(stat.stat_date)} • ROAS {stat.roas.toFixed(2)} • CPM {stat.cpm.toFixed(2)} • Spend {stat.spend.toFixed(2)} EUR</p>
                <p className="text-xs text-slate-500">Budget atteint: {stat.budget_reached ? "Oui" : "Non"}</p>
                {stat.notes ? <p className="mt-1 text-xs text-slate-600">{stat.notes}</p> : null}
                <button type="button" onClick={() => void deleteDailyStat(stat.id)} className="fin-btn-danger mt-2 px-2 py-1 text-xs">Delete</button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
