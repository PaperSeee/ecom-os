"use client";

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

  useEffect(() => {
    const loadAds = async () => {
      const response = await fetch("/api/ads", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as { campaigns: Campaign[]; logs: ScalingLog[] };
      setCampaigns(payload.campaigns);
      setLogs(payload.logs);
    };

    void loadAds();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Ads & Scaling Manager</h1>
        <p className="mt-2 text-sm text-slate-400">Suivi Meta/TikTok + journal de decisions.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{campaign.platform}</p>
            <h2 className="mt-1 text-base font-medium text-white">{campaign.name}</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-slate-300">
              <p>Budget: {campaign.budget} EUR</p>
              <p>ROAS: {campaign.roas.toFixed(2)}</p>
              <p>Status: {campaign.status}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <h2 className="text-base font-medium text-white">Historique des decisions</h2>
        {logs.map((log) => (
          <article key={log.id} className="rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-300">
            <p className="font-medium text-white">{log.decision}</p>
            <p className="mt-1">{log.note}</p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(log.created_at).toLocaleString("fr-FR")} - {log.author}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
