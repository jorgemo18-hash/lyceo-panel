import React from 'react'
import { supabase } from './supabase.js'

const MESES_CURSO = [
  { mes: 9,  anio: 2025, label: 'Septiembre 2025' },
  { mes: 10, anio: 2025, label: 'Octubre 2025'    },
  { mes: 11, anio: 2025, label: 'Noviembre 2025'  },
  { mes: 12, anio: 2025, label: 'Diciembre 2025'  },
  { mes: 1,  anio: 2026, label: 'Enero 2026'      },
  { mes: 2,  anio: 2026, label: 'Febrero 2026'    },
  { mes: 3,  anio: 2026, label: 'Marzo 2026'      },
  { mes: 4,  anio: 2026, label: 'Abril 2026'      },
  { mes: 5,  anio: 2026, label: 'Mayo 2026'       },
  { mes: 6,  anio: 2026, label: 'Junio 2026'      },
]

function rango(mes, anio) {
  const pad = n => String(n).padStart(2, '0')
  const diasEnMes = new Date(anio, mes, 0).getDate()
  return {
    primero: `${anio}-${pad(mes)}-01`,
    ultimo:  `${anio}-${pad(mes)}-${pad(diasEnMes)}`,
    diasEnMes,
  }
}

function mesLabel(mes, anio) {
  return new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

function generarDias(mes, anio, sesiones, festivos) {
  const pad = n => String(n).padStart(2, '0')
  const { diasEnMes } = rango(mes, anio)
  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = i + 1
    const fecha = `${anio}-${pad(mes)}-${pad(d)}`
    const dow = new Date(fecha).getDay()
    const sesion  = sesiones?.find(s => s.fecha === fecha) ?? null
    const festivo = festivos?.find(f => f.fecha === fecha) ?? null
    return { d, fecha, dow, sesion, festivo }
  })
}

function filaInfo(item) {
  const { dow, sesion, festivo } = item
  if (dow === 6) return { cls: 'inf-tr--weekend', asig: 'Sábado',  tema: '' }
  if (dow === 0) return { cls: 'inf-tr--weekend', asig: 'Domingo', tema: '' }
  if (festivo)   return { cls: 'inf-tr--festivo', asig: festivo.nombre ?? 'Festivo', tema: '' }
  if (sesion?.tipo === 'ausencia') return { cls: 'inf-tr--ausencia', asig: 'NO', tema: 'NO' }
  if (sesion)    return { cls: '', asig: sesion.asignatura ?? '', tema: sesion.tema ?? '' }
  return { cls: 'inf-tr--empty', asig: '', tema: '' }
}

function defaultMesIdx() {
  const now = new Date()
  const idx = MESES_CURSO.findIndex(m => m.mes === now.getMonth() + 1 && m.anio === now.getFullYear())
  return idx >= 0 ? idx : MESES_CURSO.length - 1
}

