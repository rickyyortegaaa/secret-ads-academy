-- Secret Ads Academy — Schema inicial
-- Ejecutar en Supabase SQL Editor (una vez) para crear todas las tablas.

-- Extensión para uuid
create extension if not exists "uuid-ossp";

-- =========================
-- WHITELIST de emails permitidos
-- =========================
create table if not exists public.whitelist (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists whitelist_email_idx on public.whitelist (lower(email));

-- =========================
-- STUDENTS — datos del alumno (registrados al hacer login)
-- =========================
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);

-- =========================
-- QUESTIONS — banco de preguntas
-- options es un array JSON con [{id, text}]; correct_option_id apunta a uno de esos ids.
-- =========================
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  position int not null default 0,
  text text not null,
  image_url text,
  time_seconds int not null default 30,
  options jsonb not null,
  correct_option_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_position_idx on public.questions (position);

-- =========================
-- ATTEMPTS — un intento de examen por alumno
-- =========================
create table if not exists public.attempts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric,
  passed boolean,
  results_published boolean not null default false,
  tab_switches int not null default 0,
  question_order text[] not null
);

create index if not exists attempts_student_idx on public.attempts (student_id);

-- =========================
-- ANSWERS — respuesta a una pregunta dentro de un intento
-- =========================
create table if not exists public.answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected_option_id text,
  is_correct boolean,
  time_taken_ms int,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- =========================
-- SETTINGS — configuración global (1 sola fila)
-- =========================
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  pass_threshold numeric not null default 70,
  publish_results_globally boolean not null default false,
  allow_retries boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Insertar fila inicial de settings si no existe
insert into public.settings (pass_threshold, publish_results_globally, allow_retries)
select 70, false, false
where not exists (select 1 from public.settings);

-- =========================
-- ROW LEVEL SECURITY
-- =========================
alter table public.whitelist enable row level security;
alter table public.students enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.settings enable row level security;

-- Políticas: la lógica de auth la hacemos desde el server con el service role key,
-- así que por ahora bloqueamos todo a usuarios anónimos/autenticados públicos.
-- (Las llamadas server-side con service role saltan RLS).

create policy "deny all anon" on public.whitelist for all to anon using (false) with check (false);
create policy "deny all anon" on public.students for all to anon using (false) with check (false);
create policy "deny all anon" on public.questions for all to anon using (false) with check (false);
create policy "deny all anon" on public.attempts for all to anon using (false) with check (false);
create policy "deny all anon" on public.answers for all to anon using (false) with check (false);
create policy "deny all anon" on public.settings for all to anon using (false) with check (false);

-- =========================
-- STORAGE BUCKET para imágenes de preguntas
-- (Ejecutar manualmente desde el dashboard de Supabase si esto falla)
-- =========================
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;
