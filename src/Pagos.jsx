import React from 'react'
import { supabase } from './supabase.js'

const MESES = [
  { label: 'Sep', mes: 9,  anio: 2025 },
  { label: 'Oct', mes: 10, anio: 2025 },
  { label: 'Nov', mes: 11, anio: 2025 },
  { label: 'Dic', mes: 12, anio: 2025 },
  { label: 'Ene', mes: 1,  anio: 2026 },
  { label: 'Feb', mes: 2,  anio: 2026 },
  { label: 'Mar', mes: 3,  anio: 2026 },
  { label: 'Abr', mes: 4,  anio: 2026 },
  { label: 'May', mes: 5,  anio: 2026 },
  { label: 'Jun', mes: 6,  anio: 2026 },
]

const METODOS = {
  bizum:         { label: 'Bizum',         cls: 'pag-badge--bizum' },
  efectivo:      { label: 'Efectivo',      cls: 'pag-badge--efectivo' },
  transferencia: { label: 'Transferencia', cls: 'pag-badge--transferencia' },
  sepa:          { label: 'Domiciliado',   cls: 'pag-badge--sepa' },
}

const ORDEN_METODO = { sepa: 0, transferencia: 1, bizum: 2, efectivo: 3 }

// Siempre 3 columnas fijas; SEPA aparece como 4.ª solo si hay familias
const COLUMNAS = [
  { key: 'bizum',         label: 'Bizum',        cls: 'pag-badge--bizum',         always: true },
  { key: 'transferencia', label: 'Transferencia', cls: 'pag-badge--transferencia', always: true },
  { key: 'efectivo',      label: 'Efectivo',      cls: 'pag-badge--efectivo',      always: true },
  { key: 'sepa',          label: 'Domiciliado',   cls: 'pag-badge--sepa',          always: false },
]

function defaultMesIdx() {
  const now = new Date()
  const idx = MESES.findIndex(m => m.mes === now.getMonth() + 1 && m.anio === now.getFullYear())
  return idx >= 0 ? idx : MESES.length - 1
}

