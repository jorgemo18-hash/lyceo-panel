import React from 'react'
import { supabase } from '../lib/supabase.js'

const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const anioHoy = new Date().getFullYear()
const trimHoy = Math.ceil((new Date().getMonth() + 1) / 3)
const ANIOS = Array.from({ length: 4 }, (_, i) => anioHoy - 2 + i)
const MESES_T = { 1:[1,2,3], 2:[1,2,3,4,5,6], 3:[1,2,3,4,5,6,7,8,9], 4:[1,2,3,4,5,6,7,8,9,10,11,12] }
const FIN_T   = { 1:'-03-31', 2:'-06-30', 3:'-09-30', 4:'-12-31' }
const MES_FIN = { 1:'mar', 2:'jun', 3:'sep', 4:'dic' }
const NOMBRES_MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function sumImporte(arr) {
  return (arr ?? []).reduce((s, r) => s + Number(r.importe ?? 0), 0)
}

// ── Modelo 130 ────────────────────────────────────────────────────
function Tab130({ anio, trimestre }) {
  const [ingresos, setIngresos]   = React.useState(null)
  const [gastos, setGastos]       = React.useState(null)
  const [pagosAnt, setPagosAnt]   = React.useState('')
  const [cargando, setCargando]   = React.useState(true)
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => {
    setCargando(true)
    Promise.all([
      supabase.from('pagos').select('importe')
        .eq('anio', anio).in('mes', MESES_T[trimestre]).eq('pagado', true),
      supabase.from('gastos').select('importe')
        .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}${FIN_T[trimestre]}`),
      supabase.from('configuracion').select('valor')
        .eq('clave', `m130_ant_${anio}_q${trimestre}`).maybeSingle(),
    ]).then(([p, g, c]) => {
      setIngresos(sumImporte(p.data))
      setGastos(sumImporte(g.data))
      setPagosAnt(c.data?.valor ?? '')
      setCargando(false)
    })
  }, [anio, trimestre])

  const guardarPagosAnt = async () => {
    setGuardando(true)
    await supabase.from('configuracion')
      .upsert({ clave: `m130_ant_${anio}_q${trimestre}`, valor: pagosAnt }, { onConflict: 'clave' })
    setGuardando(false)
  }

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Calculando…</div>

  const rendimiento = ingresos - gastos
  const pago20      = Math.max(0, rendimiento * 0.2)
  const ant         = parseFloat(pagosAnt) || 0
  const aIngresar   = Math.max(0, pago20 - ant)

  return (
    <div className="fiscal__content">
      {trimestre === 3 && (
        <div className="fiscal__aviso">
          <Icon.note /> Julio y agosto no computan — solo se incluye septiembre
        </div>
      )}
      <div className="fiscal__card">
        <div className="fiscal__row">
          <span className="fiscal__label">Ingresos acumulados (ene–{MES_FIN[trimestre]})</span>
          <span className="fiscal__value">{eur(ingresos)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Gastos acumulados</span>
          <span className="fiscal__value">{eur(gastos)}</span>
        </div>
        <div className="fiscal__row fiscal__row--sep">
          <span className="fiscal__label">Rendimiento neto</span>
          <span className="fiscal__value">{eur(rendimiento)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">20% del rendimiento neto</span>
          <span className="fiscal__value">{eur(pago20)}</span>
        </div>
      </div>

      <div className="fiscal__card">
        <label className="field__label">Pagos anteriores este año</label>
        <div className="fiscal__input-row">
          <input
            className="topic__input"
            type="number"
            step="0.01"
            min="0"
            value={pagosAnt}
            onChange={e => setPagosAnt(e.target.value)}
            placeholder="0,00"
          />
          <button className="btn btn--ghost btn--sm" onClick={guardarPagosAnt} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="fiscal__resultado">
        <span className="fiscal__resultado__label">A ingresar · M130 {trimestre}T {anio}</span>
        <span className="fiscal__resultado__valor">{eur(aIngresar)}</span>
      </div>
    </div>
  )
}

// ── Modelo 115 ────────────────────────────────────────────────────
function Tab115({ anio, trimestre }) {
  const [alquiler, setAlquiler]   = React.useState(null)
  const [cargando, setCargando]   = React.useState(true)
  const [editando, setEditando]   = React.useState(false)
  const [editVal, setEditVal]     = React.useState('')
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => {
    supabase.from('configuracion').select('valor').eq('clave', 'alquiler_mensual').maybeSingle()
      .then(({ data }) => {
        if (data?.valor) { setAlquiler(Number(data.valor)); setEditVal(data.valor) }
        else setEditando(true)
        setCargando(false)
      })
  }, [])

  const guardar = async () => {
    const n = parseFloat(editVal)
    if (isNaN(n) || n <= 0) return
    setGuardando(true)
    await supabase.from('configuracion')
      .upsert({ clave: 'alquiler_mensual', valor: String(n) }, { onConflict: 'clave' })
    setAlquiler(n)
    setEditando(false)
    setGuardando(false)
  }

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>

  if (editando || alquiler === null) {
    return (
      <div className="fiscal__content">
        <div className="fiscal__card">
          <div className="field">
            <label className="field__label">Alquiler mensual (€)</label>
            <div className="fiscal__input-row">
              <input className="topic__input" type="number" step="0.01" min="0"
                value={editVal} onChange={e => setEditVal(e.target.value)} placeholder="0,00" autoFocus />
              <button className="btn btn--primary btn--sm" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const baseT      = alquiler * 3
  const retencionT = baseT * 0.19
  const baseAnual  = alquiler * 12
  const retAnual   = baseAnual * 0.19

  return (
    <div className="fiscal__content">
      <div className="fiscal__card">
        <div className="fiscal__row">
          <span className="fiscal__label">Alquiler mensual</span>
          <span className="fiscal__value">{eur(alquiler)}
            <button className="fiscal__edit-link" onClick={() => { setEditando(true) }}>Editar</button>
          </span>
        </div>
        <div className="fiscal__row fiscal__row--sep">
          <span className="fiscal__label">Base imponible {trimestre}T (× 3 meses)</span>
          <span className="fiscal__value">{eur(baseT)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Retención 19%</span>
          <span className="fiscal__value">{eur(retencionT)}</span>
        </div>
      </div>
      <div className="fiscal__resultado">
        <span className="fiscal__resultado__label">A ingresar · M115 {trimestre}T {anio}</span>
        <span className="fiscal__resultado__valor">{eur(retencionT)}</span>
      </div>
      <div className="fiscal__card">
        <div className="fiscal__card-title">Resumen anual · Modelo 180 ({anio})</div>
        <div className="fiscal__row">
          <span className="fiscal__label">Total alquiler pagado</span>
          <span className="fiscal__value">{eur(baseAnual)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Total retención 19%</span>
          <span className="fiscal__value">{eur(retAnual)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Resumen anual ─────────────────────────────────────────────────
function TabResumen({ anio }) {
  const [ingMes, setIngMes]     = React.useState(null)
  const [gastMes, setGastMes]   = React.useState(null)
  const [m130Ant, setM130Ant]   = React.useState(0)
  const [alquiler, setAlquiler] = React.useState(0)
  const [cargando, setCargando] = React.useState(true)

  React.useEffect(() => {
    setCargando(true)
    Promise.all([
      supabase.from('pagos').select('mes, importe').eq('anio', anio).eq('pagado', true),
      supabase.from('gastos').select('fecha, importe')
        .gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`),
      supabase.from('configuracion').select('clave, valor')
        .like('clave', `m130_ant_${anio}_%`),
      supabase.from('configuracion').select('valor').eq('clave', 'alquiler_mensual').maybeSingle(),
    ]).then(([p, g, m130, alqRes]) => {
      const ing = Array(12).fill(0)
      ;(p.data ?? []).forEach(r => { ing[r.mes - 1] += Number(r.importe) })
      const gast = Array(12).fill(0)
      ;(g.data ?? []).forEach(r => { gast[parseInt(r.fecha.split('-')[1]) - 1] += Number(r.importe) })
      // Pagos 130: max stored "pagos anteriores" = cumulative paid up to last known quarter
      const m130Vals = (m130.data ?? []).map(r => Number(r.valor || 0))
      setM130Ant(m130Vals.length ? Math.max(...m130Vals) : 0)
      setIngMes(ing)
      setGastMes(gast)
      setAlquiler(Number(alqRes.data?.valor ?? 0))
      setCargando(false)
    })
  }, [anio])

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Calculando…</div>

  const totIng   = ingMes.reduce((s, v) => s + v, 0)
  const totGast  = gastMes.reduce((s, v) => s + v, 0)
  const retAnual = alquiler * 12 * 0.19

  return (
    <div className="fiscal__content">
      <table className="fiscal__table">
        <thead>
          <tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Beneficio neto</th></tr>
        </thead>
        <tbody>
          {NOMBRES_MES.map((mes, i) => {
            const ing  = ingMes[i]
            const gast = gastMes[i]
            const ben  = ing - gast
            return ing === 0 && gast === 0
              ? <tr key={i} className="fiscal__row-dim"><td>{mes}</td><td>—</td><td>—</td><td>—</td></tr>
              : <tr key={i}><td>{mes}</td><td>{eur(ing)}</td><td>{eur(gast)}</td>
                  <td className={ben < 0 ? 'fiscal__neg' : ''}>{eur(ben)}</td></tr>
          })}
        </tbody>
        <tfoot>
          <tr className="fiscal__table-foot">
            <td>Total</td>
            <td>{eur(totIng)}</td>
            <td>{eur(totGast)}</td>
            <td className={totIng - totGast < 0 ? 'fiscal__neg' : ''}>{eur(totIng - totGast)}</td>
          </tr>
        </tfoot>
      </table>
      <div className="fiscal__card">
        <div className="fiscal__card-title">Estimación pagos a Hacienda {anio}</div>
        <div className="fiscal__row">
          <span className="fiscal__label">M130 — pagos trimestrales acumulados</span>
          <span className="fiscal__value">{eur(m130Ant)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">M115 — retenciones alquiler anuales</span>
          <span className="fiscal__value">{eur(retAnual)}</span>
        </div>
        <div className="fiscal__row fiscal__row--sep">
          <span className="fiscal__label fiscal__label--strong">Total estimado Hacienda</span>
          <span className="fiscal__value fiscal__value--strong">{eur(m130Ant + retAnual)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────
export function Fiscal() {
  const [tab, setTab]           = React.useState('130')
  const [anio, setAnio]         = React.useState(anioHoy)
  const [trimestre, setTrimestre] = React.useState(trimHoy)

  return (
    <div className="fiscal">
      <div className="fiscal__toolbar">
        <div className="inf-tabs">
          {[['130','Modelo 130'],['115','Modelo 115'],['resumen','Resumen anual']].map(([id, label]) => (
            <button key={id} className={`inf-tab${tab === id ? ' inf-tab--on' : ''}`} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="fiscal__selectors">
          <select className="topic__input fiscal__sel" value={anio} onChange={e => setAnio(Number(e.target.value))}>
            {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {tab !== 'resumen' && (
            <select className="topic__input fiscal__sel" value={trimestre} onChange={e => setTrimestre(Number(e.target.value))}>
              {[1,2,3,4].map(t => <option key={t} value={t}>{t}T</option>)}
            </select>
          )}
        </div>
      </div>

      {tab === '130'     && <Tab130     anio={anio} trimestre={trimestre} />}
      {tab === '115'     && <Tab115     anio={anio} trimestre={trimestre} />}
      {tab === 'resumen' && <TabResumen anio={anio} />}
    </div>
  )
}
