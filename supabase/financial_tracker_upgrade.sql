-- Financial Tracker upgrade: starting capital + recurring costs
-- Run after schema.sql and workspace_audit_migration.sql

create table if not exists public.financial_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  starting_capital numeric(12,2) not null default 0,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_costs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  cost_type text not null check (cost_type in ('fixed', 'variable')),
  cadence text not null default 'monthly' check (cadence in ('weekly', 'monthly', 'quarterly')),
  next_charge_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_costs
  add column if not exists next_charge_date date;

create index if not exists idx_recurring_costs_workspace_id on public.recurring_costs(workspace_id);

alter table public.financial_settings enable row level security;
alter table public.recurring_costs enable row level security;

drop policy if exists financial_settings_workspace_all on public.financial_settings;
create policy financial_settings_workspace_all on public.financial_settings
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists recurring_costs_workspace_all on public.recurring_costs;
create policy recurring_costs_workspace_all on public.recurring_costs
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create or replace function public.set_recurring_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recurring_costs_updated_at on public.recurring_costs;
create trigger trg_recurring_costs_updated_at
before update on public.recurring_costs
for each row execute function public.set_recurring_updated_at();

-- Bootstrap financial_settings for your team workspace
insert into public.financial_settings (workspace_id, starting_capital, updated_by)
select w.id, 0, wm.user_id
from public.workspaces w
join public.workspace_members wm on wm.workspace_id = w.id
where w.name = 'E-COM-OS Team'
on conflict (workspace_id) do nothing;
