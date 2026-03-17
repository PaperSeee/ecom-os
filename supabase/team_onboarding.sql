-- Team onboarding SQL for E-COM-OS
-- Users:
-- Ilias: 655f7167-5449-43ae-ac2a-3df21d2b3d3f
-- Benzz: 3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591

-- 1) Ensure shared workspace tables exist
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

-- 2) RLS for workspace tables
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspaces.id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
for select
using (user_id = auth.uid());

-- 3) Create one shared workspace and attach both users
with ws as (
  insert into public.workspaces (name)
  values ('E-COM-OS Team')
  returning id
)
insert into public.workspace_members (workspace_id, user_id, role)
select ws.id, u.user_id, u.role
from ws
join (
  values
    ('655f7167-5449-43ae-ac2a-3df21d2b3d3f'::uuid, 'owner'::text), -- Ilias
    ('3af4cbc3-6f3e-44e4-a4e9-9ecb1fe65591'::uuid, 'member'::text) -- Benzz
) as u(user_id, role) on true;

-- 4) Verification
select w.id as workspace_id, w.name, wm.user_id, wm.role, au.email
from public.workspaces w
join public.workspace_members wm on wm.workspace_id = w.id
left join auth.users au on au.id = wm.user_id
order by w.created_at desc, wm.role desc;
