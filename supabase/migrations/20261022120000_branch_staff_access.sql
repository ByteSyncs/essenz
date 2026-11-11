create table if not exists public.branch_access (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  token uuid not null default gen_random_uuid(),
  enabled boolean not null default false,
  staff_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branch_access_token_key unique (token),
  constraint branch_access_enabled_requires_user check (not enabled or staff_user_id is not null)
);

alter table public.branch_access enable row level security;

revoke all on public.branch_access from anon, authenticated;
grant select, insert, update, delete on public.branch_access to service_role;

alter table public.organization_settings
  add column if not exists staff_can_edit_settings boolean not null default false;
