import React from 'react'
import { supabase } from '../lib/supabase.js'

const METODOS_PAGO = {
  bizum:         { label: 'Bizum',         cls: 'pag-badge--bizum' },
  efectivo:      { label: 'Efectivo',      cls: 'pag-badge--efectivo' },
  transferencia: { label: 'Transferencia', cls: 'pag-badge--transferencia' },
  sepa:          { label: 'Domiciliado',   cls: 'pag-badge--sepa' },
}

const eur       = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fmtFecha  = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const formVacio = () => ({ fecha: new Date().toISOString().split('T')[0], concepto: '', importe: '', metodo_pago: 'efectivo' })

export function OtrosIngresos() {
  const [lista, setLista]         = React.useState([])
  const [cargando, setCargando]   = React.useState(true)
  const [form, setForm]           = React.useState(formVacio)
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => {
    supabase.from('otros_ingresos').select('*').order('fecha', { ascending: false })
      .then(({ data }) => { setLista(data ?? []); setCargando(false) })
  }, [])

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const añadir = async (e) => {
    e.preventDefault()
    const n = parseFloat(form.importe)
    if (!form.concepto.trim() || isNaN(n) || !form.fecha) return
    setGuardando(true)
    const { data, error } = await supabase.from('otros_ingresos').insert({
      fecha:       form.fecha,
      concepto:    form.concepto.trim(),
      importe:     n,
      metodo_pago: form.metodo_pago || null,
    }).select().single()
    setGuardando(false)
    if (!error && data) {
      setLista(prev => [data, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)))
      setForm(formVacio())
    }
  }

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este ingreso?')) return
    const { error } = await supabase.from('otros_ingresos').delete().eq('id', id)
    if (!error) setLista(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="otros-ing">
      <div className="otros-ing__head">Otros ingresos</div>
      <form className="otros-ing__form" onSubmit={añadir}>
        <input
          type="date" className="topic__input"
          value={form.fecha} onChange={e => set('fecha', e.target.value)} required
        />
        <input
          type="text" className="topic__input otros-ing__concepto-input"
          value={form.concepto} onChange={e => set('concepto', e.target.value)}
          placeholder="Concepto" required
        />
        <input
          type="number" step="0.01" min="0" className="topic__input otros-ing__imp-input"
          value={form.importe} onChange={e => set('importe', e.target.value)}
          placeholder="€" required
        />
        <select className="topic__input" value={form.metodo_pago} onChange={e => set('metodo_pago', e.target.value)}>
          {Object.entries(METODOS_PAGO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn btn--primary btn--sm" type="submit" disabled={guardando}>
          <Icon.plus /> {guardando ? '…' : 'Añadir'}
        </button>
      </form>

      {cargando ? (
        <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>
      ) : lista.length === 0 ? (
        <p className="otros-ing__empty">Sin ingresos adicionales registrados.</p>
      ) : (
        <ul className="otros-ing__list">
          {lista.map(i => (
            <li key={i.id} className="otros-ing__item">
              <span className="otros-ing__fecha">{fmtFecha(i.fecha)}</span>
              <span className="otros-ing__concepto">{i.concepto}</span>
              {i.metodo_pago && METODOS_PAGO[i.metodo_pago] && (
                <span className={`pag-badge ${METODOS_PAGO[i.metodo_pago].cls}`}>
                  {METODOS_PAGO[i.metodo_pago].label}
                </span>
              )}
              <span className="otros-ing__importe">{eur(i.importe)}</span>
              <button className="otros-ing__del" onClick={() => eliminar(i.id)} title="Eliminar">✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
