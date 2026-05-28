import React from 'react'
import { supabase } from '../lib/supabase.js'
import { mesesCursoActual, anioInicioCurso } from '../lib/data.jsx'
import { OtrosIngresos } from './OtrosIngresos.jsx'

const ABREV_MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES = mesesCursoActual().map(({ mes, anio }) => ({ mes, anio, label: ABREV_MES[mes - 1] }))
const ORDEN_METODO = { sepa: 0, transferencia: 1, bizum: 2, efectivo: 3 }
const COLUMNAS = [
  { key: 'sepa',          label: 'Domiciliado',   dot: 'fin-col__dot--sepa' },
  { key: 'transferencia', label: 'Transferencia', dot: 'fin-col__dot--transf' },
  { key: 'bizum',         label: 'Bizum',         dot: 'fin-col__dot--bizum' },
  { key: 'efectivo',      label: 'Efectivo',      dot: 'fin-col__dot--efectivo' },
]
const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

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
      map.set(key, { key, familia_id: a.familia_id, nombres: [a.nombre],
        precio_total: a.precio_neto ?? 0, metodo_pago: a.familias?.metodo_pago ?? null })
    } else {
      map.get(key).nombres.push(a.nombre)
    }
  })
  return [...map.values()].sort((a, b) => {
    const oa = ORDEN_METODO[a.metodo_pago] ?? 99
    const ob = ORDEN_METODO[b.metodo_pago] ?? 99
    return oa !== ob ? oa - ob : a.nombres[0].localeCompare(b.nombres[0])
  })
}

function computeSparkData(pagos) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return pagos.filter(p => p.pagado && p.anio === d.getFullYear() && p.mes === d.getMonth() + 1)
      .reduce((s, p) => s + Number(p.importe), 0)
  })
}

function Sparkline({ data }) {
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => `${(i / 5) * 120},${28 - (v / max) * 24}`).join(' ')
  return (
    <svg className="fin-spark" viewBox="0 0 120 28" preserveAspectRatio="none">
      <polygon className="fin-spark__area"
        points={`0,28 ${pts} 120,28`} fill="var(--bg-soft)" stroke="none" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}

