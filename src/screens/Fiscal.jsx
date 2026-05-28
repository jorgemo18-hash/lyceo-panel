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

// ── Helpers de casilla ────────────────────────────────────────────
function CasillaAuto({ num, label, value, sep, dim }) {
  const cn = String(num).padStart(2, '0')
  return (
    <div className={`fiscal__row${sep ? ' fiscal__row--sep' : ''}${dim ? ' fiscal__row--dim' : ''}`}>
      <span className="fiscal__label"><span className="fiscal__cnum">[{cn}]</span> {label}</span>
      <span className="fiscal__value">{eur(value)}</span>
    </div>
  )
}

function CasillaEdit({ num, label, value, onChange, onBlur }) {
  const cn = String(num).padStart(2, '0')
  return (
    <div className="fiscal__row">
      <span className="fiscal__label"><span className="fiscal__cnum">[{cn}]</span> {label}</span>
      <input
        className="fiscal__casilla-input"
        type="number" step="0.01" min="0"
        value={value}
        placeholder="0,00"
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  )
}

// ── Modelo 130 ────────────────────────────────────────────────────
function Tab130({ anio, trimestre }) {
  const [ingresos, setIngresos]   = React.useState(0)
  const [gastos, setGastos]       = React.useState(0)
  const [cargando, setCargando]   = React.useState(true)
  const [guardando, setGuardando] = React.useState(false)
  const [guardado, setGuardado]   = React.useState(false)
  const [edit, setEdit] = React.useState({ c06:'', c13:'', c15:'', c16:'', c18:'' })

  const setF = (k, v) => setEdit(prev => ({ ...prev, [k]: v }))
  const num  = (k)    => parseFloat(edit[k]) || 0

  React.useEffect(() => {
    setCargando(true)
    setGuardado(false)
    const prevKeys = [1,2,3,4].filter(q => q < trimestre).map(q => `m130_aingresar_${anio}_q${q}`)
    const editKeys = [6,13,15,16,18].map(n => `m130_${n}_${anio}_q${trimestre}`)
    Promise.all([
      supabase.from('pagos').select('importe').eq('anio', anio).in('mes', MESES_T[trimestre]).eq('pagado', true),
      supabase.from('gastos').select('importe').gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}${FIN_T[trimestre]}`),
      prevKeys.length > 0
        ? supabase.from('configuracion').select('valor').in('clave', prevKeys)
        : Promise.resolve({ data: [] }),
      supabase.from('configuracion').select('clave, valor').in('clave', editKeys),
    ]).then(([p, g, prev, saved]) => {
      setIngresos(sumImporte(p.data))
      setGastos(sumImporte(g.data))
      const pagosAntAuto = (prev.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0)
      const m = Object.fromEntries((saved.data ?? []).map(r => [r.clave.split('_')[1], r.valor]))
      setEdit({
        c06: m['6']  ?? '',
        c13: m['13'] ?? '',
        c15: m['15'] ?? '',
        c16: m['16'] ?? (pagosAntAuto > 0 ? String(pagosAntAuto) : ''),
        c18: m['18'] ?? '',
      })
      setCargando(false)
    })
  }, [anio, trimestre])

  const saveCasilla = (casilla, value) =>
    supabase.from('configuracion').upsert(
      { clave: `m130_${casilla}_${anio}_q${trimestre}`, valor: String(parseFloat(value) || 0) },
      { onConflict: 'clave' }
    )

  const guardarCalculo = async () => {
    const c03 = ingresos - gastos
    const c04 = Math.max(0, c03 * 0.2)
    const c07 = c04 - num('c06')
    const c14 = c07 - num('c13')
    const c17 = c14 - num('c15') - num('c16')
    const c19 = Math.max(0, c17 - num('c18'))
    setGuardando(true)
    await supabase.from('configuracion').upsert(
      { clave: `m130_aingresar_${anio}_q${trimestre}`, valor: String(c19) },
      { onConflict: 'clave' }
    )
    setGuardando(false)
    setGuardado(true)
  }

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Calculando…</div>

  const c01 = ingresos
  const c02 = gastos
  const c03 = c01 - c02
  const c04 = Math.max(0, c03 * 0.2)
  const c07 = c04 - num('c06')
  const c14 = c07 - num('c13')
  const c17 = c14 - num('c15') - num('c16')
  const c19 = Math.max(0, c17 - num('c18'))

  return (
    <div className="fiscal__content">
      {trimestre === 3 && (
        <div className="fiscal__aviso">
          <Icon.note /> Julio y agosto no computan — solo se incluye septiembre
        </div>
      )}

      <div className="fiscal__card">
        <div className="fiscal__card-title">Actividades en estimación directa</div>
        <CasillaAuto num={1}  label={`Ingresos computables del período (ene–${MES_FIN[trimestre]})`} value={c01} />
        <CasillaAuto num={2}  label="Gastos fiscalmente deducibles" value={c02} />
        <CasillaAuto num={3}  label="Rendimiento neto (01 − 02)" value={c03} sep />
        <CasillaAuto num={4}  label="20% de la casilla 03" value={c04} />
        <CasillaAuto num={5}  label="Cuota módulos / actividades especiales" value={0} dim />
        <CasillaEdit num={6}  label="Minoración del pago fraccionado"
          value={edit.c06} onChange={v => setF('c06', v)} onBlur={() => saveCasilla(6, edit.c06)} />
        <CasillaAuto num={7}  label="Resultado (04 + 05 − 06)" value={c07} sep />
      </div>

      <div className="fiscal__card">
        <div className="fiscal__card-title">Liquidación</div>
        <CasillaAuto num="08–12" label="Actividades agrícolas, ganaderas y forestales" value={0} dim />
        <CasillaEdit num={13} label="A deducir por cuotas de períodos anteriores con resultado negativo"
          value={edit.c13} onChange={v => setF('c13', v)} onBlur={() => saveCasilla(13, edit.c13)} />
        <CasillaAuto num={14} label="Cuota del pago fraccionado (07 + 08–12 − 13)" value={c14} sep />
        <CasillaEdit num={15} label="Retenciones e ingresos a cuenta soportados en el ejercicio"
          value={edit.c15} onChange={v => setF('c15', v)} onBlur={() => saveCasilla(15, edit.c15)} />
        <CasillaEdit num={16} label="Pagos fraccionados del ejercicio ya ingresados con anterioridad"
          value={edit.c16} onChange={v => setF('c16', v)} onBlur={() => saveCasilla(16, edit.c16)} />
        <CasillaAuto num={17} label="Resultado (14 − 15 − 16)" value={c17} sep />
        <CasillaEdit num={18} label="A compensar por declaraciones anteriores con resultado negativo"
          value={edit.c18} onChange={v => setF('c18', v)} onBlur={() => saveCasilla(18, edit.c18)} />
      </div>

      <div className="fiscal__resultado">
        <span className="fiscal__resultado__label">[19] A ingresar · M130 {trimestre}T {anio}</span>
        <span className="fiscal__resultado__valor">{eur(c19)}</span>
      </div>

      <div className="fiscal__guardar-row">
        <button className="btn btn--ghost btn--sm" onClick={guardarCalculo} disabled={guardando || guardado}>
          {guardando ? 'Guardando…' : guardado ? 'Guardado' : 'Guardar cálculo'}
        </button>
        {guardado && <span className="fiscal__guardado"><Icon.check /> Este trimestre queda descontado en los siguientes</span>}
      </div>
    </div>
  )
}

// ── Modelo 115 ────────────────────────────────────────────────────
function Tab115({ anio, trimestre }) {
  const [base, setBase]           = React.useState(null)
  const [cargando, setCargando]   = React.useState(true)
  const [editando, setEditando]   = React.useState(false)
  const [editVal, setEditVal]     = React.useState('')
  const [guardando, setGuardando] = React.useState(false)

  React.useEffect(() => {
    supabase.from('configuracion').select('valor').eq('clave', 'alquiler_base').maybeSingle()
      .then(({ data }) => {
        if (data?.valor) { setBase(Number(data.valor)); setEditVal(data.valor) }
        else setEditando(true)
        setCargando(false)
      })
  }, [])

  const guardar = async () => {
    const n = parseFloat(editVal)
    if (isNaN(n) || n <= 0) return
    setGuardando(true)
    await supabase.from('configuracion')
      .upsert({ clave: 'alquiler_base', valor: String(n) }, { onConflict: 'clave' })
    setBase(n)
    setEditando(false)
    setGuardando(false)
  }

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>

  if (editando || base === null) {
    return (
      <div className="fiscal__content">
        <div className="fiscal__card">
          <div className="field">
            <label className="field__label">Base mensual del alquiler (€ sin IVA)</label>
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

  const iva   = base * 0.21
  const ret   = base * 0.19
  const total = base + iva - ret
  const baseT = base * 3
  const retT  = ret  * 3
  const baseA = base * 12
  const retA  = ret  * 12

  return (
    <div className="fiscal__content">
      <div className="fiscal__card">
        <div className="fiscal__card-title">Desglose mensual</div>
        <div className="fiscal__row">
          <span className="fiscal__label">Base</span>
          <span className="fiscal__value">
            {eur(base)}
            <button className="fiscal__edit-link" onClick={() => setEditando(true)}>Editar</button>
          </span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">IVA 21%</span>
          <span className="fiscal__value">{eur(iva)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Retención 19%</span>
          <span className="fiscal__value fiscal__value--dim">− {eur(ret)}</span>
        </div>
        <div className="fiscal__row fiscal__row--sep">
          <span className="fiscal__label fiscal__label--strong">Total a pagar al propietario</span>
          <span className="fiscal__value fiscal__value--strong">{eur(total)}</span>
        </div>
      </div>

      <div className="fiscal__card">
        <div className="fiscal__card-title">Modelo 115 · {trimestre}T {anio}</div>
        <div className="fiscal__row">
          <span className="fiscal__label">Base trimestral (× 3 meses)</span>
          <span className="fiscal__value">{eur(baseT)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Retención trimestral 19%</span>
          <span className="fiscal__value">{eur(retT)}</span>
        </div>
      </div>

      <div className="fiscal__resultado">
        <span className="fiscal__resultado__label">A ingresar · M115 {trimestre}T {anio}</span>
        <span className="fiscal__resultado__valor">{eur(retT)}</span>
      </div>

      <div className="fiscal__card">
        <div className="fiscal__card-title">Modelo 180 · Resumen anual {anio}</div>
        <div className="fiscal__row">
          <span className="fiscal__label">Base anual alquiler</span>
          <span className="fiscal__value">{eur(baseA)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">Total retenido 19%</span>
          <span className="fiscal__value">{eur(retA)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Resumen anual ─────────────────────────────────────────────────
function TabResumen({ anio }) {
  const [ingMes, setIngMes]             = React.useState(null)
  const [gastMes, setGastMes]           = React.useState(null)
  const [m130Total, setM130Total]       = React.useState(0)
  const [alquilerBase, setAlquilerBase] = React.useState(0)
  const [cargando, setCargando]         = React.useState(true)

  React.useEffect(() => {
    setCargando(true)
    Promise.all([
      supabase.from('pagos').select('mes, importe').eq('anio', anio).eq('pagado', true),
      supabase.from('gastos').select('fecha, importe').gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`),
      supabase.from('configuracion').select('clave, valor').like('clave', `m130_aingresar_${anio}_%`),
      supabase.from('configuracion').select('valor').eq('clave', 'alquiler_base').maybeSingle(),
    ]).then(([p, g, m130, alqRes]) => {
      const ing = Array(12).fill(0)
      ;(p.data ?? []).forEach(r => { ing[r.mes - 1] += Number(r.importe) })
      const gast = Array(12).fill(0)
      ;(g.data ?? []).forEach(r => { gast[parseInt(r.fecha.split('-')[1]) - 1] += Number(r.importe) })
      setIngMes(ing)
      setGastMes(gast)
      setM130Total((m130.data ?? []).reduce((s, r) => s + Number(r.valor || 0), 0))
      setAlquilerBase(Number(alqRes.data?.valor ?? 0))
      setCargando(false)
    })
  }, [anio])

  if (cargando) return <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Calculando…</div>

  const totIng   = ingMes.reduce((s, v) => s + v, 0)
  const totGast  = gastMes.reduce((s, v) => s + v, 0)
  const retAnual = alquilerBase * 12 * 0.19

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
          <span className="fiscal__label">M130 — trimestres guardados</span>
          <span className="fiscal__value">{eur(m130Total)}</span>
        </div>
        <div className="fiscal__row">
          <span className="fiscal__label">M115 — retenciones alquiler anuales</span>
          <span className="fiscal__value">{eur(retAnual)}</span>
        </div>
        <div className="fiscal__row fiscal__row--sep">
          <span className="fiscal__label fiscal__label--strong">Total estimado Hacienda</span>
          <span className="fiscal__value fiscal__value--strong">{eur(m130Total + retAnual)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla principal ────────────────────────────────────────────
export function Fiscal() {
  const [tab, setTab]             = React.useState('130')
  const [anio, setAnio]           = React.useState(anioHoy)
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
