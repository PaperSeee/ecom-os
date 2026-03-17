-- Product + Campaign + ToDo feature upgrade
-- Run after schema.sql and workspace_audit_migration.sql

alter table public.products
  add column if not exists image_url text,
  add column if not exists product_url text,
  add column if not exists competitors text;

alter table public.campaigns
  add column if not exists daily_budget numeric(12,2);

update public.campaigns
set daily_budget = budget
where daily_budget is null;

alter table public.campaigns
  alter column daily_budget set default 0;

alter table public.campaigns
  alter column daily_budget set not null;

alter table public.campaigns
  drop constraint if exists campaigns_status_check;

update public.campaigns
set status = 'scaling'
where status = 'active';

alter table public.campaigns
  add constraint campaigns_status_check check (status in ('testing', 'paused', 'stopped', 'scaling'));

create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  details text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  due_date date,
  assignee text not null default 'Associate A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_todo_items_workspace_id on public.todo_items(workspace_id);

alter table public.todo_items enable row level security;

drop policy if exists todo_items_workspace_all on public.todo_items;
create policy todo_items_workspace_all on public.todo_items
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop trigger if exists trg_todo_items_updated_at on public.todo_items;
create trigger trg_todo_items_updated_at
before update on public.todo_items
for each row execute function public.set_updated_meta();
