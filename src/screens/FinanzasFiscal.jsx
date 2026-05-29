import React from 'react'
import { supabase } from '../lib/supabase.js'
import { Fiscal } from './Fiscal.jsx'

const anioHoy  = new Date().getFullYear()
const ANIOS    = Array.from({ length: 5 }, (_, i) => anioHoy - 4 + i)
const TRIM_MESES = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }
const MES_CORTO  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function BarChart({ ingMes, gastMes }) {
  const maxVal = Math.max(...ingMes, ...gastMes, 1)
  const H = 160, BOTTOM = 178, W = 720, SLOT = 60, BW = 16, GAP = 3

  return (
    <svg className="fin-chart__svg" viewBox={`0 0 ${W} ${BOTTOM + 14}`} preserveAspectRatio="none">
      {[0.33, 0.66, 1].map(p => (
        <line key={p} className="fin-chart__grid" x1="0" y1={H - p * H} x2={W} y2={H - p * H} />
      ))}
      {MES_CORTO.map((mes, i) => {
        const x  = i * SLOT
        const ih = (ingMes[i] / maxVal) * H
        const gh = (gastMes[i] / maxVal) * H
        return (
          <g key={i}>
            {ih > 0
              ? <rect className="fin-chart__bar-ing" x={x + 12} y={H - ih} width={BW} height={ih} />
              : <rect className="fin-chart__bar-empty" x={x + 12} y={H - 4} width={BW} height={4} />}
            {gh > 0
              ? <rect className="fin-chart__bar-gas" x={x + 12 + BW + GAP} y={H - gh} width={BW} height={gh} />
              : <rect className="fin-chart__bar-empty" x={x + 12 + BW + GAP} y={H - 4} width={BW} height={4} />}
            <text className="fin-chart__axis" x={x + 20 + BW / 2} y={BOTTOM} textAnchor="middle">{mes}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function FinanzasFiscal() {
  const [filtroAnio, setFiltroAnio] = React.useState(anioHoy)
  const [filtroTrim, setFiltroTrim] = React.useState(null)
  const [ingMes, setIngMes]         = React.useState(Array(12).fill(0))
  const [gastMes, setGastMes]       = React.useState(Array(12).fill(0))
  const [cargando, setCargando]     = React.useState(true)

  React.useEffect(() => {
    setCargando(true)
    Promise.all([
      supabase.from('pagos').select('mes, importe').eq('anio', filtroAnio).eq('pagado', true),
      supabase.from('gastos').select('fecha, importe')
        .gte('fecha', `${filtroAnio}-01-01`).lte('fecha', `${filtroAnio}-12-31`),
      supabase.from('otros_ingresos').select('fecha, importe')
        .gte('fecha', `${filtroAnio}-01-01`).lte('fecha', `${filtroAnio}-12-31`),
    ]).then(([p, g, oi]) => {
      const ing = Array(12).fill(0)
      ;(p.data ?? []).forEach(r => { ing[r.mes - 1] += Number(r.importe) })
      ;(oi.data ?? []).forEach(r => { ing[parseInt(r.fecha.split('-')[1]) - 1] += Number(r.importe) })
      const gast = Array(12).fill(0)
      ;(g.data ?? []).forEach(r => { gast[parseInt(r.fecha.split('-')[1]) - 1] += Number(r.importe) })
      setIngMes(ing)
      setGastMes(gast)
      setCargando(false)
    })
  }, [filtroAnio])

  const mesesTotals = (arr) => filtroTrim
    ? TRIM_MESES[filtroTrim].reduce((s, m) => s + arr[m - 1], 0)
    : arr.reduce((s, v) => s + v, 0)

  const totIng    = mesesTotals(ingMes)
  const totGast   = mesesTotals(gastMes)
  const beneficio = totIng - totGast
  const margen    = totIng > 0 ? (beneficio / totIng * 100).toFixed(1) : '0,0'
  const mesHoy    = new Date().getMonth()

  const periodoSub = filtroTrim
    ? `T${filtroTrim} · ${['ene–mar','abr–jun','jul–sep','oct–dic'][filtroTrim - 1]}`
    : `ene–${MES_CORTO[mesHoy].toLowerCase()}`

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
            <span className="fin-kpi__lbl">Ingresos {filtroAnio}</span>
            <div className="fin-kpi__val">
              {totIng.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">{periodoSub}</div>
          </div>
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Gastos {filtroAnio}</span>
            <div className="fin-kpi__val">
              {totGast.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">deducibles</div>
          </div>
          <div className="fin-kpi fin-kpi--pos">
            <span className="fin-kpi__lbl">Beneficio neto</span>
            <div className="fin-kpi__val">
              {beneficio.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">rendimiento neto</div>
          </div>
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Margen</span>
            <div className="fin-kpi__val">{margen}<span className="fin-kpi__cur">%</span></div>
          </div>
        </div>
      )}

      {!cargando && (
        <div className="fin-card">
          <div className="fin-card__head">
            <h3 className="fin-card__title">Ingresos vs Gastos · {filtroAnio}</h3>
            <span className="fin-card__sub">Mensual</span>
          </div>
          <div className="fin-card__body fin-card__body--flush">
            <div className="fin-chart">
              <div className="fin-chart__legend">
                <span className="fin-chart__leg-item">
                  <span className="fin-chart__leg-sw fin-chart__leg-sw--ing" /> Ingresos
                </span>
                <span className="fin-chart__leg-item">
                  <span className="fin-chart__leg-sw fin-chart__leg-sw--gas" /> Gastos
                </span>
              </div>
              <BarChart ingMes={ingMes} gastMes={gastMes} />
            </div>
          </div>
        </div>
      )}

      <Fiscal />
    </>
  )
}
