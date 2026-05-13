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
  const [grupos, setGrupos] = React.useState([])
  const [pagos, setPagos] = React.useState([])
  const [cargando, setCargando] = React.useState(true)

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

  if (cargando) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" /> Cargando pagos…
      </div>
    )
  }

  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  return (
    <div className="pag-wrap">
      <table className="pag-table">
        <thead>
          <tr>
            <th className="pag-th pag-th--name">Alumno</th>
            <th className="pag-th pag-th--importe">€/mes</th>
            {MESES.map(m => (
              <th
                key={`${m.mes}-${m.anio}`}
                className={`pag-th pag-th--mes${m.mes === mesActual && m.anio === anioActual ? ' pag-th--current' : ''}`}
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
                  <span className="pag-nombre">{g.nombres.join(' + ')}</span>
                  {metodo && (
                    <span className={`pag-badge ${metodo.cls}`}>{metodo.label}</span>
                  )}
                </td>
                <td className="pag-td pag-td--importe">
                  {g.precio_total > 0 ? `${g.precio_total} €` : '—'}
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
  )
}