export function FinanzasIngresos() {
  const [grupos, setGrupos]     = React.useState([])
  const [pagos, setPagos]       = React.useState([])
  const [cargando, setCargando] = React.useState(true)
  const [errorCarga, setErrorCarga]       = React.useState(null)
  const [errorGuardado, setErrorGuardado] = React.useState(null)
  const [vista, setVista]   = React.useState('pendientes')
  const [mesIdx, setMesIdx] = React.useState(defaultMesIdx)
  const [saliendo, setSaliendo] = React.useState(new Set())

  const cargar = React.useCallback(async () => {
    setCargando(true); setErrorCarga(null)
    const { data: a, error: errA } = await supabase
      .from('alumnos').select('id, nombre, familia_id, familias(nombre, metodo_pago)')
      .eq('activo', true).order('nombre')
    if (errA) { setErrorCarga('No se pudieron cargar los alumnos.'); setCargando(false); return }
    const familiaIds = (a ?? []).map(x => x.familia_id).filter(Boolean)
    const [{ data: t }, { data: p, error: errP }] = await Promise.all([
      familiaIds.length > 0
        ? supabase.from('tarifas').select('familia_id, precio_neto').in('familia_id', familiaIds)
        : Promise.resolve({ data: [] }),
      supabase.from('pagos').select('*').gte('anio', anioInicioCurso()),
    ])
    if (errP) { setErrorCarga('No se pudieron cargar los pagos.'); setCargando(false); return }
    const alumnosConTarifa = (a ?? []).map(x => ({
      ...x, precio_neto: t?.find(tar => tar.familia_id === x.familia_id)?.precio_neto ?? 0,
    }))
    setGrupos(agrupar(alumnosConTarifa))
    setPagos(p ?? [])
    setCargando(false)
  }, [])

  React.useEffect(() => { cargar() }, [cargar])

  const getPago  = (fid, mes, anio) => pagos.find(p => p.familia_id === fid && p.mes === mes && p.anio === anio)

  const toggle = async (grupo, mes, anio) => {
    if (!grupo.familia_id) return
    const existing = getPago(grupo.familia_id, mes, anio)
    const pagado = !(existing?.pagado ?? false)
    const fecha_pago = pagado ? new Date().toISOString().split('T')[0] : null
    const importe = grupo.precio_total
    const snapshot = pagos
    setPagos(prev => [
      ...prev.filter(p => !(p.familia_id === grupo.familia_id && p.mes === mes && p.anio === anio)),
      { familia_id: grupo.familia_id, anio, mes, importe, pagado, fecha_pago },
    ])
    const { error: e } = await supabase.from('pagos').upsert(
      { familia_id: grupo.familia_id, anio, mes, importe, pagado, fecha_pago },
      { onConflict: 'familia_id,anio,mes' }
    )
    if (e) { setPagos(snapshot); setErrorGuardado('No se pudo guardar el pago.') }
  }

  const marcarPagado = (grupo) => {
    const { mes, anio } = MESES[mesIdx]
    setSaliendo(prev => new Set([...prev, grupo.key]))
    setTimeout(() => {
      setSaliendo(prev => { const s = new Set(prev); s.delete(grupo.key); return s })
      toggle(grupo, mes, anio)
    }, 320)
  }

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>
  if (errorCarga) return <div className="alumnos-estado alumnos-estado--error">⚠️ {errorCarga}</div>

  const { mes, anio } = MESES[mesIdx]
  const gruposConTarifa = grupos.filter(g => g.precio_total > 0)
  const pagadosCount    = gruposConTarifa.filter(g => getPago(g.familia_id, mes, anio)?.pagado).length
  const totalEsperado   = gruposConTarifa.reduce((s, g) => s + g.precio_total, 0)
  const totalRecaudado  = gruposConTarifa.reduce((s, g) =>
    s + (getPago(g.familia_id, mes, anio)?.pagado ? g.precio_total : 0), 0)
  const pendientesTotal = gruposConTarifa.filter(g => !getPago(g.familia_id, mes, anio)?.pagado).length
  const sparkData = computeSparkData(pagos)
  const avgMes = sparkData.filter(v => v > 0)
  const avgLabel = avgMes.length ? eur(avgMes.reduce((s, v) => s + v, 0) / avgMes.length) + ' prom. mensual' : 'Sin datos'

  return (
    <>
      {errorGuardado && (
        <div className="pag-error-banner" role="alert">
          ⚠️ {errorGuardado}
          <button className="pag-error-banner__close" onClick={() => setErrorGuardado(null)}>✕</button>
        </div>
      )}

      <div className="fin-kpis">
        <div className="fin-kpi">
          <span className="fin-kpi__lbl">Cobrado · {ABREV_MES[mes - 1]} {anio}</span>
          <div className="fin-kpi__val">{pagadosCount}<span className="fin-kpi__cur">/ {gruposConTarifa.length}</span></div>
          <div className="fin-kpi__sub">{pendientesTotal > 0 && <span className="fin-kpi__delta fin-kpi__delta--neg">{pendientesTotal} pendientes</span>}</div>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi__lbl">Recaudado</span>
          <div className="fin-kpi__val">{totalRecaudado.toLocaleString('es-ES')}<span className="fin-kpi__cur">€</span></div>
          <div className="fin-kpi__sub">de {eur(totalEsperado)} previstos</div>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi__lbl">Pendiente</span>
          <div className="fin-kpi__val">{(totalEsperado - totalRecaudado).toLocaleString('es-ES')}<span className="fin-kpi__cur">€</span></div>
          <div className="fin-kpi__sub"><span className="fin-kpi__delta fin-kpi__delta--neu">{pendientesTotal} familias</span></div>
        </div>
        <div className="fin-kpi">
          <span className="fin-kpi__lbl">Últimos 6 meses</span>
          <Sparkline data={sparkData} />
          <div className="fin-kpi__sub">{avgLabel}</div>
        </div>
      </div>

      <div className="fin-filters">
        <span className="fin-seg">
          <button className={`fin-seg__btn${vista === 'pendientes' ? ' fin-seg__btn--on' : ''}`} onClick={() => setVista('pendientes')}>
            Pendientes{pendientesTotal > 0 ? ` · ${pendientesTotal}` : ''}
          </button>
          <button className={`fin-seg__btn${vista === 'historial' ? ' fin-seg__btn--on' : ''}`} onClick={() => setVista('historial')}>
            Historial
          </button>
        </span>
        {vista === 'pendientes' && (
          <select className="topic__input" style={{ width: 'auto' }} value={mesIdx}
            onChange={e => setMesIdx(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i}>{m.label} {m.anio}</option>)}
          </select>
        )}
      </div>

      {vista === 'pendientes' && (
        pendientesTotal === 0 ? (
          <div className="pag-all-done"><Icon.check /> Todo cobrado este mes</div>
        ) : (
          <div className="fin-cols" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {COLUMNAS.map(col => {
              const familias = gruposConTarifa.filter(g =>
                g.metodo_pago === col.key && !getPago(g.familia_id, mes, anio)?.pagado)
              const totalCol = familias.reduce((s, g) => s + g.precio_total, 0)
              return (
                <div key={col.key} className="fin-col">
                  <div className="fin-col__head">
                    <span className="fin-col__name">
                      <span className={`fin-col__dot ${col.dot}`} />
                      {col.label}
                    </span>
                    <span className="fin-col__count">{familias.length} · {totalCol} €</span>
                  </div>
                  <div className="fin-col__body">
                    {familias.length === 0 ? (
                      <div className="fin-col__ok"><Icon.check /> Al día</div>
                    ) : (
                      familias.map(g => {
                        const exiting = saliendo.has(g.key)
                        return (
                          <div key={g.key} className={`fin-row${exiting ? ' pag-col-item--exit' : ''}`}>
                            <div className="fin-row__who">
                              <span className="fin-row__name">{g.nombres.join(' + ')}</span>
                              {g.nombres.length > 1 && <span className="fin-row__sub">{g.nombres.length} alumnos</span>}
                            </div>
                            <div className="fin-row__amt">
                              {g.precio_total > 0 ? g.precio_total : '—'}
                              {g.precio_total > 0 && <span className="fin-row__amt-cur"> €</span>}
                            </div>
                            <button className="fin-check fin-check--pending"
                              onClick={() => marcarPagado(g)}
                              disabled={exiting || !g.familia_id}
                              title="Marcar cobrado">
                              <Icon.check />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {vista === 'historial' && (
        <div className="fin-card">
          <div className="fin-card__body fin-card__body--flush" style={{ overflowX: 'auto' }}>
            <table className="fin-tab" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Familia</th>
                  {MESES.map((m, i) => <th key={i} className="fin-tab__num" style={{ minWidth: 40 }}>{m.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => (
                  <tr key={g.key}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{g.nombres.join(' + ')}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{g.precio_total > 0 ? `${g.precio_total} €` : '—'}</div>
                    </td>
                    {MESES.map((m, i) => {
                      const pago = getPago(g.familia_id, m.mes, m.anio)
                      return (
                        <td key={i} className="fin-tab__num">
                          <input type="checkbox" className="pag-check"
                            checked={pago?.pagado ?? false}
                            disabled={!g.familia_id}
                            onChange={() => toggle(g, m.mes, m.anio)} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OtrosIngresos />
    </>
  )
}
