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

export function Pagos() {
  const [alumnos, setAlumnos] = React.useState([])
  const [pagos, setPagos] = React.useState([])
  const [cargando, setCargando] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      supabase
        .from('alumnos')
        .select('id, nombre, familia_id, familias(nombre), tarifas(precio_neto)')
        .eq('activo', true)
        .order('nombre'),
      supabase
        .from('pagos')
        .select('*')
        .gte('anio', 2025),
    ]).then(([{ data: a }, { data: p }]) => {
      setAlumnos(a ?? [])
      setPagos(p ?? [])
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const getPago = (familia_id, mes, anio) =>
    pagos.find(p => p.familia_id === familia_id && p.mes === mes && p.anio === anio)

  const getPrecio = (a) => {
    const t = a.tarifas
    if (!t) return null
    return Array.isArray(t) ? (t[0]?.precio_neto ?? null) : (t.precio_neto ?? null)
  }

  const toggle = async (alumno, mes, anio) => {
    if (!alumno.familia_id) return
    const existing = getPago(alumno.familia_id, mes, anio)
    const pagado = !(existing?.pagado ?? false)
    const importe = getPrecio(alumno)
    const fecha_pago = pagado ? new Date().toISOString().split('T')[0] : null

    setPagos(prev => [
      ...prev.filter(p => !(p.familia_id === alumno.familia_id && p.mes === mes && p.anio === anio)),
      { familia_id: alumno.familia_id, anio, mes, importe, pagado, fecha_pago },
    ])

    await supabase.from('pagos').upsert(
      { familia_id: alumno.familia_id, anio, mes, importe, pagado, fecha_pago },
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
          {alumnos.map(a => {
            const precio = getPrecio(a)
            return (
              <tr key={a.id} className="pag-row">
                <td className="pag-td pag-td--name">
                  <span className="pag-nombre">{a.nombre}</span>
                  {a.familias?.nombre && (
                    <span className="pag-familia">{a.familias.nombre}</span>
                  )}
                </td>
                <td className="pag-td pag-td--importe">
                  {precio != null ? `${precio} €` : '—'}
                </td>
                {MESES.map(m => {
                  const pago = getPago(a.familia_id, m.mes, m.anio)
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
                        disabled={!a.familia_id}
                        onChange={() => toggle(a, m.mes, m.anio)}
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
