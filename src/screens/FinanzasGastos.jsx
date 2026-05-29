import React from 'react'
import { supabase } from '../lib/supabase.js'
import { Gastos } from './Gastos.jsx'

const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const anioHoy = new Date().getFullYear()
const ANIOS = Array.from({ length: 5 }, (_, i) => anioHoy - 4 + i)
const TRIM_LABEL = { 1: 'ene–mar', 2: 'abr–jun', 3: 'jul–sep', 4: 'oct–dic' }
const TRIM_MESES = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }

const CAT_COLORS = {
  alquiler: '#b45309', luz: '#d97706', internet: '#2563eb', seguro: '#0891b2',
  proteccion_datos: '#4f46e5', fotocopiadora: '#7c3aed', extintores: '#dc2626',
  agua: '#06b6d4', publicidad: '#db2777', cuota_autonomo: '#7c3aed',
  gestoria: '#475569', material: '#16a34a', pagina_web: '#6366f1',
  remesa_adeudos: '#059669', otros: '#6b7280',
}
const CAT_LABELS = {
  alquiler: 'Alquiler', luz: 'Luz', internet: 'Internet', seguro: 'Seguro',
  proteccion_datos: 'Prot. datos', fotocopiadora: 'Fotocopiadora', extintores: 'Extintores',
  agua: 'Agua', publicidad: 'Publicidad', cuota_autonomo: 'Cuota autónomo',
  gestoria: 'Gestoría', material: 'Material', pagina_web: 'Página web',
  remesa_adeudos: 'Remesa', otros: 'Otros',
}

export function FinanzasGastos() {
  const [filtroAnio, setFiltroAnio] = React.useState(anioHoy)
  const [filtroTrim, setFiltroTrim] = React.useState(null)
  const [gastosAnio, setGastosAnio] = React.useState([])
  const [cargando, setCargando]     = React.useState(true)

  React.useEffect(() => {
    setCargando(true)
    supabase.from('gastos').select('fecha, importe, iva_importe, categoria')
      .gte('fecha', `${filtroAnio}-01-01`).lte('fecha', `${filtroAnio}-12-31`)
      .then(({ data }) => { setGastosAnio(data ?? []); setCargando(false) })
  }, [filtroAnio])

  const gastosPeriodo = filtroTrim
    ? gastosAnio.filter(g => TRIM_MESES[filtroTrim].includes(parseInt(g.fecha.split('-')[1])))
    : gastosAnio

  const totalPeriodo = gastosPeriodo.reduce((s, g) => s + Number(g.importe), 0)
  const ivaTotal     = gastosPeriodo.reduce((s, g) => s + Number(g.iva_importe ?? 0), 0)
  const ticketMedio  = gastosPeriodo.length > 0 ? totalPeriodo / gastosPeriodo.length : 0

  const catTotals = {}
  for (const g of gastosPeriodo) catTotals[g.categoria] = (catTotals[g.categoria] ?? 0) + Number(g.importe)
  const catStats = Object.entries(catTotals)
    .map(([k, v]) => ({ key: k, label: CAT_LABELS[k] ?? k, color: CAT_COLORS[k] ?? '#6b7280', total: v }))
    .sort((a, b) => b.total - a.total)

  const periodoLabel = filtroTrim ? `T${filtroTrim} · ${TRIM_LABEL[filtroTrim]}` : String(filtroAnio)

  return (
    <>
      <div className="fin-filters">
        <div className="fin-filters__group">
          <span className="fin-filters__lbl">AÑO</span>
          <div className="fin-seg">
            {ANIOS.map(a => (
              <button key={a}
                className={`fin-seg__btn${filtroAnio === a ? ' fin-seg__btn--on' : ''}`}
                onClick={() => setFiltroAnio(a)}>{a}</button>
            ))}
          </div>
        </div>
        <div className="fin-filters__group">
          <span className="fin-filters__lbl">TRIMESTRE</span>
          <div className="fin-seg">
            <button
              className={`fin-seg__btn${filtroTrim === null ? ' fin-seg__btn--on' : ''}`}
              onClick={() => setFiltroTrim(null)}>Todos</button>
            {[1,2,3,4].map(t => (
              <button key={t}
                className={`fin-seg__btn${filtroTrim === t ? ' fin-seg__btn--on' : ''}`}
                onClick={() => setFiltroTrim(t)}>T{t}</button>
            ))}
          </div>
        </div>
      </div>

      {!cargando && (
        <div className="fin-kpis">
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Total {periodoLabel}</span>
            <div className="fin-kpi__val">
              {totalPeriodo.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">{gastosPeriodo.length} facturas</div>
          </div>
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">IVA soportado</span>
            <div className="fin-kpi__val">
              {ivaTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">deducible</div>
          </div>
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Ticket medio</span>
            <div className="fin-kpi__val">
              {ticketMedio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">por factura</div>
          </div>
        </div>
      )}

      {catStats.length > 0 && (
        <div className="fin-card">
          <div className="fin-card__head">
            <h3 className="fin-card__title">Reparto por categoría</h3>
            <span className="fin-card__sub">Total {eur(totalPeriodo)}</span>
          </div>
          <div className="fin-card__body">
            <div className="fin-stacked">
              <div className="fin-stacked__bar">
                {catStats.map(c => (
                  <div key={c.key} className="fin-stacked__seg"
                    style={{ width: `${(c.total / totalPeriodo) * 100}%`, background: c.color }}
                    title={`${c.label}: ${eur(c.total)}`} />
                ))}
              </div>
              <div className="fin-stacked__legend">
                {catStats.map(c => (
                  <div key={c.key} className="fin-stacked__item">
                    <span className="fin-stacked__sw" style={{ background: c.color }} />
                    {c.label} <span className="fin-stacked__amt">{eur(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Gastos />
    </>
  )
}
