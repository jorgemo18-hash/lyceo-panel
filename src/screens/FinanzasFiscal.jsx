import React from 'react'
import { supabase } from '../lib/supabase.js'
import { Fiscal } from './Fiscal.jsx'

const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const anioHoy  = new Date().getFullYear()
const mesHoy   = new Date().getMonth()
const trimHoy  = Math.ceil((mesHoy + 1) / 3)
const MES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function proximaFecha() {
  const y = anioHoy
  const vencimientos = [
    { label: `M130 · 1T ${y}`, fecha: new Date(y, 0, 20) },
    { label: `M130 · 2T ${y}`, fecha: new Date(y, 3, 20) },
    { label: `M130 · 3T ${y}`, fecha: new Date(y, 6, 20) },
    { label: `M130 · 4T ${y}`, fecha: new Date(y, 9, 20) },
    { label: `M130 · 1T ${y + 1}`, fecha: new Date(y + 1, 0, 20) },
  ]
  const now = new Date()
  return vencimientos.find(v => v.fecha > now) ?? vencimientos.at(-1)
}

function BarChart({ ingMes, gastMes }) {
  const maxVal = Math.max(...ingMes, ...gastMes, 1)
  const H = 160, BOTTOM = 178, W = 720, SLOT = 60, BW = 16, GAP = 3

  return (
    <svg className="fin-chart__svg" viewBox={`0 0 ${W} ${BOTTOM + 14}`} preserveAspectRatio="none">
      {[0.33, 0.66, 1].map(p => (
        <line key={p} className="fin-chart__grid" x1="0" y1={H - p * H} x2={W} y2={H - p * H} />
      ))}
      {MES_CORTO.map((mes, i) => {
        const x    = i * SLOT
        const ih   = (ingMes[i] / maxVal) * H
        const gh   = (gastMes[i] / maxVal) * H
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
  const [ingMes, setIngMes]   = React.useState(Array(12).fill(0))
  const [gastMes, setGastMes] = React.useState(Array(12).fill(0))
  const [cargando, setCargando] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      supabase.from('pagos').select('mes, importe').eq('anio', anioHoy).eq('pagado', true),
      supabase.from('gastos').select('fecha, importe')
        .gte('fecha', `${anioHoy}-01-01`).lte('fecha', `${anioHoy}-12-31`),
      supabase.from('otros_ingresos').select('fecha, importe')
        .gte('fecha', `${anioHoy}-01-01`).lte('fecha', `${anioHoy}-12-31`),
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
  }, [])

  const totIng    = ingMes.reduce((s, v) => s + v, 0)
  const totGast   = gastMes.reduce((s, v) => s + v, 0)
  const beneficio = totIng - totGast
  const margen    = totIng > 0 ? (beneficio / totIng * 100).toFixed(1) : '0,0'

  const { label: dueLabel, fecha: dueFecha } = proximaFecha()
  const diasRestantes = Math.max(0, Math.ceil((dueFecha - new Date()) / 86400000))

  return (
    <>
      {!cargando && (
        <div className="fin-kpis">
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Ingresos {anioHoy}</span>
            <div className="fin-kpi__val">
              {totIng.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
              <span className="fin-kpi__cur">€</span>
            </div>
            <div className="fin-kpi__sub">ene–{MES_CORTO[mesHoy].toLowerCase()}</div>
          </div>
          <div className="fin-kpi">
            <span className="fin-kpi__lbl">Gastos {anioHoy}</span>
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
        <div className="fin-fiscal-grid">
          <div className="fin-card">
            <div className="fin-card__head">
              <h3 className="fin-card__title">Ingresos vs Gastos · {anioHoy}</h3>
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

          <div className="fin-due">
            <div className="fin-due__body">
              <span className="fin-due__lbl">Próximo a Hacienda</span>
              <span className="fin-due__title">{dueLabel}</span>
              <span className="fin-due__when">
                Vence {dueFecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · faltan {diasRestantes} días
              </span>
            </div>
            <div className="fin-due__amt">
              <span className="fin-due__amt-num" style={{ fontSize: 18 }}>Ver cálculo →</span>
              <span className="fin-due__amt-lbl">En Modelo 130</span>
            </div>
          </div>
        </div>
      )}

      <Fiscal />
    </>
  )
}
