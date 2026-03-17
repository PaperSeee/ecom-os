"use client";

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
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">LaunchPad Checklist</h1>
          <p className="mt-1 text-base text-slate-600">Interactive pre-launch execution flow with critical safeguards.</p>
        </div>
        <div className="fin-panel p-3 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500">Statut</p>
          <p className={`mt-1 font-semibold ${canLaunch ? "text-emerald-700" : "text-rose-700"}`}>
            {canLaunch ? "Ready to Launch" : "Ready to Launch bloque"}
          </p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="fin-panel p-4 md:col-span-2">
          <ProgressBar value={progress} label="Progression globale lancement" />
        </div>
        <div className="fin-panel p-4">
          <label htmlFor="actor" className="text-xs uppercase tracking-wide text-slate-400">
            Auteur modif
          </label>
          <select
            id="actor"
            className="fin-input mb-3 mt-2"
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
            className="fin-input mt-2"
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
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            activeCategory === "All" ? "border-zinc-300 bg-zinc-100 text-zinc-900" : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              activeCategory === category ? "border-zinc-300 bg-zinc-100 text-zinc-900" : "border-slate-200 bg-white text-slate-600"
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
            className="fin-panel p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{task.category}</p>
                <h2 className="text-base font-semibold text-slate-900">{task.title}</h2>
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
                  className="fin-input px-2.5 py-1.5 text-xs"
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
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                    task.isCritical
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {task.isCritical ? "Critique" : "Standard"}
                </button>

                <button
                  type="button"
                  onClick={() => void patchTask(task.id, "toggle-validation")}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    task.validatedAt
                      ? "bg-slate-200 text-slate-700"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
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
