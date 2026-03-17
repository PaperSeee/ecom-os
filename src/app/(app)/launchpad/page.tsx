"use client";

import { AlertBanner } from "@/components/ui/alert-banner";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getTeamMemberLabel, TEAM_MEMBERS } from "@/lib/team";
import type { Associate, ChecklistCategory } from "@/types/domain";
import { Check, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const categories: ChecklistCategory[] = ["Research", "Shop", "Creatives", "Technical"];
const associates: Associate[] = ["Associate A", "Associate B"];
interface LaunchpadTaskApi {
  id: string;
  title: string;
  category: ChecklistCategory;
  isCritical: boolean;
  assignee: Associate;
  validatedAt: string | null;
  validatedBy: Associate | null;
  sortOrder: number;
  userId?: string;
  updatedAt?: string;
}

const computeProgress = (tasks: LaunchpadTaskApi[]): number =>
  tasks.length === 0 ? 0 : Math.round((tasks.filter((task) => Boolean(task.validatedAt)).length / tasks.length) * 100);

const computeBlockers = (tasks: LaunchpadTaskApi[]): LaunchpadTaskApi[] =>
  tasks.filter((task) => task.isCritical && !task.validatedAt);

export default function LaunchpadPage() {
  const [tasks, setTasks] = useState<LaunchpadTaskApi[]>([]);
  const [activeCategory, setActiveCategory] = useState<ChecklistCategory | "All">("All");
  const [validator, setValidator] = useState<Associate>("Associate A");
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);

  const fetchTasks = async (): Promise<LaunchpadTaskApi[]> => {
    const response = await fetch("/api/launchpad", { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as { tasks: LaunchpadTaskApi[] };
    return payload.tasks;
  };

  const loadTasks = async () => {
    const nextTasks = await fetchTasks();
    setTasks(nextTasks);
  };

  useEffect(() => {
    void fetchTasks().then((nextTasks) => {
      setTasks(nextTasks);
    });
  }, []);

  const patchTask = async (
    taskId: string,
    action: "assign" | "toggle-critical" | "toggle-validation",
    value?: string,
  ) => {
    await fetch("/api/launchpad", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, action, value, validator, actorUserId }),
    });
    await loadTasks();
  };

  const filteredTasks = useMemo(
    () =>
      tasks
        .filter((task) => activeCategory === "All" || task.category === activeCategory)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [activeCategory, tasks],
  );

  const blockers = computeBlockers(tasks);
  const progress = computeProgress(tasks);
  const canLaunch = blockers.length === 0 && progress === 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">LaunchPad Checklist</h1>
          <p className="mt-1 text-sm text-slate-400">Checklist interactive pre-launch avec logique bloqueur.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-wide text-slate-500">Statut</p>
          <p className={`mt-1 font-semibold ${canLaunch ? "text-emerald-300" : "text-rose-300"}`}>
            {canLaunch ? "Ready to Launch" : "Ready to Launch bloque"}
          </p>
        </div>
      </header>

      {blockers.length > 0 ? (
        <AlertBanner
          title="Bloqueur critique actif"
          description={`Impossible de valider Ready to Launch: ${blockers.map((b) => b.title).join(" | ")}`}
          severity="critical"
        />
      ) : (
        <AlertBanner
          title="Aucun bloqueur critique"
          description="Toutes les taches critiques sont validees."
          severity="info"
        />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <ProgressBar value={progress} label="Progression globale lancement" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <label htmlFor="actor" className="text-xs uppercase tracking-wide text-slate-400">
            Auteur modif
          </label>
          <select
            id="actor"
            className="mt-2 mb-3 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring"
            value={actorUserId}
            onChange={(event) => setActorUserId(event.target.value)}
          >
            {TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>

          <label htmlFor="validator" className="text-xs uppercase tracking-wide text-slate-400">
            Valide par
          </label>
          <select
            id="validator"
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none ring-cyan-400 focus:ring"
            value={validator}
            onChange={(event) => setValidator(event.target.value as Associate)}
          >
            {associates.map((associate) => (
              <option key={associate} value={associate}>
                {associate}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("All")}
          className={`rounded-full px-3 py-1.5 text-xs ${
            activeCategory === "All" ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-900 text-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              activeCategory === category ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-900 text-slate-300"
            }`}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="space-y-3">
        {filteredTasks.map((task) => (
          <article
            key={task.id}
            className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 transition hover:border-white/20"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{task.category}</p>
                <h2 className="text-base font-medium text-white">{task.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {task.validatedAt
                    ? `Valide par ${task.validatedBy} le ${new Date(task.validatedAt).toLocaleString("fr-FR")}`
                    : "Non valide"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Derniere modif: {getTeamMemberLabel(task.userId)}
                  {task.updatedAt ? ` - ${new Date(task.updatedAt).toLocaleString("fr-FR")}` : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={`Assignee for ${task.title}`}
                  value={task.assignee}
                  onChange={(event) => void patchTask(task.id, "assign", event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {associates.map((associate) => (
                    <option key={associate} value={associate}>
                      {associate}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void patchTask(task.id, "toggle-critical")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${
                    task.isCritical
                      ? "border-rose-400/50 bg-rose-500/10 text-rose-200"
                      : "border-white/10 bg-slate-900 text-slate-300"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {task.isCritical ? "Critique" : "Standard"}
                </button>

                <button
                  type="button"
                  onClick={() => void patchTask(task.id, "toggle-validation")}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    task.validatedAt
                      ? "bg-slate-700 text-slate-200"
                      : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {task.validatedAt ? "Annuler validation" : "Valider"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
