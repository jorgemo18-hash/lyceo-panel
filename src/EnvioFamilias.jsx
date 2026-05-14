import React from 'react'
import { supabase } from './supabase.js'
import { InformeSheet, rango } from './sheets.jsx'

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

function defaultMesIdx() {
  const now = new Date()
  const idx = MESES_CURSO.findIndex(m => m.mes === now.getMonth() + 1 && m.anio === now.getFullYear())
  return idx >= 0 ? idx : MESES_CURSO.length - 1
}

export function EnvioFamilias() {
  const [mesIdx, setMesIdx]               = React.useState(defaultMesIdx)
  const [alumnos, setAlumnos]             = React.useState([])
  const [conSesiones, setConSesiones]     = React.useState(new Set())
  const [alumnoSel, setAlumnoSel]         = React.useState(null)
  const [informe, setInforme]             = React.useState(null)
  const [cargando, setCargando]           = React.useState(true)
  const [generando, setGenerando]         = React.useState(false)
  const [enviandoTodos, setEnviandoTodos] = React.useState(false)
  const [enviando, setEnviando]           = React.useState(false)
  const [progreso, setProgreso]           = React.useState(null)
  const [resumen, setResumen]             = React.useState(null)
  const [resultados, setResultados]       = React.useState([])
  const [envioStatus, setEnvioStatus]     = React.useState(null)

  const informesCache = React.useRef({})
  const festivosCache = React.useRef({})

  const { mes, anio } = MESES_CURSO[mesIdx]

  const cargarFestivos = React.useCallback(async (m, a) => {
    const key = `${m}-${a}`
    if (festivosCache.current[key]) return festivosCache.current[key]
    const { primero, ultimo } = rango(m, a)
    const { data } = await supabase.from('festivos').select('*').gte('fecha', primero).lte('fecha', ultimo)
    festivosCache.current[key] = data ?? []
    return festivosCache.current[key]
  }, [])

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
      } catch {}
    }

    const result = { sesiones: sesiones ?? [], festivos, comentario }
    informesCache.current[key] = result
    return result
  }, [cargarFestivos])

  React.useEffect(() => {
    supabase
      .from('alumnos')
      .select('id, nombre, curso, nivel, familia_id, familias(email, nombre, dni, direccion, ciudad, codigo_postal, metodo_pago)')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => { setAlumnos(data ?? []); setCargando(false) })
  }, [])

  React.useEffect(() => {
    const { primero, ultimo } = rango(mes, anio)
    supabase
      .from('sesiones')
      .select('alumno_id')
      .gte('fecha', primero)
      .lte('fecha', ultimo)
      .then(({ data }) => setConSesiones(new Set((data ?? []).map(s => s.alumno_id))))
  }, [mes, anio])

  React.useEffect(() => {
    if (!alumnoSel) return
    let aborted = false
    setInforme(null)
    setGenerando(true)
    setEnvioStatus(null)

    cargarInforme(alumnoSel, mes, anio)
      .then(result => { if (!aborted) { setInforme(result); setGenerando(false) } })
      .catch(() => { if (!aborted) setGenerando(false) })

    return () => { aborted = true }
  }, [alumnoSel, mes, anio, cargarInforme])

  const buildPayload = async (alumno, informeData) => {
    const familiaId = alumno.familia_id

    let tarifa = null
    if (familiaId) {
      const { data: tArr } = await supabase
        .from('tarifas').select('*')
        .eq('familia_id', familiaId)
        .order('fecha_inicio', { ascending: false })
        .limit(1)
      tarifa = tArr?.[0] ?? null
    }

    let factura = null
    if (familiaId) {
      const { data: fArr } = await supabase
        .from('facturas').select('*')
        .eq('alumno_id', alumno.id).eq('anio', anio).eq('mes', mes)
        .limit(1)
      if (fArr?.[0]) {
        factura = fArr[0]
      } else {
        const { count } = await supabase
          .from('facturas').select('id', { count: 'exact', head: true })
          .eq('anio', anio)
        const numero = `Lyceo-${anio}-${String((count ?? 0) + 1).padStart(3, '0')}`
        const { data: nf } = await supabase
          .from('facturas')
          .insert({ familia_id: familiaId, alumno_id: alumno.id, anio, mes, importe: tarifa?.precio_neto ?? 0, numero_factura: numero })
          .select().single()
        factura = nf
      }
    }

    const diasMes = []
    for (const s of informeData.sesiones ?? []) {
      if (s.tipo === 'ausencia') continue
      const dia = parseInt(s.fecha.split('-')[2], 10)
      diasMes.push({ dia, asignatura: s.asignatura || '', tema: s.tema || '' })
    }
    for (const f of informeData.festivos ?? []) {
      const dia = parseInt(f.fecha.split('-')[2], 10)
      diasMes.push({ dia, festivo: f.descripcion || f.nombre || 'Festivo' })
    }

    return {
      emailDestino: alumno.familias?.email,
      nombreAlumno: alumno.nombre,
      curso: alumno.curso,
      mes,
      anio,
      diasMes,
      comentario: informeData.comentario || '',
      factura: factura ? {
        numeroFactura: factura.numero_factura,
        familia: alumno.familias,
        precioBruto: tarifa?.precio_bruto ?? factura.importe,
        descuentoPct: tarifa?.descuento_pct ?? 0,
        precioNeto: tarifa?.precio_neto ?? factura.importe,
      } : null,
    }
  }

  const enviarUno = async (alumno, informeData) => {
    const payload = await buildPayload(alumno, informeData)
    const res = await fetch('https://lyceo-pdf-service.onrender.com/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return res.ok
      ? { ok: true, msg: `Enviado a ${payload.emailDestino}` }
      : { ok: false, msg: json.error ?? 'Error al enviar' }
  }

  const enviarTodos = async () => {
    const candidatos = alumnos.filter(a => conSesiones.has(a.id) && a.familias?.email)
    const sinEmail = alumnos.filter(a => conSesiones.has(a.id) && !a.familias?.email).length
    if (candidatos.length === 0) {
      setResumen({ enviados: 0, errores: 0, sinEmail })
      return
    }

    setEnviandoTodos(true)
    setResumen(null)
    setResultados([])
    setProgreso({ actual: 0, total: candidatos.length })

    let enviados = 0, errores = 0
    const acumulados = []

    for (let i = 0; i < candidatos.length; i++) {
      const alumno = candidatos[i]
      setProgreso({ actual: i + 1, total: candidatos.length, nombre: alumno.nombre })
      try {
        const informeData = await cargarInforme(alumno, mes, anio)
        const resultado = await enviarUno(alumno, informeData)
        if (resultado.ok) enviados++; else errores++
        acumulados.push({ nombre: alumno.nombre, ...resultado })
      } catch (e) {
        errores++
        acumulados.push({ nombre: alumno.nombre, ok: false, msg: e.message ?? 'Error' })
      }
      setResultados([...acumulados])
    }

    setEnviandoTodos(false)
    setProgreso(null)
    setResumen({ enviados, errores, sinEmail })
  }

  const enviar = async () => {
    if (!alumnoSel || !informe) return
    setEnviando(true)
    setEnvioStatus(null)
    try {
      const resultado = await enviarUno(alumnoSel, informe)
      setEnvioStatus(resultado)
    } catch (e) {
      setEnvioStatus({ ok: false, msg: e.message ?? 'Error desconocido' })
    } finally {
      setEnviando(false)
    }
  }

  const cambiarMes = (idx) => {
    setMesIdx(idx)
    setAlumnoSel(null)
    setInforme(null)
    setResumen(null)
    setProgreso(null)
    setEnvioStatus(null)
    setResultados([])
  }

  const email = alumnoSel?.familias?.email

  return (
    <div className="inf-layout">
      <aside className="inf-aside">
        <select
          className="inf-mes-sel"
          value={mesIdx}
          onChange={e => cambiarMes(Number(e.target.value))}
          disabled={enviandoTodos}
        >
          {MESES_CURSO.map((m, i) => (
            <option key={i} value={i}>{m.label}</option>
          ))}
        </select>

        <button
          className="btn btn--primary"
          style={{ width: '100%' }}
          onClick={enviarTodos}
          disabled={enviandoTodos || cargando}
        >
          {enviandoTodos ? 'Enviando…' : 'Generar y enviar todos'}
        </button>

        {progreso && (
          <div className="inf-progreso">
            <div className="inf-progreso__label">
              {progreso.nombre
                ? `${progreso.actual}/${progreso.total}: ${progreso.nombre}…`
                : `Enviando ${progreso.actual} de ${progreso.total}…`}
            </div>
            <div className="inf-progreso__track">
              <div className="inf-progreso__fill" style={{ width: `${Math.round(progreso.actual / progreso.total * 100)}%` }} />
            </div>
          </div>
        )}

        {resumen && !enviandoTodos && (
          <div className="inf-resumen">
            <div className="inf-resumen__row">
              <strong>{resumen.enviados}</strong> email{resumen.enviados !== 1 ? 's' : ''} enviado{resumen.enviados !== 1 ? 's' : ''}
            </div>
            {resumen.errores > 0 && (
              <div className="inf-resumen__row" style={{ color: '#8B0000' }}>
                {resumen.errores} error{resumen.errores !== 1 ? 'es' : ''}
              </div>
            )}
            {resumen.sinEmail > 0 && (
              <div className="inf-resumen__row inf-resumen__row--dim">
                {resumen.sinEmail} sin email
              </div>
            )}
          </div>
        )}

        {resultados.length > 0 && (
          <ul className="envio-log">
            {resultados.map((r, i) => (
              <li key={i} className={`envio-log__item ${r.ok ? 'envio-log__item--ok' : 'envio-log__item--err'}`}>
                <span className="envio-log__nombre">{r.nombre}</span>
                <span className="envio-log__estado">{r.ok ? '✓' : '✗'}</span>
              </li>
            ))}
          </ul>
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
                  disabled={enviandoTodos}
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

      <div className="inf-main">
        {!alumnoSel && (
          <div className="placeholder">
            <div className="placeholder__title">Selecciona un alumno</div>
            <p>Elige un alumno para previsualizar su informe y enviarlo individualmente.</p>
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
              <span title={!email ? 'Sin email registrado' : undefined}>
                <button
                  className="btn btn--primary"
                  onClick={enviar}
                  disabled={!email || enviando}
                  style={!email ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  {enviando
                    ? <><span className="btn-spinner" /> Enviando…</>
                    : <><Icon.mail /> Enviar a {email ?? 'sin email'}</>}
                </button>
              </span>
            </div>
            {envioStatus && (
              <div className={`envio-status ${envioStatus.ok ? 'envio-status--ok' : 'envio-status--err'}`}>
                {envioStatus.msg}
              </div>
            )}
            <InformeSheet alumno={alumnoSel} mes={mes} anio={anio} informe={informe} />
          </>
        )}
      </div>
    </div>
  )
}
