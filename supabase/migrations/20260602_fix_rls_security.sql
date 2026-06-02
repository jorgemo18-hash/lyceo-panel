-- Migración de seguridad: activar RLS en tablas expuestas y eliminar acceso anon
-- Aplicado: 2026-06-02
-- Resuelve: rls_disabled_in_public (ERROR) en 4 tablas
--           anon write access (WARN) en todas las tablas con políticas always-true para anon
--           anon EXECUTE en función SECURITY DEFINER siguiente_numero_factura

-- ═══════════════════════════════════════════════════════════════
-- PASO 1: Activar RLS en las 4 tablas completamente expuestas
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.contadores_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recuperaciones       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lista_espera         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otros_ingresos       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_all" ON public.contadores_facturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.recuperaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.lista_espera
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.otros_ingresos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- PASO 2: Eliminar políticas de escritura del rol anon
-- ═══════════════════════════════════════════════════════════════

-- alumnos
DROP POLICY IF EXISTS "anon_delete_alumnos" ON public.alumnos;
DROP POLICY IF EXISTS "anon_insert_alumnos" ON public.alumnos;
DROP POLICY IF EXISTS "anon_update_alumnos" ON public.alumnos;
CREATE POLICY "authenticated_delete" ON public.alumnos FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.alumnos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.alumnos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- familias
DROP POLICY IF EXISTS "anon_delete_familias" ON public.familias;
DROP POLICY IF EXISTS "anon_insert_familias" ON public.familias;
DROP POLICY IF EXISTS "anon_update_familias" ON public.familias;
CREATE POLICY "authenticated_delete" ON public.familias FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.familias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.familias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- horario
DROP POLICY IF EXISTS "anon_delete_horario" ON public.horario;
DROP POLICY IF EXISTS "anon_insert_horario" ON public.horario;
DROP POLICY IF EXISTS "anon_update_horario" ON public.horario;
CREATE POLICY "authenticated_delete" ON public.horario FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.horario FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.horario FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- tarifas
DROP POLICY IF EXISTS "anon_delete_tarifas" ON public.tarifas;
DROP POLICY IF EXISTS "anon_insert_tarifas" ON public.tarifas;
DROP POLICY IF EXISTS "anon_update_tarifas" ON public.tarifas;
CREATE POLICY "authenticated_delete" ON public.tarifas FOR DELETE TO authenticated USING (true);
CREATE POLICY "authenticated_insert" ON public.tarifas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update" ON public.tarifas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- configuracion
DROP POLICY IF EXISTS "anon_all_configuracion" ON public.configuracion;
CREATE POLICY "authenticated_all" ON public.configuracion FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- facturas
DROP POLICY IF EXISTS "anon_all_facturas" ON public.facturas;
CREATE POLICY "authenticated_all" ON public.facturas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- festivos
DROP POLICY IF EXISTS "anon_all_festivos" ON public.festivos;
CREATE POLICY "authenticated_all" ON public.festivos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- gastos (ya tenía authenticated_all)
DROP POLICY IF EXISTS "anon_all_gastos" ON public.gastos;

-- gastos_pendientes
DROP POLICY IF EXISTS "anon_all_gastos_pendientes" ON public.gastos_pendientes;
CREATE POLICY "authenticated_all" ON public.gastos_pendientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- informes (ya tenía authenticated_all)
DROP POLICY IF EXISTS "anon_all_informes" ON public.informes;

-- notas_examen
DROP POLICY IF EXISTS "allow_all" ON public.notas_examen;
CREATE POLICY "authenticated_all" ON public.notas_examen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sesiones (authenticated ya tenía sus propias políticas)
DROP POLICY IF EXISTS "anon_delete_sesiones" ON public.sesiones;
DROP POLICY IF EXISTS "anon_insert_sesiones" ON public.sesiones;
DROP POLICY IF EXISTS "anon_update_sesiones" ON public.sesiones;

-- pagos (auth_* ya existían)
DROP POLICY IF EXISTS "anon_delete_pagos" ON public.pagos;
DROP POLICY IF EXISTS "anon_insert_pagos" ON public.pagos;
DROP POLICY IF EXISTS "anon_update_pagos" ON public.pagos;

-- ═══════════════════════════════════════════════════════════════
-- PASO 3: Revocar EXECUTE a anon en función SECURITY DEFINER
-- ═══════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.siguiente_numero_factura(p_anio integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.siguiente_numero_factura(p_anio integer) TO authenticated;
