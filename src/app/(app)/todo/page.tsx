"use client";

import { TEAM_MEMBERS, getTeamMemberLabel } from "@/lib/team";
import type { TodoItem } from "@/types/domain";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function TodoPage() {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [actorUserId, setActorUserId] = useState<string>(TEAM_MEMBERS[0].id);
  const [form, setForm] = useState({
    title: "",
    details: "",
    priority: "medium" as "low" | "medium" | "high",
    status: "todo" as "todo" | "in_progress" | "done",
    dueDate: new Date().toISOString().slice(0, 10),
    assignee: "Associate A",
  });

  const loadItems = async () => {
    const response = await fetch("/api/todo", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const payload = (await response.json()) as { items: TodoItem[] };
    setItems(payload.items);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadItems();
  }, []);

  const createItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      return;
    }
    await fetch("/api/todo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, title: form.title.trim(), actorUserId }),
    });
    setForm((prev) => ({ ...prev, title: "", details: "" }));
    await loadItems();
  };

  const patchItem = async (item: TodoItem, nextStatus: TodoItem["status"]) => {
    await fetch("/api/todo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, actorUserId, status: nextStatus }),
    });
    await loadItems();
  };

  const removeItem = async (id: string) => {
    await fetch(`/api/todo?id=${id}`, { method: "DELETE" });
    await loadItems();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Team To-Do</h1>
        <p className="mt-2 text-base text-slate-600">Shared action board for you and your associate.</p>
      </header>

      <form onSubmit={createItem} className="fin-panel grid gap-3 p-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700 sm:col-span-2">
          Author
          <select className="fin-input mt-1" value={actorUserId} onChange={(event) => setActorUserId(event.target.value)}>
            {TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>{member.label}</option>
            ))}
          </select>
        </label>
        <input className="fin-input sm:col-span-2" placeholder="Task title" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
        <textarea className="fin-input min-h-[80px] sm:col-span-2" placeholder="Details" value={form.details} onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))} />
        <select className="fin-input" value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as "low" | "medium" | "high" }))}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <select className="fin-input" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as "todo" | "in_progress" | "done" }))}>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <input className="fin-input" type="date" value={form.dueDate} onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))} />
        <select className="fin-input" value={form.assignee} onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}>
          <option value="Associate A">Associate A</option>
          <option value="Associate B">Associate B</option>
        </select>
        <button className="fin-btn-primary px-4 py-2 text-sm sm:col-span-2">Add Task</button>
      </form>

      <section className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="fin-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{item.details}</p>
                <p className="mt-2 text-xs text-slate-500">{item.assignee} • Due {item.dueDate ?? "N/A"} • {getTeamMemberLabel(item.userId)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="fin-pill px-2 py-1 text-xs">{item.priority}</span>
                <select className="fin-input w-[130px]" value={item.status} onChange={(event) => void patchItem(item, event.target.value as TodoItem["status"])}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <button className="fin-btn-danger inline-flex items-center px-2 py-2" type="button" onClick={() => void removeItem(item.id)}>
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
