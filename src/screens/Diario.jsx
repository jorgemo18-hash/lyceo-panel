import React from 'react'
import { supabase } from '../lib/supabase.js'
import { cargarSesionesFecha, groupByHora, guardarSesion, guardarRecuperacion, marcarRecuperacionCompletada, guardarNotaExamen } from '../lib/data.jsx'

const PRIMARY = '#8B0000'
const HORAS_EXTRA = ['15:30', '16:30', '17:30', '18:30', '19:30']
const toIniciales = n => n.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getFechaHoy() {
  return localISO(new Date())
}

function getFechaMin() {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return localISO(d)
}

export function DiarioScreen({ mobile }) {
  const Topbar = window.Topbar
  const ProgressBar = window.ProgressBar
  const SessionCard = window.SessionCard

  const fechaHoy = React.useMemo(getFechaHoy, [])
  const fechaMin  = React.useMemo(getFechaMin, [])

  const [fechaSel, setFechaSel] = React.useState(fechaHoy)
  const fechaRef = React.useRef(fechaSel)

  const [sesiones, setSesiones] = React.useState([])
  const [hoy, setHoy] = React.useState('')
  const [cargando, setCargando] = React.useState(true)
  const [registros, setRegistros] = React.useState({})
  const [expandido, setExpandido] = React.useState(null)
  const [recuperacionesPorAlumno, setRecuperacionesPorAlumno] = React.useState({})
  const [notasPorAlumno, setNotasPorAlumno] = React.useState({})
  const timers = React.useRef({})

  const [modalOpen, setModalOpen] = React.useState(false)
  const [busqueda, setBusqueda] = React.useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = React.useState([])
  const [alumnoElegido, setAlumnoElegido] = React.useState(null)
  const [horaElegida, setHoraElegida] = React.useState('16:30')
  const [buscando, setBuscando] = React.useState(false)
  const busquedaTimer = React.useRef(null)

  const registrosRef = React.useRef({})
  const sesionesRef  = React.useRef([])
  React.useEffect(() => { registrosRef.current = registros }, [registros])
  React.useEffect(() => { sesionesRef.current  = sesiones  }, [sesiones])

  React.useEffect(() => {
    if (!modalOpen) return
    const onKey = (e) => { if (e.key === 'Escape') cerrarModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalOpen])

  React.useEffect(() => {
    if (!busqueda.trim()) { setResultadosBusqueda([]); setBuscando(false); return }
    if (alumnoElegido) return
    setBuscando(true)
    clearTimeout(busquedaTimer.current)
    busquedaTimer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('alumnos')
          .select('id, nombre, curso, nivel')
          .ilike('nombre', `%${busqueda}%`)
          .eq('activo', true)
          .limit(10)
        if (error) console.error('Búsqueda alumnos:', error)
        setResultadosBusqueda(data ?? [])
      } finally {
        setBuscando(false)
      }
    }, 250)
    return () => clearTimeout(busquedaTimer.current)
  }, [busqueda, alumnoElegido])

  const flushPendingGuardados = (fecha) => {
    Object.values(timers.current).forEach(clearTimeout)
    timers.current = {}
    const regs = registrosRef.current
    const sess = sesionesRef.current
    Object.entries(regs).forEach(([id, registro]) => {
      if (!registro._dirty) return
      const sesion = sess.find(s => s.id === id)
      const debeGuardar = sesion && (
        (registro.asignatura && registro.tema?.trim()) ||
        registro.estado === 'absent'
      )
      if (debeGuardar) guardarSesion(sesion, registro, fecha)
    })
  }

  const cambiarFecha = (nueva) => {
    if (nueva === fechaRef.current) return
    flushPendingGuardados(fechaRef.current)
    fechaRef.current = nueva
    setFechaSel(nueva)
    setExpandido(null)
  }

  const irAntes = () => {
    const d = new Date(fechaRef.current + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    const nueva = d.toISOString().split('T')[0]
    if (nueva >= fechaMin) cambiarFecha(nueva)
  }

  const irDespues = () => {
    const d = new Date(fechaRef.current + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    const nueva = d.toISOString().split('T')[0]
    if (nueva <= fechaHoy) cambiarFecha(nueva)
  }

  // Cleanup on unmount: flush any remaining dirty records
  React.useEffect(() => {
    return () => {
      flushPendingGuardados(fechaRef.current)
    }
  }, [])

  // Load sessions whenever fechaSel changes
  React.useEffect(() => {
    setCargando(true)
    cargarSesionesFecha(fechaSel)
      .then(({ sesiones: s, hoy: h, registrosIniciales, recuperacionesPorAlumno: recup, notasPorAlumno: notas }) => {
        sesionesRef.current = s
        setSesiones(s)
        setHoy(h)
        setRecuperacionesPorAlumno(recup ?? {})
        setNotasPorAlumno(notas ?? {})
        const regsInicial = registrosIniciales ?? Object.fromEntries(
          s.map((ses) => [
            ses.id,
            { asignatura: '', tema: '', comentario: '', nota: '', estado: null, lastSavedAt: null, _dirty: false, avisoEnviado: false, motivoAusencia: '' },
          ])
        )
        registrosRef.current = regsInicial
        setRegistros(regsInicial)
        setCargando(false)
      })
      .catch(() => setCargando(false))
  }, [fechaSel])

  const cerrarModal = () => {
    setModalOpen(false)
    setBusqueda('')
    setResultadosBusqueda([])
    setAlumnoElegido(null)
    setHoraElegida('16:30')
  }

  const añadirAlumno = async () => {
    if (!alumnoElegido) return
    const fecha = fechaRef.current
    const id = `extra-${alumnoElegido.id}`
    const nuevaSesion = {
      id,
      hora: horaElegida,
      duracion: 60,
      alumno: {
        id: alumnoElegido.id,
        nombre: alumnoElegido.nombre,
        iniciales: toIniciales(alumnoElegido.nombre),
        curso: alumnoElegido.curso,
        nivel: alumnoElegido.nivel,
        familia: null,
      },
      historial: [],
      racha: 0,
    }
    setSesiones(prev => {
      const next = [...prev, nuevaSesion]
      sesionesRef.current = next
      return next
    })
    setRegistros(prev => ({
      ...prev,
      [id]: { asignatura: '', tema: '', comentario: '', nota: '', estado: null, lastSavedAt: null, _dirty: false, avisoEnviado: false, motivoAusencia: '' },
    }))
    cerrarModal()
    await supabase.from('sesiones').upsert({
      alumno_id: alumnoElegido.id,
      fecha,
      hora: horaElegida,
      tipo: 'sesion',
      asignatura: null,
      tema: null,
      comentario: null,
    }, { onConflict: 'alumno_id,fecha', ignoreDuplicates: true })
  }

  const onGuardarNota = async (data) => {
    const { data: saved } = await guardarNotaExamen(data)
    if (saved) setNotasPorAlumno(prev => ({ ...prev, [data.alumno_id]: saved }))
  }

  const onGuardarRecuperacion = async (data) => {
    const { data: saved, error } = await guardarRecuperacion(data)
    if (!error && saved) {
      setRecuperacionesPorAlumno(prev => ({ ...prev, [data.alumno_id]: saved }))
    }
  }

  const handleAvisarFamilia = async (sesionId) => {
    const sesion = sesionesRef.current.find(s => s.id === sesionId)
    if (!sesion) return { ok: false, msg: 'Sesión no encontrada' }

    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('familias(email)')
      .eq('id', sesion.alumno.id)
      .single()

    const email = alumnoData?.familias?.email
    if (!email) return { ok: false, msg: 'Sin email registrado para esta familia' }

    const registro = registrosRef.current[sesionId]

    try {
      const res = await fetch('https://lyceo-pdf-service.onrender.com/avisar-ausencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDestino: email,
          nombreAlumno: sesion.alumno.nombre,
          hora: sesion.hora,
          fechaLabel: hoy,
          motivo: registro?.motivoAusencia?.trim() || null,
        }),
      })

      if (res.ok) {
        await supabase.from('sesiones')
          .update({ aviso_enviado: true })
          .eq('alumno_id', sesion.alumno.id)
          .eq('fecha', fechaRef.current)

        setRegistros(prev => {
          const updated = { ...prev, [sesionId]: { ...prev[sesionId], avisoEnviado: true } }
          registrosRef.current = updated
          return updated
        })
        return { ok: true }
      }
      const json = await res.json().catch(() => ({}))
      return { ok: false, msg: json.error ?? 'Error al enviar' }
    } catch (e) {
      return { ok: false, msg: e.message ?? 'Error de red' }
    }
  }

  const onChange = (id, patch) => {
    clearTimeout(timers.current[id])
    const fechaEdit = fechaRef.current  // captured at call time

    setRegistros(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...patch, _dirty: true } }
      registrosRef.current = next
      return next
    })

    timers.current[id] = setTimeout(async () => {
      const registro = registrosRef.current[id]
      const sesion   = sesionesRef.current.find(s => s.id === id)
      const debeGuardar = sesion && (
        (registro.asignatura && registro.tema?.trim()) ||
        registro.estado === 'absent'
      )
      if (!debeGuardar) return
      const error = await guardarSesion(sesion, registro, fechaEdit)
      if (!error) {
        const now = new Date()
        const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        setRegistros(p => {
          const updated = { ...p, [id]: { ...p[id], lastSavedAt: ts, _dirty: false } }
          registrosRef.current = updated
          return updated
        })
        if (sesion.esRecuperacion && sesion.recuperacionId && registro.asignatura && registro.tema?.trim()) {
          marcarRecuperacionCompletada(sesion.recuperacionId)
        }
      }
    }, 1200)
  }

  const vals = Object.values(registros)
  const done    = vals.filter((r) => r.asignatura && r.tema?.trim()).length
  const absent  = vals.filter((r) => r.estado === 'absent').length
  const lastSaved = vals.map((r) => r.lastSavedAt).filter(Boolean).sort().at(-1) ?? null
  const groups = groupByHora(sesiones)
  const todoCompleto = sesiones.length > 0 && vals.every((r) => (r.asignatura && r.tema?.trim()) || r.estado === 'absent')

  const esHoy = fechaSel === fechaHoy

  const dateNav = (
    <div className="diario-nav">
      <button
        className="diario-nav__btn"
        onClick={irAntes}
        disabled={fechaSel <= fechaMin}
        title="Día anterior"
      >
        <Icon.chevron style={{ transform: 'rotate(180deg)' }} />
      </button>
      <input
        type="date"
        className="diario-nav__date"
        value={fechaSel}
        min={fechaMin}
        max={fechaHoy}
        onChange={e => e.target.value && cambiarFecha(e.target.value)}
      />
      <button
        className="diario-nav__btn"
        onClick={irDespues}
        disabled={fechaSel >= fechaHoy}
        title="Día siguiente"
      >
        <Icon.chevron />
      </button>
    </div>
  )

  const btnAñadir = (
    <button className="btn btn--ghost btn--sm" onClick={() => setModalOpen(true)}>
      <Icon.plus /> {esHoy ? 'Añadir alumno hoy' : 'Añadir alumno'}
    </button>
  )

  const rightExtra = (
    <div className="diario-topbar-right">
      {dateNav}
      {btnAñadir}
    </div>
  )

  if (cargando) {
    return (
      <>
        <Topbar eyebrow={esHoy ? 'Hoy' : ''} title="Cargando…" showSearch={false} mobile={mobile} rightExtra={rightExtra} />
        <div className="content">
          <div className="alumnos-estado">
            <div className="alumnos-estado__spinner" /> Cargando sesiones…
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar eyebrow={esHoy ? 'Hoy' : ''} title={hoy} allSavedAt={lastSaved} showSearch={false} mobile={mobile} rightExtra={rightExtra} />
      <div className="content">
        <ProgressBar
          done={done}
          total={sesiones.length}
          absent={absent}
          primaryColor={PRIMARY}
        />
        {groups.map(({ hora, items }) => (
          <div key={hora} className="hgroup">
            <div className="hgroup__head">
              <span className="hgroup__hora">{hora}</span>
              <span className="hgroup__line" />
              <span className="hgroup__count">
                {items.length} {items.length === 1 ? 'alumno' : 'alumnos'}
              </span>
            </div>
            {items.map((s) => (
              <SessionCard
                key={s.id}
                sesion={s}
                registro={registros[s.id]}
                onChange={(patch) => onChange(s.id, patch)}
                onToggle={() => setExpandido((p) => (p === s.id ? null : s.id))}
                expandido={expandido === s.id}
                primaryColor={PRIMARY}
                recuperacion={recuperacionesPorAlumno[s.alumno.id] ?? null}
                onGuardarRecuperacion={onGuardarRecuperacion}
                fechaOriginal={fechaSel}
                onAvisarFamilia={() => handleAvisarFamilia(s.id)}
                notaExamen={notasPorAlumno[s.alumno.id] ?? null}
                onGuardarNota={onGuardarNota}
              />
            ))}
          </div>
        ))}
        {sesiones.length === 0 && (
          <div className="placeholder">
            <div className="placeholder__title">Sin sesiones</div>
            <p>No hay alumnos con clase este día.</p>
          </div>
        )}
        {todoCompleto && (
          <div className="endcard">
            <div className="endcard__title">Todo registrado</div>
            Todas las sesiones del día están completadas.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <span className="modal__title">Añadir alumno</span>
              <button className="modal__close" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal__body">
              <label className="modal__label">Alumno</label>
              <input
                className="modal__input"
                type="text"
                placeholder="Buscar alumno…"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); if (alumnoElegido) setAlumnoElegido(null) }}
                autoFocus
              />
              {buscando && <div className="modal__hint">Buscando…</div>}
              {resultadosBusqueda.length > 0 && (
                <ul className="modal__results">
                  {resultadosBusqueda.map(a => (
                    <li
                      key={a.id}
                      className={`modal__result${alumnoElegido?.id === a.id ? ' modal__result--sel' : ''}`}
                      onClick={() => { setAlumnoElegido(a); setBusqueda(a.nombre); setResultadosBusqueda([]) }}
                    >
                      <span className="modal__result-nombre">{a.nombre}</span>
                      <span className="modal__result-curso">{a.curso}</span>
                    </li>
                  ))}
                </ul>
              )}
              <label className="modal__label" style={{ marginTop: 12 }}>Hora</label>
              <select
                className="modal__select"
                value={horaElegida}
                onChange={e => setHoraElegida(e.target.value)}
              >
                {HORAS_EXTRA.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="modal__footer">
              <button className="btn btn--ghost btn--sm" onClick={cerrarModal}>Cancelar</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={añadirAlumno}
                disabled={!alumnoElegido}
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