function agrupar(alumnos) {
  const map = new Map()
  alumnos.forEach(a => {
    const key = a.familia_id ?? `solo-${a.id}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        familia_id: a.familia_id,
        nombres: [a.nombre],
        precio_total: a.precio_neto ?? 0,
        metodo_pago: a.familias?.metodo_pago ?? null,
      })
    } else {
      const g = map.get(key)
      g.nombres.push(a.nombre)
      g.precio_total += a.precio_neto ?? 0
    }
  })
  return [...map.values()].sort((a, b) => {
    const oa = ORDEN_METODO[a.metodo_pago] ?? 99
    const ob = ORDEN_METODO[b.metodo_pago] ?? 99
    return oa !== ob ? oa - ob : a.nombres[0].localeCompare(b.nombres[0])
  })
}

export function Pagos() {
  const [grupos, setGrupos]     = React.useState([])
  const [pagos, setPagos]       = React.useState([])
  const [cargando, setCargando] = React.useState(true)
  const [vista, setVista]       = React.useState('pendientes')
  const [mesIdx, setMesIdx]     = React.useState(defaultMesIdx)
  const [saliendo, setSaliendo] = React.useState(new Set())

  React.useEffect(() => {
    const cargar = async () => {
      const { data: a } = await supabase
        .from('alumnos')
        .select('id, nombre, familia_id, familias(nombre, metodo_pago)')
        .eq('activo', true)
        .order('nombre')

      const familiaIds = (a ?? []).map(x => x.familia_id).filter(Boolean)
      const [{ data: t }, { data: p }] = await Promise.all([
        familiaIds.length > 0
          ? supabase.from('tarifas').select('familia_id, precio_neto').in('familia_id', familiaIds)
          : Promise.resolve({ data: [] }),
        supabase.from('pagos').select('*').gte('anio', 2025),
      ])

      const alumnosConTarifa = (a ?? []).map(x => ({
        ...x,
        precio_neto: t?.find(tar => tar.familia_id === x.familia_id)?.precio_neto ?? 0,
      }))

      setGrupos(agrupar(alumnosConTarifa))
      setPagos(p ?? [])
      setCargando(false)
    }
    cargar().catch(() => setCargando(false))
  }, [])

  const getPago = (familia_id, mes, anio) =>
    pagos.find(p => p.familia_id === familia_id && p.mes === mes && p.anio === anio)

  const toggle = async (grupo, mes, anio) => {
    if (!grupo.familia_id) return
    const existing = getPago(grupo.familia_id, mes, anio)
    const pagado = !(existing?.pagado ?? false)
    const fecha_pago = pagado ? new Date().toISOString().split('T')[0] : null
    const importe = grupo.precio_total

    setPagos(prev => [
      ...prev.filter(p => !(p.familia_id === grupo.familia_id && p.mes === mes && p.anio === anio)),
      { familia_id: grupo.familia_id, anio, mes, importe, pagado, fecha_pago },
    ])

    await supabase.from('pagos').upsert(
      { familia_id: grupo.familia_id, anio, mes, importe, pagado, fecha_pago },
      { onConflict: 'familia_id,anio,mes' }
    )
  }

  const marcarPagado = (grupo) => {
    const { mes, anio } = MESES[mesIdx]
    setSaliendo(prev => new Set([...prev, grupo.key]))
    setTimeout(() => {
      toggle(grupo, mes, anio)
      setSaliendo(prev => { const s = new Set(prev); s.delete(grupo.key); return s })
    }, 320)
  }

  if (cargando) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" /> Cargando cobros…
      </div>
    )
  }

  const { mes, anio } = MESES[mesIdx]
  const labelMes = new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const gruposConTarifa = grupos.filter(g => g.precio_total > 0)
  const pagadosCount   = gruposConTarifa.filter(g => getPago(g.familia_id, mes, anio)?.pagado).length
  const totalEsperado  = gruposConTarifa.reduce((s, g) => s + g.precio_total, 0)
  const totalRecaudado = gruposConTarifa.reduce((s, g) =>
    s + (getPago(g.familia_id, mes, anio)?.pagado ? g.precio_total : 0), 0)

  const pendientesTotal = gruposConTarifa.filter(g => !getPago(g.familia_id, mes, anio)?.pagado).length
  const mesActualIdx = defaultMesIdx()

  // Columnas visibles: las 3 fijas + SEPA si hay familias SEPA
  const columnasVisibles = COLUMNAS.filter(col =>
    col.always || grupos.some(g => g.metodo_pago === col.key && g.precio_total > 0)
  )

  return (
    <div className="pag-root">

      {/* Stats */}
      <div className="pag-stats">
        <div className="pag-stat">
          <div className="pag-stat__label">Pagados · {labelMes}</div>
          <div className="pag-stat__value">
            {pagadosCount}
            <span className="pag-stat__total"> / {gruposConTarifa.length}</span>
          </div>
        </div>
        <div className="pag-stat">
          <div className="pag-stat__label">Recaudado · {labelMes}</div>
          <div className="pag-stat__value">
            {totalRecaudado} €
            <span className="pag-stat__total"> / {totalEsperado} €</span>
          </div>
        </div>
      </div>

      {/* Toggle + selector de mes */}
      <div className="pag-bar">
        <div className="pag-toggle">
          <button
            className={`pag-toggle__btn${vista === 'pendientes' ? ' pag-toggle__btn--on' : ''}`}
            onClick={() => setVista('pendientes')}
          >
            Pendientes
            {pendientesTotal > 0 && (
              <span className="pag-toggle__badge">{pendientesTotal}</span>
            )}
          </button>
          <button
            className={`pag-toggle__btn${vista === 'historial' ? ' pag-toggle__btn--on' : ''}`}
            onClick={() => setVista('historial')}
          >
            Historial
          </button>
        </div>

        {vista === 'pendientes' && (
          <select
            className="pag-mes-sel"
            value={mesIdx}
            onChange={e => setMesIdx(Number(e.target.value))}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>{m.label} {m.anio}</option>
            ))}
          </select>
        )}
      </div>

      {/* Vista pendientes — tres columnas por método */}
      {vista === 'pendientes' && (
        pendientesTotal === 0 ? (
          <div className="pag-all-done">
            <Icon.check /> Todo cobrado este mes
          </div>
        ) : (
          <div
            className="pag-pend-cols"
            style={{ gridTemplateColumns: `repeat(${columnasVisibles.length}, 1fr)` }}
          >
            {columnasVisibles.map(col => {
              const familias = gruposConTarifa.filter(g =>
                g.metodo_pago === col.key && !getPago(g.familia_id, mes, anio)?.pagado
              )
              return (
                <div key={col.key} className="pag-pend-col">
                  <div className="pag-pend-col__head">
                    <span className={`pag-badge ${col.cls}`}>{col.label}</span>
                    <span className="pag-pend-col__count">{familias.length}</span>
                  </div>
                  {familias.length === 0 ? (
                    <div className="pag-pend-col__ok"><Icon.check /> Al día</div>
                  ) : (
                    familias.map(g => {
                      const exiting = saliendo.has(g.key)
                      return (
                        <div
                          key={g.key}
                          className={`pag-col-item${exiting ? ' pag-col-item--exit' : ''}`}
                        >
                          <div className="pag-col-item__info">
                            <span className="pag-col-nombre">{g.nombres.join(' + ')}</span>
                            <span className="pag-col-importe">
                              {g.precio_total > 0 ? `${g.precio_total} €` : '—'}
                            </span>
                          </div>
                          <button
                            className="pag-cobrar-btn pag-cobrar-btn--xs"
                            onClick={() => marcarPagado(g)}
                            disabled={exiting || !g.familia_id}
                            title="Marcar cobrado"
                          >
                            <Icon.check />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Vista historial — tabla única con todos los meses */}
      {vista === 'historial' && (
        <div className="pag-wrap">
          <table className="pag-table">
            <thead>
              <tr>
                <th className="pag-th pag-th--name">Alumno</th>
                {MESES.map((m, i) => (
                  <th
                    key={`${m.mes}-${m.anio}`}
                    className={`pag-th pag-th--mes${i === mesActualIdx ? ' pag-th--current' : ''}`}
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => {
                const metodo = g.metodo_pago ? METODOS[g.metodo_pago] : null
                return (
                  <tr key={g.key} className="pag-row">
                    <td className="pag-td pag-td--name">
                      <div className="pag-nombre-row">
                        <span className="pag-nombre">{g.nombres.join(' + ')}</span>
                        <span className="pag-importe">{g.precio_total > 0 ? `${g.precio_total} €` : '—'}</span>
                      </div>
                      {metodo && (
                        <span className={`pag-badge ${metodo.cls}`}>{metodo.label}</span>
                      )}
                    </td>
                    {MESES.map(m => {
                      const pago = getPago(g.familia_id, m.mes, m.anio)
                      const checked = pago?.pagado ?? false
                      return (
                        <td
                          key={`${m.mes}-${m.anio}`}
                          className={`pag-td pag-td--mes${checked ? ' pag-td--paid' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="pag-check"
                            checked={checked}
                            disabled={!g.familia_id}
                            onChange={() => toggle(g, m.mes, m.anio)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
