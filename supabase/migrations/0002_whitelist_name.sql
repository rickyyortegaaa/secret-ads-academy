-- Migración 0002: añadir nombre del invitado a la whitelist.
-- Aplicar UNA sola vez en Supabase SQL Editor.
--
-- Razón: las invitaciones por email se personalizan ("Hola {nombre},...").
-- El admin introduce nombre + email al añadir a la whitelist.

alter table public.whitelist
  add column if not exists name text;
