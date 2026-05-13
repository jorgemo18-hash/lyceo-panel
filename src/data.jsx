import { supabase } from './supabase.js'

// ── Asignaturas y temas ──────────────────────────────────────────
const ASIGNATURAS_POR_NIVEL = {
  primaria:     ['Matemáticas', 'Lengua', 'Inglés', 'Ciencias', 'Lectura'],
  eso:          ['Matemáticas', 'Lengua', 'Inglés', 'Física y Química', 'Biología', 'Historia'],
  bachillerato: ['Matemáticas II', 'Física', 'Química', 'Lengua', 'Inglés', 'Historia'],
}

const TEMAS_FRECUENTES = [
  'Repaso examen', 'Deberes del cole', 'Comprensión lectora',
  'Problemas de aplicación', 'Análisis sintáctico',
  'Reading comprehension', 'Writing — formal email',
  'Ecuaciones', 'Geometría — áreas y volúmenes', 'Verbos irregulares',
]

// ── Tarifas ──────────────────────────────────────────────────────
const TARIFAS_INICIALES = {
  primaria:     { '1h': 40, '2h': 70,  '3h': 100, '4h': 125, '5h': 150 },
  eso:          { '1h': 45, '2h': 75,  '3h': 110, '4h': 140, '5h': 165 },
  bachillerato: { '1h': 50, '2h': 85,  '3h': 115, '4h': 150, '5h': 180 },
}
const TARIFA_FILAS = ['1h', '2h', '3h', '4h', '5h']
const TARIFA_NIVELES = [
  { id: 'primaria',     label: 'Primaria',     sub: '1.º — 6.º' },
  { id: 'eso',          label: 'ESO',          sub: '1.º — 4.º' },
  { id: 'bachillerato', label: 'Bachillerato', sub: '1.º — 2.º' },
]

// ── Helpers ──────────────────────────────────────────────────────
// 0=dom, 1=lun, 2=mar, 3=mie, 4=jue, 5=vie, 6=sab
const DIA_COLUMNA = [null, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', null]

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatHoy() {
  return new Date()
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())
}

export function groupByHora(sesiones) {
  const map = {}
  const orden = []
  sesiones.forEach(s => {
    if (!map[s.hora]) { map[s.hora] = []; orden.push(s.hora) }
    map[s.hora].push(s)
  })
  return orden.map(hora => ({ hora, items: map[hora] }))
}

// ── Carga sesiones del día desde Supabase ─────────────────────────
export async function cargarSesionesHoy() {
  const diaCol = DIA_COLUMNA[new Date().getDay()]
  const hoy = formatHoy()

  if (!diaCol) return { sesiones: [], hoy }

  const { data, error } = await supabase
    .from('horario')
    .select('*, alumnos!inner(nombre, curso, nivel, activo)')
    .eq(diaCol, true)
    .eq('alumnos.activo', true)
    .order('hora_inicio')

  if (error) throw error

  const sesiones = (data ?? [])
    .filter(r => r.alumnos)
    .map(r => ({
      id: r.id,
      hora: r.hora_inicio.substring(0, 5),
      duracion: 60,
      alumno: {
        id: r.alumno_id,
        nombre: r.alumnos.nombre,
        iniciales: iniciales(r.alumnos.nombre),
        curso: r.alumnos.curso,
        nivel: r.alumnos.nivel,
        familia: null,
      },
      historial: [],
      racha: 0,
    }))

  return { sesiones, hoy }
}

// ── Globales para componentes que usan window.X ───────────────────
Object.assign(window, {
  groupByHora,
  ASIGNATURAS_POR_NIVEL,
  TEMAS_FRECUENTES,
  TARIFAS_INICIALES,
  TARIFA_FILAS,
  TARIFA_NIVELES,
})
