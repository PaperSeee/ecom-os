"use client";

import { TEAM_MEMBERS } from "@/lib/team";
import type { SupplierAgent } from "@/types/domain";
import { Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AgentFormState {
  name: string;
  phone: string;
  contactHandle: string;
  rating: number;
  notes: string;
}

const emptyForm: AgentFormState = {
  name: "",
  phone: "",
  contactHandle: "",
  rating: 3,
  notes: "",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<SupplierAgent[]>([]);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [form, setForm] = useState<AgentFormState>(emptyForm);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadAgents = async () => {
    const response = await fetch("/api/agents", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { agents: SupplierAgent[] };
    setAgents(payload.agents);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAgents();
  }, []);

  const createAgent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }

    await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name: form.name.trim(), actorUserId }),
    });

    setForm(emptyForm);
    await loadAgents();
  };

  const updateAgent = async (agent: SupplierAgent) => {
    setSavingId(agent.id);
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: agent.id,
        actorUserId,
        name: agent.name,
        phone: agent.phone,
        contactHandle: agent.contactHandle,
        rating: agent.rating,
        notes: agent.notes,
      }),
    });
    setSavingId(null);
    await loadAgents();
  };

  const removeAgent = async (id: string) => {
    await fetch(`/api/agents?id=${id}`, { method: "DELETE" });
    await loadAgents();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Agents</h1>
        <p className="mt-2 text-base text-slate-600">Repertoire fournisseurs avec edition rapide du nom, numero, contact et note /5.</p>
      </header>

      <form onSubmit={createAgent} className="fin-panel grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700 sm:col-span-2">
          Author
          <select className="fin-input mt-1" value={actorUserId} onChange={(event) => setActorUserId(event.target.value)}>
            {TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>{member.label}</option>
            ))}
          </select>
        </label>
        <input
          className="fin-input"
          placeholder="Nom agent"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
        <input
          className="fin-input"
          placeholder="Numero"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <input
          className="fin-input"
          placeholder="Contact (Skype / lien / WhatsApp)"
          value={form.contactHandle}
          onChange={(event) => setForm((prev) => ({ ...prev, contactHandle: event.target.value }))}
        />
        <label className="text-sm text-slate-700">
          Note / 5
          <input
            className="fin-input mt-1"
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(event) => setForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
          />
        </label>
        <textarea
          className="fin-input min-h-[80px] sm:col-span-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
        />
        <button className="fin-btn-primary px-4 py-2 text-sm sm:col-span-2">Ajouter agent</button>
      </form>

      <section className="grid gap-3">
        {agents.map((agent) => (
          <article key={agent.id} className="fin-panel p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input
                className="fin-input"
                value={agent.name}
                onChange={(event) => setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, name: event.target.value } : item))}
              />
              <input
                className="fin-input"
                value={agent.phone}
                onChange={(event) => setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, phone: event.target.value } : item))}
              />
              <input
                className="fin-input"
                value={agent.contactHandle}
                onChange={(event) => setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, contactHandle: event.target.value } : item))}
              />
              <label className="text-sm text-slate-700">
                Note /5
                <input
                  className="fin-input mt-1"
                  type="number"
                  min={1}
                  max={5}
                  value={agent.rating}
                  onChange={(event) => setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, rating: Number(event.target.value) } : item))}
                />
              </label>
              <textarea
                className="fin-input min-h-[44px] md:col-span-2 xl:col-span-2"
                value={agent.notes}
                onChange={(event) => setAgents((prev) => prev.map((item) => item.id === agent.id ? { ...item, notes: event.target.value } : item))}
              />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={`${agent.id}-star-${idx}`} className={`h-4 w-4 ${idx < agent.rating ? "fill-current" : ""}`} />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="fin-btn-primary px-3 py-2 text-xs"
                  disabled={savingId === agent.id}
                  onClick={() => void updateAgent(agent)}
                >
                  {savingId === agent.id ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="fin-btn-danger inline-flex items-center px-2 py-2"
                  onClick={() => void removeAgent(agent.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
