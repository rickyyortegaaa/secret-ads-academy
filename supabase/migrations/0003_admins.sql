-- Migración 0003: tablas de admin team management.
-- Aplicar UNA sola vez en Supabase SQL Editor.
--
-- Razón: pasar de single-admin (env var) a multi-admin con BD.
-- - admins: usuarios admin activos con password hash (scrypt).
-- - admin_invitations: invitaciones pendientes con token de un solo uso.

create table if not exists public.admins (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  created_by_email text,
  last_login_at timestamptz
);
create index if not exists admins_email_lower_idx on public.admins (lower(email));

create table if not exists public.admin_invitations (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  token text unique not null,
  invited_by_email text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);
create index if not exists admin_invitations_token_idx on public.admin_invitations (token);

alter table public.admins enable row level security;
alter table public.admin_invitations enable row level security;

create policy "deny all anon" on public.admins
  for all to anon using (false) with check (false);
create policy "deny all anon" on public.admin_invitations
  for all to anon using (false) with check (false);
