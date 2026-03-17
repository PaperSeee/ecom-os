"use client";

import { TEAM_MEMBERS } from "@/lib/team";
import { useEffect, useState } from "react";

interface Campaign {
  id: string;
  platform: "Meta" | "TikTok";
  name: string;
  budget: number;
  roas: number;
  status: "active" | "testing" | "paused";
}

interface ScalingLog {
  id: string;
  campaign_id: string;
  decision: "Increase Budget" | "Cut" | "Test New Angle";
  note: string;
  author: string;
  created_at: string;
}

export default function AdsScalingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [logs, setLogs] = useState<ScalingLog[]>([]);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [campaignForm, setCampaignForm] = useState({
    platform: "Meta" as "Meta" | "TikTok",
    name: "",
    budget: 0,
    roas: 0,
    status: "testing" as "active" | "testing" | "paused",
  });
  const [logForm, setLogForm] = useState({
    campaignId: "",
    decision: "Test New Angle" as "Increase Budget" | "Cut" | "Test New Angle",
    note: "",
    author: "Ilias",
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAds();
  }, []);

  const createCampaign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "campaign", actorUserId, ...campaignForm }),
    });
    setCampaignForm({ platform: "Meta", name: "", budget: 0, roas: 0, status: "testing" });
    await loadAds();
  };

  const updateCampaign = async (campaign: Campaign) => {
    await fetch("/api/ads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: campaign.id, actorUserId, budget: campaign.budget, roas: campaign.roas, status: campaign.status, name: campaign.name }),
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
    await fetch("/api/ads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "log", actorUserId, ...logForm }),
    });
    setLogForm({ campaignId: "", decision: "Test New Angle", note: "", author: logForm.author });
    await loadAds();
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
            <select value={campaignForm.status} onChange={(event) => setCampaignForm((prev) => ({ ...prev, status: event.target.value as "active" | "testing" | "paused" }))} className="fin-input">
              <option value="active">active</option>
              <option value="testing">testing</option>
              <option value="paused">paused</option>
            </select>
            <input value={campaignForm.name} onChange={(event) => setCampaignForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Campaign name" className="fin-input sm:col-span-2" />
            <input type="number" step="0.01" value={campaignForm.budget} onChange={(event) => setCampaignForm((prev) => ({ ...prev, budget: Number(event.target.value) }))} placeholder="Budget" className="fin-input" />
            <input type="number" step="0.01" value={campaignForm.roas} onChange={(event) => setCampaignForm((prev) => ({ ...prev, roas: Number(event.target.value) }))} placeholder="ROAS" className="fin-input" />
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
              <input type="number" step="0.01" className="fin-input px-2 py-1" value={campaign.budget} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, budget: Number(event.target.value) } : item))} />
              <input type="number" step="0.01" className="fin-input px-2 py-1" value={campaign.roas} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, roas: Number(event.target.value) } : item))} />
              <select className="fin-input px-2 py-1" value={campaign.status} onChange={(event) => setCampaigns((prev) => prev.map((item) => item.id === campaign.id ? { ...item, status: event.target.value as "active" | "testing" | "paused" } : item))}>
                <option value="active">active</option>
                <option value="testing">testing</option>
                <option value="paused">paused</option>
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
              {new Date(log.created_at).toLocaleString("fr-FR")} - {log.author}
            </p>
            <button type="button" onClick={() => void deleteLog(log.id)} className="fin-btn-danger mt-2 px-2 py-1 text-xs">
              Delete
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
