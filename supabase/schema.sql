-- E-COM-OS Supabase Schema
-- Run in Supabase SQL Editor (or local supabase migration)

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  product_cost numeric(12,2) not null check (product_cost >= 0),
  shipping_cost numeric(12,2) not null check (shipping_cost >= 0),
  cpa_estimated numeric(12,2) not null check (cpa_estimated >= 0),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.checklist_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('Research', 'Shop', 'Creatives', 'Technical')),
  is_critical boolean not null default false,
  assignee text not null check (assignee in ('Associate A', 'Associate B')),
  validated_at timestamptz,
  validated_by text check (validated_by in ('Associate A', 'Associate B')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_checklist_tasks_updated_at
before update on public.checklist_tasks
for each row execute function public.set_updated_at();

create table if not exists public.checklist_task_validations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_task_id uuid not null references public.checklist_tasks(id) on delete cascade,
  validated_by text not null check (validated_by in ('Associate A', 'Associate B')),
  validated_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_name text not null,
  niche text not null,
  store_url text not null,
  ad_library_url text not null,
  marketing_angle text,
  observations text,
  threat_score int not null default 0 check (threat_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_competitors_updated_at
before update on public.competitors
for each row execute function public.set_updated_at();

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('Meta', 'TikTok')),
  name text not null,
  budget numeric(12,2) not null check (budget >= 0),
  roas numeric(10,2) not null default 0,
  status text not null check (status in ('active', 'testing', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create table if not exists public.scaling_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  decision text not null check (decision in ('Increase Budget', 'Cut', 'Test New Angle')),
  note text,
  author text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cashflow_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('inflow', 'outflow')),
  label text not null,
  amount numeric(12,2) not null check (amount >= 0),
  entry_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  severity text not null check (severity in ('critical', 'warning', 'info')),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_products_user_id on public.products(user_id);
create index if not exists idx_checklist_tasks_user_id on public.checklist_tasks(user_id);
create index if not exists idx_checklist_task_validations_user_id on public.checklist_task_validations(user_id);
create index if not exists idx_competitors_user_id on public.competitors(user_id);
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_scaling_logs_user_id on public.scaling_logs(user_id);
create index if not exists idx_cashflow_entries_user_id on public.cashflow_entries(user_id);
create index if not exists idx_alerts_user_id on public.alerts(user_id);

alter table public.products enable row level security;
alter table public.checklist_tasks enable row level security;
alter table public.checklist_task_validations enable row level security;
alter table public.competitors enable row level security;
alter table public.campaigns enable row level security;
alter table public.scaling_logs enable row level security;
alter table public.cashflow_entries enable row level security;
alter table public.alerts enable row level security;

create policy "products_owner_all" on public.products
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "checklist_tasks_owner_all" on public.checklist_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "checklist_task_validations_owner_all" on public.checklist_task_validations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "competitors_owner_all" on public.competitors
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "campaigns_owner_all" on public.campaigns
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "scaling_logs_owner_all" on public.scaling_logs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "cashflow_entries_owner_all" on public.cashflow_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "alerts_owner_all" on public.alerts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
