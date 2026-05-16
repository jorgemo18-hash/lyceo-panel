import React from 'react'
import { supabase } from '../lib/supabase.js'

const CAMPOS_EMISOR = [
  { key: 'emisor_nombre',    label: 'Nombre completo y NIF', placeholder: 'MORENO PARDO JORGE · 18042793Y' },
  { key: 'emisor_direccion', label: 'Dirección',             placeholder: 'C/ Alvarado 4, 22100 Sangarrén (Huesca)' },
  { key: 'emisor_telefono',  label: 'Teléfono',              placeholder: '675 324 128' },
  { key: 'emisor_email',     label: 'Email',                 placeholder: 'info@lyceoacademia.es' },
]

export function Ajustes() {
  const [emisor, setEmisor] = React.useState(
    Object.fromEntries(CAMPOS_EMISOR.map(c => [c.key, '']))
  )
  const [guardandoEmisor, setGuardandoEmisor] = React.useState(false)
  const [statusEmisor, setStatusEmisor]       = React.useState(null)

  const [festivos, setFestivos]           = React.useState([])
  const [cargandoFestivos, setCargando]   = React.useState(true)
  const [errorFestivos, setErrorFestivos] = React.useState(null)
  const [formOpen, setFormOpen]           = React.useState(false)
  const [nuevaFecha, setNuevaFecha]       = React.useState('')
  const [nuevaDesc, setNuevaDesc]         = React.useState('')
  const [añadiendo, setAñadiendo]         = React.useState(false)

  React.useEffect(() => {
    supabase
      .from('configuracion')
      .select('clave, valor')
      .in('clave', CAMPOS_EMISOR.map(c => c.key))
      .then(({ data }) => {
        if (!data) return
        const patch = Object.fromEntries(data.map(r => [r.clave, r.valor]))
        setEmisor(prev => ({ ...prev, ...patch }))
      })
  }, [])

  React.useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('festivos')
        .select('*')
        .order('fecha', { ascending: true })
      console.log('festivos data:', data, 'error:', error)
      if (error) setErrorFestivos(error.message)
      setFestivos(data ?? [])
      setCargando(false)
    }
    cargar()
  }, [])

  const guardarEmisor = async () => {
    setGuardandoEmisor(true)
    setStatusEmisor(null)
    try {
      const rows = CAMPOS_EMISOR.map(c => ({ clave: c.key, valor: emisor[c.key] ?? '' }))
      const { error } = await supabase
        .from('configuracion')
        .upsert(rows, { onConflict: 'clave' })
      setStatusEmisor(error ? { ok: false, msg: error.message } : { ok: true, msg: 'Guardado' })
    } catch (e) {
      setStatusEmisor({ ok: false, msg: e.message })
    } finally {
      setGuardandoEmisor(false)
    }
  }

  const añadirFestivo = async () => {
    if (!nuevaFecha) return
    setAñadiendo(true)
    const { data, error } = await supabase
      .from('festivos')
      .insert({ fecha: nuevaFecha, descripcion: nuevaDesc.trim() || 'Festivo' })
      .select()
      .single()
    if (!error && data) {
      setFestivos(prev => [...prev, data].sort((a, b) => a.fecha.localeCompare(b.fecha)))
      setNuevaFecha('')
      setNuevaDesc('')
      setFormOpen(false)
    }
    setAñadiendo(false)
  }

  const eliminarFestivo = async (id) => {
    await supabase.from('festivos').delete().eq('id', id)
    setFestivos(prev => prev.filter(f => f.id !== id))
  }

  const fmtFecha = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div className="ajustes">

      {/* ── Datos del emisor ── */}
      <section className="ajustes__sec">
        <h2 className="ajustes__h">Datos del emisor</h2>
        <p className="ajustes__sub">Aparecen en el encabezado de las facturas generadas.</p>

        {CAMPOS_EMISOR.map(c => (
          <div className="field" key={c.key}>
            <label className="field__label">{c.label}</label>
            <input
              className="topic__input"
              type="text"
              value={emisor[c.key]}
              placeholder={c.placeholder}
              onChange={e => setEmisor(prev => ({ ...prev, [c.key]: e.target.value }))}
            />
          </div>
        ))}

        <div className="ajustes__actions">
          <button
            className="btn btn--primary btn--sm"
            onClick={guardarEmisor}
            disabled={guardandoEmisor}
          >
            {guardandoEmisor ? 'Guardando…' : 'Guardar'}
          </button>
          {statusEmisor && (
            <span className={`ajustes__status ${statusEmisor.ok ? 'ajustes__status--ok' : 'ajustes__status--err'}`}>
              {statusEmisor.msg}
            </span>
          )}
        </div>
      </section>

      {/* ── Festivos ── */}
      <section className="ajustes__sec">
        <div className="ajustes__sec-head">
          <div>
            <h2 className="ajustes__h">Festivos</h2>
            <p className="ajustes__sub">Se marcan en los informes mensuales de los alumnos.</p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setFormOpen(v => !v)}>
            <Icon.plus /> Añadir festivo
          </button>
        </div>

        {formOpen && (
          <div className="ajustes__form">
            <div className="field">
              <label className="field__label">Fecha</label>
              <input
                className="topic__input"
                type="date"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label className="field__label">Descripción</label>
              <input
                className="topic__input"
                type="text"
                value={nuevaDesc}
                placeholder="ej. Día de Aragón"
                onChange={e => setNuevaDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && añadirFestivo()}
              />
            </div>
            <div className="ajustes__actions">
              <button
                className="btn btn--primary btn--sm"
                onClick={añadirFestivo}
                disabled={!nuevaFecha || añadiendo}
              >
                {añadiendo ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => { setFormOpen(false); setNuevaFecha(''); setNuevaDesc('') }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {errorFestivos && (
          <div className="ajustes__status ajustes__status--err" style={{ marginBottom: 12 }}>
            Error: {errorFestivos}
          </div>
        )}
        {cargandoFestivos ? (
          <div className="alumnos-estado">
            <div className="alumnos-estado__spinner" /> Cargando…
          </div>
        ) : festivos.length === 0 ? (
          <div className="ajustes__empty">No hay festivos registrados.</div>
        ) : (
          <ul className="ajustes__festivos">
            {festivos.map(f => (
              <li key={f.id} className="ajustes__festivo">
                <div className="ajustes__festivo-info">
                  <span className="ajustes__festivo-fecha">{fmtFecha(f.fecha)}</span>
                  <span className="ajustes__festivo-desc">{f.descripcion || f.nombre || '—'}</span>
                </div>
                <button
                  className="ajustes__del"
                  onClick={() => eliminarFestivo(f.id)}
                  title="Eliminar"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  )
}
