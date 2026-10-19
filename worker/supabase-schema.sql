-- ===== Esquema Supabase del sistema de encuestas =====
-- Ejecutar en el SQL Editor de Supabase (una sola vez).
-- Las columnas usan camelCase para que PostgREST devuelva los objetos tal como
-- los consume la app (docenteNombre, creadoEn, ...). Las encuestas se guardan
-- también con columnas snake_case, que es lo que escribe el Worker (worker/src/supabase.js).

create extension if not exists pgcrypto;

-- ---------- Catálogo ----------
create table if not exists public.cursos (
  id          text primary key default gen_random_uuid()::text,
  nombre      text not null,
  "grupoIds"  jsonb not null default '[]'::jsonb,
  activo      boolean not null default true,
  "creadoEn"  timestamptz not null default now()
);

create table if not exists public.docentes (
  id             text primary key default gen_random_uuid()::text,
  nombre         text not null,
  "cursoId"      text references public.cursos (id) on delete set null,
  "modalidadIds" jsonb not null default '[]'::jsonb,
  estado         text not null default 'activo',
  codigo         text,
  correo         text,
  nombres        text,
  apellidos      text,
  especialidad   text,
  "creadoEn"     timestamptz not null default now()
);

create table if not exists public.grupos (
  id            text primary key default gen_random_uuid()::text,
  "modalidadId" text not null,
  nombre        text not null,
  activo        boolean not null default true,
  "creadoEn"    timestamptz not null default now(),
  unique ("modalidadId", nombre)
);

-- ---------- Encuestas ----------
create table if not exists public.encuestas (
  id                text primary key default gen_random_uuid()::text,
  "docenteId"       text,
  "cursoId"         text,
  "modalidadId"     text,
  "grupoId"         text,
  "docenteNombre"   text,
  "cursoNombre"     text,
  "modalidadNombre" text,
  "grupoNombre"     text,
  respuestas        jsonb not null default '{}'::jsonb,
  "creadoEn"        timestamptz not null default now(),
  -- Columnas equivalentes usadas por el Worker de Cloudflare.
  docente_id        text,
  curso_id          text,
  modalidad_id      text,
  grupo_id          text,
  docente_nombre    text,
  curso_nombre      text,
  modalidad_nombre  text,
  grupo_nombre      text,
  creado_en         timestamptz
);

create index if not exists encuestas_docente_idx on public.encuestas ("docenteId");
create index if not exists encuestas_creado_idx on public.encuestas ("creadoEn" desc);

-- ---------- Seguridad ----------
-- Todo el acceso pasa por el backend (service_role); el frontend y el portal
-- público no leen la base directamente.
alter table public.cursos enable row level security;
alter table public.docentes enable row level security;
alter table public.grupos enable row level security;
alter table public.encuestas enable row level security;

-- Nota: service_role omite RLS. Si se publica el Worker con la clave anon,
-- descomenta esta política (solo INSERT en encuestas):
-- create policy "encuestas_insert_publico" on public.encuestas
--   for insert to anon with check (true);
