-- Migración 0001: añadir soporte para preguntas escritas con corrección IA
-- Aplicar UNA sola vez en Supabase SQL Editor

alter table public.questions
  add column if not exists type text not null default 'multiple_choice'
    check (type in ('multiple_choice', 'written')),
  add column if not exists reference_answer text,
  add column if not exists grading_rubric text,
  alter column options drop not null,
  alter column correct_option_id drop not null;

alter table public.answers
  add column if not exists text_answer text,
  add column if not exists ai_score numeric,
  add column if not exists ai_feedback text;
