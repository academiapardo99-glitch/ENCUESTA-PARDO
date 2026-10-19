-- ===== Verificación rápida tras ejecutar supabase-schema.sql =====
-- Pegar en el SQL Editor de Supabase. Debe devolver 4 tablas y 4 políticas.

-- 1) Tablas creadas
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('cursos', 'docentes', 'grupos', 'encuestas')
order by table_name;

-- 2) RLS activado y políticas
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Índices
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in ('encuestas_docente_idx', 'encuestas_creado_idx');
