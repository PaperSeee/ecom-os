-- E-COM-OS workspace sharing + audit migration
-- Run this after schema.sql and team_onboarding.sql

create extension if not exists "pgcrypto";

-- Ensure workspace core tables exist
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Add shared ownership and audit columns
alter table public.products add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.products add column if not exists created_by uuid references auth.users(id);
alter table public.products add column if not exists updated_by uuid references auth.users(id);

alter table public.checklist_tasks add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.checklist_tasks add column if not exists created_by uuid references auth.users(id);
alter table public.checklist_tasks add column if not exists updated_by uuid references auth.users(id);

alter table public.checklist_task_validations add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.checklist_task_validations add column if not exists created_by uuid references auth.users(id);
alter table public.checklist_task_validations add column if not exists updated_by uuid references auth.users(id);

alter table public.competitors add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.competitors add column if not exists created_by uuid references auth.users(id);
alter table public.competitors add column if not exists updated_by uuid references auth.users(id);

alter table public.campaigns add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.campaigns add column if not exists created_by uuid references auth.users(id);
alter table public.campaigns add column if not exists updated_by uuid references auth.users(id);

alter table public.scaling_logs add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.scaling_logs add column if not exists created_by uuid references auth.users(id);
alter table public.scaling_logs add column if not exists updated_by uuid references auth.users(id);

alter table public.cashflow_entries add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.cashflow_entries add column if not exists created_by uuid references auth.users(id);
alter table public.cashflow_entries add column if not exists updated_by uuid references auth.users(id);

alter table public.alerts add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.alerts add column if not exists created_by uuid references auth.users(id);
alter table public.alerts add column if not exists updated_by uuid references auth.users(id);

-- Backfill workspace and audit columns using your team workspace
with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.products p
set workspace_id = coalesce(p.workspace_id, team_ws.id),
    created_by = coalesce(p.created_by, p.user_id),
    updated_by = coalesce(p.updated_by, p.user_id)
from team_ws
where p.workspace_id is null or p.created_by is null or p.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.checklist_tasks t
set workspace_id = coalesce(t.workspace_id, team_ws.id),
    created_by = coalesce(t.created_by, t.user_id),
    updated_by = coalesce(t.updated_by, t.user_id)
from team_ws
where t.workspace_id is null or t.created_by is null or t.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.checklist_task_validations t
set workspace_id = coalesce(t.workspace_id, team_ws.id),
    created_by = coalesce(t.created_by, t.user_id),
    updated_by = coalesce(t.updated_by, t.user_id)
from team_ws
where t.workspace_id is null or t.created_by is null or t.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.competitors c
set workspace_id = coalesce(c.workspace_id, team_ws.id),
    created_by = coalesce(c.created_by, c.user_id),
    updated_by = coalesce(c.updated_by, c.user_id)
from team_ws
where c.workspace_id is null or c.created_by is null or c.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.campaigns c
set workspace_id = coalesce(c.workspace_id, team_ws.id),
    created_by = coalesce(c.created_by, c.user_id),
    updated_by = coalesce(c.updated_by, c.user_id)
from team_ws
where c.workspace_id is null or c.created_by is null or c.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.scaling_logs s
set workspace_id = coalesce(s.workspace_id, team_ws.id),
    created_by = coalesce(s.created_by, s.user_id),
    updated_by = coalesce(s.updated_by, s.user_id)
from team_ws
where s.workspace_id is null or s.created_by is null or s.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.cashflow_entries c
set workspace_id = coalesce(c.workspace_id, team_ws.id),
    created_by = coalesce(c.created_by, c.user_id),
    updated_by = coalesce(c.updated_by, c.user_id)
from team_ws
where c.workspace_id is null or c.created_by is null or c.updated_by is null;

with team_ws as (
  select id from public.workspaces where name = 'E-COM-OS Team' order by created_at desc limit 1
)
update public.alerts a
set workspace_id = coalesce(a.workspace_id, team_ws.id),
    created_by = coalesce(a.created_by, a.user_id),
    updated_by = coalesce(a.updated_by, a.user_id)
from team_ws
where a.workspace_id is null or a.created_by is null or a.updated_by is null;

-- Require workspace for all future rows
alter table public.products alter column workspace_id set not null;
alter table public.checklist_tasks alter column workspace_id set not null;
alter table public.checklist_task_validations alter column workspace_id set not null;
alter table public.competitors alter column workspace_id set not null;
alter table public.campaigns alter column workspace_id set not null;
alter table public.scaling_logs alter column workspace_id set not null;
alter table public.cashflow_entries alter column workspace_id set not null;
alter table public.alerts alter column workspace_id set not null;

-- Update trigger to capture updated_by
create or replace function public.set_updated_meta()
returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) ? 'updated_at') then
    new.updated_at = now();
  end if;
  if (to_jsonb(new) ? 'updated_by') then
    new.updated_by = coalesce(auth.uid(), new.updated_by, old.updated_by, old.user_id, new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products for each row execute function public.set_updated_meta();

drop trigger if exists trg_checklist_tasks_updated_at on public.checklist_tasks;
create trigger trg_checklist_tasks_updated_at before update on public.checklist_tasks for each row execute function public.set_updated_meta();

drop trigger if exists trg_competitors_updated_at on public.competitors;
create trigger trg_competitors_updated_at before update on public.competitors for each row execute function public.set_updated_meta();

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_meta();

-- Replace owner-based RLS by workspace membership RLS
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id and wm.user_id = auth.uid()
  );
$$;

drop policy if exists products_owner_all on public.products;
drop policy if exists checklist_tasks_owner_all on public.checklist_tasks;
drop policy if exists checklist_task_validations_owner_all on public.checklist_task_validations;
drop policy if exists competitors_owner_all on public.competitors;
drop policy if exists campaigns_owner_all on public.campaigns;
drop policy if exists scaling_logs_owner_all on public.scaling_logs;
drop policy if exists cashflow_entries_owner_all on public.cashflow_entries;
drop policy if exists alerts_owner_all on public.alerts;

create policy products_workspace_all on public.products
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy checklist_tasks_workspace_all on public.checklist_tasks
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy checklist_task_validations_workspace_all on public.checklist_task_validations
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy competitors_workspace_all on public.competitors
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy campaigns_workspace_all on public.campaigns
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy scaling_logs_workspace_all on public.scaling_logs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy cashflow_entries_workspace_all on public.cashflow_entries
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy alerts_workspace_all on public.alerts
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

-- Quick verification
select 'ok' as status,
       (select count(*) from public.workspace_members where workspace_id in (select id from public.workspaces where name = 'E-COM-OS Team')) as members_count;
