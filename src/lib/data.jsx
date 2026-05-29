import { supabase } from './supabase.js'

// ── Curso académico ──────────────────────────────────────────────
export function anioInicioCurso() {
  const now = new Date()
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
}

export function mesesCursoActual() {
  const anioInicio = anioInicioCurso()
  const meses = []
  for (let m = 9; m <= 12; m++) meses.push({ mes: m, anio: anioInicio })
  for (let m = 1; m <= 6;  m++) meses.push({ mes: m, anio: anioInicio + 1 })
  return meses
}

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

export function groupByHora(sesiones) {
  const map = {}
  const orden = []
  sesiones.forEach(s => {
    if (!map[s.hora]) { map[s.hora] = []; orden.push(s.hora) }
    map[s.hora].push(s)
  })
  return orden.map(hora => ({ hora, items: map[hora] }))
}

// ── Carga sesiones de un día desde Supabase ──────────────────────
export async function cargarSesionesFecha(fechaISO) {
  const date = new Date(fechaISO + 'T12:00:00')
  const diaCol = DIA_COLUMNA[date.getDay()]
  const label = date
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())

  if (!diaCol) return { sesiones: [], hoy: label, registrosIniciales: {} }

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

  const { data: todasEseDia } = await supabase
    .from('sesiones')
    .select('alumno_id, tipo, asignatura, tema, comentario, hora, aviso_enviado, motivo_ausencia, asignaturas_extra')
    .eq('fecha', fechaISO)
  const guardadas = todasEseDia ?? []

  const horarioIds = new Set(sesiones.map(s => s.alumno.id))
  const extrasGuardadas = guardadas.filter(g => !horarioIds.has(g.alumno_id))

  let sesionesExtra = []
  if (extrasGuardadas.length > 0) {
    const extraIds = extrasGuardadas.map(g => g.alumno_id)
    const { data: alumnosExtra } = await supabase
      .from('alumnos')
      .select('id, nombre, curso, nivel')
      .in('id', extraIds)
      .eq('activo', true)
    const alumnosMap = Object.fromEntries((alumnosExtra ?? []).map(a => [a.id, a]))
    sesionesExtra = extrasGuardadas
      .filter(g => alumnosMap[g.alumno_id])
      .map(g => {
        const a = alumnosMap[g.alumno_id]
        return {
          id: `extra-${g.alumno_id}`,
          hora: g.hora ?? '15:30',
          duracion: 60,
          alumno: { id: g.alumno_id, nombre: a.nombre, iniciales: iniciales(a.nombre),
            curso: a.curso, nivel: a.nivel, familia: null },
          historial: [],
          racha: 0,
        }
      })
  }

  // Recuperaciones programadas PARA esta fecha (sesiones de recuperación que ocurren hoy)
  const { data: recupHoy } = await supabase
    .from('recuperaciones')
    .select('*, alumnos(nombre, curso, nivel)')
    .eq('fecha_recuperacion', fechaISO)
    .eq('completada', false)

  // Recuperaciones donde esta fecha es la fecha original (para mostrar estado en la tarjeta ausente)
  const { data: recupOrigen } = await supabase
    .from('recuperaciones')
    .select('*')
    .eq('fecha_original', fechaISO)

  const recuperacionesPorAlumno = Object.fromEntries(
    (recupOrigen ?? []).map(r => [r.alumno_id, r])
  )

  // Añadir sesiones de recuperación que ocurren hoy (siempre, aunque el alumno tenga sesión normal ese día)
  const sesionesRecup = (recupHoy ?? [])
    .filter(r => r.alumnos)
    .map(r => ({
      id: `recup-${r.id}`,
      hora: r.hora_inicio,
      duracion: 60,
      esRecuperacion: true,
      recuperacionId: r.id,
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

  const todasSesiones = [...sesiones, ...sesionesExtra, ...sesionesRecup]
  const registrosIniciales = Object.fromEntries(
    todasSesiones.map(s => {
      const g = guardadas.find(r => r.alumno_id === s.alumno.id)
      let asignaturasExtra = []
      if (g?.asignaturas_extra) {
        try { asignaturasExtra = JSON.parse(g.asignaturas_extra) } catch {}
      }
      return [s.id, {
        asignatura: g?.asignatura ?? '',
        tema: g?.tema ?? '',
        asignaturasExtra,
        comentario: g?.comentario ?? '',
        nota: '',
        estado: g?.tipo === 'ausencia' ? 'absent' : null,
        lastSavedAt: null,
        _dirty: false,
        avisoEnviado: g?.aviso_enviado ?? false,
        motivoAusencia: g?.motivo_ausencia ?? '',
      }]
    })
  )

  const { data: notasDia } = await supabase
    .from('notas_examen').select('*').eq('fecha', fechaISO)
  const notasPorAlumno = {}
  for (const n of (notasDia ?? [])) {
    if (!notasPorAlumno[n.alumno_id]) notasPorAlumno[n.alumno_id] = []
    notasPorAlumno[n.alumno_id].push(n)
  }

  return { sesiones: todasSesiones, hoy: label, registrosIniciales, recuperacionesPorAlumno, notasPorAlumno }
}

export async function cargarSesionesHoy() {
  return cargarSesionesFecha(new Date().toISOString().split('T')[0])
}

// ── Guardar sesión en Supabase ────────────────────────────────────
export async function guardarSesion(sesion, registro, fecha = new Date().toISOString().split('T')[0]) {
  const alumno_id = sesion.alumno?.id
  if (!alumno_id && sesion.id?.startsWith('extra-')) {
    // Fallback para alumnos extraídos de la sesión directamente
    const parts = sesion.id.split('-');
    sesion.alumno = { id: parts[parts.length - 1] };
  }
  
  if (!alumno_id) {
    console.error('guardarSesion: alumno_id undefined — objeto sesion:', sesion)
    return new Error('alumno_id undefined')
  }
  const esAusente = registro.estado === 'absent'
  const extrasValidos = !esAusente && registro.asignaturasExtra?.length > 0
    ? registro.asignaturasExtra.filter(b => b.asignatura || b.tema)
    : []
  const payload = {
    alumno_id,
    fecha,
    tipo: esAusente ? 'ausencia' : 'sesion',
    asignatura: esAusente ? null : (registro.asignatura || null),
    tema: esAusente ? null : (registro.tema?.trim() || null),
    comentario: esAusente ? null : (registro.comentario?.trim() || null),
    motivo_ausencia: esAusente ? (registro.motivoAusencia?.trim() || null) : null,
    asignaturas_extra: extrasValidos.length > 0 ? JSON.stringify(extrasValidos) : null,
  }
  if (sesion.hora) payload.hora = sesion.hora
  const { error } = await supabase.from('sesiones').upsert(
    payload,
    { onConflict: 'alumno_id,fecha', ignoreDuplicates: false }
  )
  if (error) console.error('guardarSesion error:', error)
  return error ?? null
}

// ── Recuperaciones ────────────────────────────────────────────────
export async function guardarRecuperacion({ id, alumno_id, fecha_original, fecha_recuperacion, hora_inicio, genera_cobro }) {
  const payload = { alumno_id, fecha_original, fecha_recuperacion, hora_inicio, genera_cobro }
  const result = id
    ? await supabase.from('recuperaciones').update(payload).eq('id', id).select().single()
    : await supabase.from('recuperaciones').insert(payload).select().single()
  if (result.error) console.error('guardarRecuperacion error:', result.error)
  return result
}

export async function marcarRecuperacionCompletada(recuperacionId) {
  const { error } = await supabase.from('recuperaciones').update({ completada: true }).eq('id', recuperacionId)
  if (error) console.error('marcarRecuperacionCompletada error:', error)
}

// ── Notas de examen ───────────────────────────────────────────────
export async function guardarNotaExamen({ id, alumno_id, fecha, asignatura, nota }) {
  const payload = { alumno_id, fecha, asignatura, nota: Number(nota) }
  const result = id
    ? await supabase.from('notas_examen').update({ asignatura, nota: Number(nota) }).eq('id', id).select().single()
    : await supabase.from('notas_examen').insert(payload).select().single()
  if (result.error) console.error('guardarNotaExamen error:', result.error)
  return result
}

export async function cargarNotasAlumno(alumno_id) {
  const { data, error } = await supabase
    .from('notas_examen').select('*')
    .eq('alumno_id', alumno_id)
    .order('fecha', { ascending: false })
  return { data: data ?? [], error }
}

export async function eliminarNotaExamen(id) {
  const { error } = await supabase.from('notas_examen').delete().eq('id', id)
  if (error) console.error('eliminarNotaExamen error:', error)
  return error ?? null
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
