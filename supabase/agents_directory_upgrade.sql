-- Supplier agents directory upgrade
-- Run after schema.sql and workspace_audit_migration.sql

create table if not exists public.supplier_agents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  contact_handle text,
  rating smallint not null default 3 check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_supplier_agents_workspace_id on public.supplier_agents(workspace_id);
create index if not exists idx_supplier_agents_name on public.supplier_agents(name);

alter table public.supplier_agents enable row level security;

drop policy if exists supplier_agents_workspace_all on public.supplier_agents;
create policy supplier_agents_workspace_all on public.supplier_agents
for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create or replace function public.set_supplier_agents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_supplier_agents_updated_at on public.supplier_agents;
create trigger trg_supplier_agents_updated_at
before update on public.supplier_agents
for each row execute function public.set_supplier_agents_updated_at();