// ── Hoja imprimible ────────────────────────────────────────────────
function InformeSheet({ alumno, mes, anio, informe }) {
  const { sesiones, festivos, comentario } = informe
  const dias = generarDias(mes, anio, sesiones, festivos)

  const tabla = (
    <table className="inf-table">
      <thead>
        <tr>
          <th className="inf-th inf-th--dia">Día</th>
          <th className="inf-th inf-th--asig">Asignatura</th>
          <th className="inf-th inf-th--tema">Tema</th>
        </tr>
      </thead>
      <tbody>
        {dias.map(item => {
          const { cls, asig, tema } = filaInfo(item)
          return (
            <tr key={item.d} className={`inf-tr ${cls}`}>
              <td className="inf-td inf-td--dia">{item.d}</td>
              <td className="inf-td">{asig}</td>
              <td className="inf-td">{tema}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="inf-sheet">
      <div className="inf-sheet__head">
        <img src="logo.png" alt="Lyceo" className="inf-sheet__logo" />
        <h1 className="inf-sheet__title">Lyceo · Informe mensual</h1>
        <p className="inf-sheet__sub">
          {alumno.nombre} ({alumno.curso}) · {mesLabel(mes, anio)}
        </p>
      </div>

      {comentario ? (
        <div className="inf-cols">
          <div className="inf-col-tabla">{tabla}</div>
          <div className="inf-col-coment">
            <div className="inf-coment">
              <div className="inf-coment__label">Resumen del mes</div>
              <div className="inf-coment__body">{comentario}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="inf-table-solo">{tabla}</div>
      )}
    </div>
  )
}

// ── Pantalla principal ─────────────────────────────────────────────
export function Informes() {
  const [mesIdx, setMesIdx]           = React.useState(defaultMesIdx)
  const [alumnos, setAlumnos]         = React.useState([])
  const [conSesiones, setConSesiones] = React.useState(new Set())
  const [alumnoSel, setAlumnoSel]     = React.useState(null)
  const [informe, setInforme]         = React.useState(null)
  const [cargando, setCargando]       = React.useState(true)
  const [generando, setGenerando]     = React.useState(false)
  const [generandoTodos, setGenerandoTodos] = React.useState(false)
  const [progreso, setProgreso]       = React.useState(null)  // { actual, total }
  const [resumen, setResumen]         = React.useState(null)  // { generados, sinSesiones }

  const informesCache = React.useRef({})
  const festivosCache = React.useRef({})

  const { mes, anio } = MESES_CURSO[mesIdx]

  // Festivos con caché por mes/año (son iguales para todos los alumnos)
  const cargarFestivos = React.useCallback(async (m, a) => {
    const key = `${m}-${a}`
    if (festivosCache.current[key]) return festivosCache.current[key]
    const { primero, ultimo } = rango(m, a)
    const { data } = await supabase.from('festivos').select('*')
      .gte('fecha', primero).lte('fecha', ultimo)
    festivosCache.current[key] = data ?? []
    return festivosCache.current[key]
  }, [])

  // Informe de un alumno con caché
  const cargarInforme = React.useCallback(async (alumno, m, a) => {
    const key = `${alumno.id}-${m}-${a}`
    if (informesCache.current[key]) return informesCache.current[key]

    const { primero, ultimo } = rango(m, a)
    const [{ data: sesiones }, festivos] = await Promise.all([
      supabase.from('sesiones').select('*')
        .eq('alumno_id', alumno.id)
        .gte('fecha', primero).lte('fecha', ultimo)
        .order('fecha'),
      cargarFestivos(m, a),
    ])

    let comentario = ''
    if ((sesiones ?? []).filter(s => s.tipo !== 'ausencia').length > 0) {
      try {
        const res = await fetch(
          'https://hafjurzuvfglrtjmbbdu.supabase.co/functions/v1/generar-comentario',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alumno: alumno.nombre, curso: alumno.curso, sesiones }),
          }
        )
        if (res.ok) comentario = (await res.json()).comentario ?? ''
      } catch { /* sin comentario si falla la Edge Function */ }
    }

    const result = { sesiones: sesiones ?? [], festivos, comentario }
    informesCache.current[key] = result
    return result
  }, [cargarFestivos])

  // Alumnos activos — una sola vez
  React.useEffect(() => {
    supabase
      .from('alumnos')
      .select('id, nombre, curso, nivel')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => { setAlumnos(data ?? []); setCargando(false) })
  }, [])

  // Indicadores: qué alumnos tienen sesiones este mes
  React.useEffect(() => {
    const { primero, ultimo } = rango(mes, anio)
    supabase
      .from('sesiones')
      .select('alumno_id')
      .gte('fecha', primero)
      .lte('fecha', ultimo)
      .then(({ data }) => setConSesiones(new Set((data ?? []).map(s => s.alumno_id))))
  }, [mes, anio])

  // Informe individual al seleccionar alumno o cambiar mes
  React.useEffect(() => {
    if (!alumnoSel) return
    let aborted = false
    setInforme(null)
    setGenerando(true)

    cargarInforme(alumnoSel, mes, anio)
      .then(result => {
        if (!aborted) { setInforme(result); setGenerando(false) }
      })
      .catch(() => { if (!aborted) setGenerando(false) })

    return () => { aborted = true }
  }, [alumnoSel, mes, anio, cargarInforme])

  // Limpiar clase printing-inf al cerrar el diálogo
  React.useEffect(() => {
    const after = () => document.body.classList.remove('printing-inf')
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [])

  // ── Generar todos ──────────────────────────────────────────────
  const generarTodos = async () => {
    const conSes    = alumnos.filter(a => conSesiones.has(a.id))
    const sinSesiones = alumnos.length - conSes.length

    if (conSes.length === 0) {
      setResumen({ generados: 0, sinSesiones })
      return
    }

    setGenerandoTodos(true)
    setResumen(null)
    setProgreso({ actual: 0, total: conSes.length })

    let generados = 0
    for (let i = 0; i < conSes.length; i++) {
      setProgreso({ actual: i + 1, total: conSes.length })
      try { await cargarInforme(conSes[i], mes, anio); generados++ } catch {}
    }

    setGenerandoTodos(false)
    setProgreso(null)
    setResumen({ generados, sinSesiones })
  }

  const onPrint = () => {
    const style = document.createElement('style')
    style.id = 'inf-print-override'
    style.textContent = '@page { size: A4 portrait; margin: 12mm; }'
    document.head.appendChild(style)
    document.body.classList.add('printing-inf')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.head.removeChild(style)
        document.body.classList.remove('printing-inf')
      }, 300)
    }, 30)
  }

  const cambiarMes = (idx) => {
    setMesIdx(idx)
    setAlumnoSel(null)
    setInforme(null)
    setResumen(null)
    setProgreso(null)
  }

  return (
    <div className="inf-layout">
      {/* Panel izquierdo — selector + controles + lista */}
      <aside className="inf-aside">
        <select
          className="inf-mes-sel"
          value={mesIdx}
          onChange={e => cambiarMes(Number(e.target.value))}
          disabled={generandoTodos}
        >
          {MESES_CURSO.map((m, i) => (
            <option key={i} value={i}>{m.label}</option>
          ))}
        </select>

        <button
          className="btn btn--primary"
          style={{ width: '100%' }}
          onClick={generarTodos}
          disabled={generandoTodos || cargando}
        >
          {generandoTodos ? 'Generando…' : 'Generar todos'}
        </button>

        {/* Progreso */}
        {progreso && (
          <div className="inf-progreso">
            <div className="inf-progreso__label">
              Generando {progreso.actual} de {progreso.total}…
            </div>
            <div className="inf-progreso__track">
              <div
                className="inf-progreso__fill"
                style={{ width: `${Math.round(progreso.actual / progreso.total * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Resumen final */}
        {resumen && !generandoTodos && (
          <div className="inf-resumen">
            <div className="inf-resumen__row">
              <strong>{resumen.generados}</strong> informe{resumen.generados !== 1 ? 's' : ''} generado{resumen.generados !== 1 ? 's' : ''}
            </div>
            {resumen.sinSesiones > 0 && (
              <div className="inf-resumen__row inf-resumen__row--dim">
                {resumen.sinSesiones} alumno{resumen.sinSesiones !== 1 ? 's' : ''} sin sesiones
              </div>
            )}
          </div>
        )}

        {cargando ? (
          <div className="alumnos-estado">
            <div className="alumnos-estado__spinner" /> Cargando…
          </div>
        ) : (
          <ul className="inf-list">
            {alumnos.map(a => (
              <li key={a.id}>
                <button
                  className={`inf-alumno${alumnoSel?.id === a.id ? ' inf-alumno--active' : ''}`}
                  onClick={() => setAlumnoSel(a)}
                  disabled={generandoTodos}
                >
                  <span className={`inf-dot${conSesiones.has(a.id) ? ' inf-dot--on' : ''}`} />
                  <span className="inf-alumno__nombre">{a.nombre}</span>
                  <span className="inf-alumno__curso">{a.curso}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Panel derecho — informe */}
      <div className="inf-main">
        {!alumnoSel && (
          <div className="placeholder">
            <div className="placeholder__title">Selecciona un alumno</div>
            <p>Elige un alumno de la lista para ver su informe mensual.</p>
          </div>
        )}

        {alumnoSel && generando && (
          <div className="alumnos-estado">
            <div className="alumnos-estado__spinner" /> Generando informe…
          </div>
        )}

        {alumnoSel && !generando && informe && (
          <>
            <div className="inf-toolbar no-print">
              <button className="btn btn--primary" onClick={onPrint}>
                <Icon.printer /> Imprimir / PDF
              </button>
            </div>
            <InformeSheet alumno={alumnoSel} mes={mes} anio={anio} informe={informe} />
          </>
        )}
      </div>
    </div>
  )
}
