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
  const fechaHoy = new Date().toISOString().split('T')[0]

  if (!diaCol) return { sesiones: [], hoy, registrosIniciales: {} }

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

  // Precargar sesiones ya guardadas hoy
  const alumnoIds = sesiones.map(s => s.alumno.id)
  let guardadas = []
  if (alumnoIds.length > 0) {
    const { data: sg } = await supabase
      .from('sesiones')
      .select('alumno_id, tipo, asignatura, tema, comentario')
      .eq('fecha', fechaHoy)
      .in('alumno_id', alumnoIds)
    guardadas = sg ?? []
  }

  const registrosIniciales = Object.fromEntries(
    sesiones.map(s => {
      const g = guardadas.find(r => r.alumno_id === s.alumno.id)
      return [s.id, {
        asignatura: g?.asignatura ?? '',
        tema: g?.tema ?? '',
        comentario: g?.comentario ?? '',
        nota: '',
        estado: g?.tipo === 'ausencia' ? 'absent' : null,
        lastSavedAt: null,
        _dirty: false,
      }]
    })
  )

  return { sesiones, hoy, registrosIniciales }
}

// ── Guardar sesión en Supabase ────────────────────────────────────
export async function guardarSesion(sesion, registro) {
  const esAusente = registro.estado === 'absent'
  const { error } = await supabase.from('sesiones').upsert({
    alumno_id: sesion.alumno.id,
    fecha: new Date().toISOString().split('T')[0],
    tipo: esAusente ? 'ausencia' : 'sesion',
    asignatura: esAusente ? null : (registro.asignatura || null),
    tema: esAusente ? null : (registro.tema?.trim() || null),
    comentario: esAusente ? null : (registro.comentario?.trim() || null),
  }, { onConflict: 'alumno_id,fecha' })
  if (error) console.error('Error guardando sesión:', error.message)
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
