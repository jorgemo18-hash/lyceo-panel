import React from 'react'
import { flushSync } from 'react-dom'
import { supabase } from './supabase.js'
import { FacturaSheet, InformeSheet, rango, eur } from './sheets.jsx'

const MESES = [
  { label: 'Septiembre 2025', mes: 9,  anio: 2025 },
  { label: 'Octubre 2025',    mes: 10, anio: 2025 },
  { label: 'Noviembre 2025',  mes: 11, anio: 2025 },
  { label: 'Diciembre 2025',  mes: 12, anio: 2025 },
  { label: 'Enero 2026',      mes: 1,  anio: 2026 },
  { label: 'Febrero 2026',    mes: 2,  anio: 2026 },
  { label: 'Marzo 2026',      mes: 3,  anio: 2026 },
  { label: 'Abril 2026',      mes: 4,  anio: 2026 },
  { label: 'Mayo 2026',       mes: 5,  anio: 2026 },
  { label: 'Junio 2026',      mes: 6,  anio: 2026 },
]

function defaultMesIdx() {
  const now = new Date()
  const idx = MESES.findIndex(m => m.mes === now.getMonth() + 1 && m.anio === now.getFullYear())
  return idx >= 0 ? idx : MESES.length - 1
}

function makeHtmlDoc(inner) {
  return `<!DOCTYPE html>
<html lang="es">
<head><base href="${window.location.origin}/">${document.head.innerHTML}</head>
<body style="margin:0;padding:0;background:#fff">${inner}</body>
</html>`
}

// ── Pantalla principal ─────────────────────────────────────────────
export function Facturas() {
  const [mesIdx, setMesIdx]         = React.useState(defaultMesIdx)
  const [alumnos, setAlumnos]       = React.useState([])
  const [tarifas, setTarifas]       = React.useState([])
  const [facturas, setFacturas]     = React.useState([])
  const [alumnoSel, setAlumnoSel]   = React.useState(null)
  const [facturaSel, setFacturaSel] = React.useState(null)
  const [cargando, setCargando]     = React.useState(true)
  const [generando, setGenerando]   = React.useState(false)
  const [enviando, setEnviando]     = React.useState(false)
  const [envioStatus, setEnvioStatus] = React.useState(null)
  const [hiddenInfData, setHiddenInfData] = React.useState(null)

  const facturaRef   = React.useRef(null)
  const hiddenInfRef = React.useRef(null)

  const { mes, anio } = MESES[mesIdx]

  React.useEffect(() => {
    const cargar = async () => {
      const { data: a } = await supabase
        .from('alumnos')
        .select('id, nombre, curso, familia_id, familias(nombre, email, dni, direccion, ciudad, codigo_postal, metodo_pago)')
        .eq('activo', true)
        .order('nombre')

      const familiaIds = (a ?? []).map(x => x.familia_id).filter(Boolean)
      const { data: t } = familiaIds.length > 0
        ? await supabase.from('tarifas').select('familia_id, precio_bruto, descuento_pct, precio_neto').in('familia_id', familiaIds)
        : { data: [] }

      setAlumnos(a ?? [])
      setTarifas(t ?? [])
      setCargando(false)
    }
    cargar().catch(() => setCargando(false))
  }, [])

  React.useEffect(() => {
    supabase
      .from('facturas')
      .select('*')
      .eq('anio', anio)
      .eq('mes', mes)
      .then(({ data }) => setFacturas(data ?? []))
  }, [mes, anio])

  const getTarifa  = (a) => tarifas.find(t => t.familia_id === a.familia_id) ?? null
  const getFactura = (a) => facturas.find(f => f.alumno_id === a.id) ?? null

  const generarNumero = async (year) => {
    const { count } = await supabase
      .from('facturas').select('id', { count: 'exact', head: true }).eq('anio', year)
    return `Lyceo-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
  }

  const generarFactura = async (alumno) => {
    const tarifa = getTarifa(alumno)
    const importe = tarifa?.precio_neto ?? 0
    const numero = await generarNumero(anio)
    const { data, error } = await supabase
      .from('facturas')
      .insert({ familia_id: alumno.familia_id, alumno_id: alumno.id, anio, mes, importe, numero_factura: numero })
      .select().single()
    if (!error && data) {
      setFacturas(prev => [...prev, data])
      return data
    }
    return null
  }

  const generarTodas = async () => {
    setGenerando(true)
    const pendientes = alumnos.filter(a => !getFactura(a) && getTarifa(a))
    for (const a of pendientes) {
      await generarFactura(a)
    }
    setGenerando(false)
  }

  const onClickAlumno = async (alumno) => {
    let fac = getFactura(alumno)
    if (!fac) fac = await generarFactura(alumno)
    if (!fac) return
    setAlumnoSel(alumno)
    setFacturaSel(fac)
    setEnvioStatus(null)
  }

  const onPrint = () => {
    const style = document.createElement('style')
    style.id = 'fac-print-override'
    style.textContent = '@page { size: A4 portrait; margin: 15mm; }'
    document.head.appendChild(style)
    document.body.classList.add('printing-fac')
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        document.head.removeChild(style)
        document.body.classList.remove('printing-fac')
      }, 300)
    }, 30)
  }

  const enviar = async () => {
    if (!alumnoSel || !facturaSel) return
    const email = alumnoSel.familias?.email
    if (!email) return

    setEnviando(true)
    setEnvioStatus(null)

    try {
      // Cargar datos del informe (sesiones + festivos + comentario AI)
      const { primero, ultimo } = rango(mes, anio)
      const [{ data: sesiones }, { data: festivos }] = await Promise.all([
        supabase.from('sesiones').select('*')
          .eq('alumno_id', alumnoSel.id)
          .gte('fecha', primero).lte('fecha', ultimo)
          .order('fecha'),
        supabase.from('festivos').select('*')
          .gte('fecha', primero).lte('fecha', ultimo),
      ])

      let comentario = ''
      if ((sesiones ?? []).filter(s => s.tipo !== 'ausencia').length > 0) {
        try {
          const r = await fetch(
            'https://hafjurzuvfglrtjmbbdu.supabase.co/functions/v1/generar-comentario',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ alumno: alumnoSel.nombre, curso: alumnoSel.curso, sesiones }),
            }
          )
          if (r.ok) comentario = (await r.json()).comentario ?? ''
        } catch {}
      }

      const informe = { sesiones: sesiones ?? [], festivos: festivos ?? [], comentario }

      // Renderizar InformeSheet en div oculto de forma síncrona
      flushSync(() => setHiddenInfData({ alumno: alumnoSel, informe }))

      const htmlFactura = makeHtmlDoc(facturaRef.current?.innerHTML ?? '')
      const htmlInforme = makeHtmlDoc(hiddenInfRef.current?.innerHTML ?? '')

      const res = await fetch('https://lyceo-pdf-service.onrender.com/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDestino: email,
          nombreAlumno: alumnoSel.nombre,
          mes, anio, htmlInforme, htmlFactura,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setEnvioStatus({ ok: true, msg: `Email enviado a ${email}` })
      } else {
        setEnvioStatus({ ok: false, msg: json.error ?? 'Error al enviar' })
      }
    } catch (err) {
      setEnvioStatus({ ok: false, msg: err.message ?? 'Error desconocido' })
    } finally {
      setEnviando(false)
      setHiddenInfData(null)
    }
  }

  const volver = () => { setAlumnoSel(null); setFacturaSel(null); setEnvioStatus(null) }

  if (cargando) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" /> Cargando…
      </div>
    )
  }

  const email = alumnoSel?.familias?.email

  // ── Vista factura individual ──
  if (alumnoSel && facturaSel) {
    return (
      <div className="fac-view">
        {/* Div oculto para InformeSheet al enviar */}
        <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
          <div ref={hiddenInfRef}>
            {hiddenInfData && (
              <InformeSheet
                alumno={hiddenInfData.alumno}
                mes={mes}
                anio={anio}
                informe={hiddenInfData.informe}
              />
            )}
          </div>
        </div>

        <div className="fac-toolbar no-print">
          <button className="btn btn--ghost btn--sm" onClick={volver}>← Volver</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn--primary" onClick={onPrint}>
              <Icon.printer /> Imprimir / PDF
            </button>
            <span title={!email ? 'Sin email registrado' : undefined}>
              <button
                className="btn btn--primary"
                onClick={enviar}
                disabled={!email || enviando}
                style={!email ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                {enviando
                  ? <><span className="btn-spinner" /> Enviando…</>
                  : <><Icon.mail /> Enviar</>}
              </button>
            </span>
          </div>
        </div>

        {envioStatus && (
          <div className={`envio-status ${envioStatus.ok ? 'envio-status--ok' : 'envio-status--err'}`}>
            {envioStatus.msg}
          </div>
        )}

        <div ref={facturaRef}>
          <FacturaSheet
            alumno={alumnoSel}
            familia={alumnoSel.familias}
            tarifa={getTarifa(alumnoSel)}
            factura={facturaSel}
            mes={mes}
            anio={anio}
          />
        </div>
      </div>
    )
  }

  // ── Vista lista ──
  return (
    <div className="fac-layout">
      <aside className="fac-aside">
        <select
          className="fac-mes-sel"
          value={mesIdx}
          onChange={e => {
            setMesIdx(Number(e.target.value))
            setAlumnoSel(null)
            setFacturaSel(null)
          }}
        >
          {MESES.map((m, i) => (
            <option key={i} value={i}>{m.label}</option>
          ))}
        </select>

        <div className="fac-aside__actions">
          <button className="btn btn--primary" onClick={generarTodas} disabled={generando}>
            {generando ? 'Generando…' : 'Generar todas'}
          </button>
        </div>
      </aside>

      <div className="fac-main">
        <table className="fac-list-table">
          <thead>
            <tr>
              <th className="fac-list-th">Alumno</th>
              <th className="fac-list-th fac-list-th--num">Importe</th>
              <th className="fac-list-th">Factura</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map(a => {
              const tarifa  = getTarifa(a)
              const factura = getFactura(a)
              return (
                <tr key={a.id} className="fac-list-row" onClick={() => onClickAlumno(a)}>
                  <td className="fac-list-td">
                    <span className="fac-list-nombre">{a.nombre}</span>
                    <span className="fac-list-curso">{a.curso}</span>
                  </td>
                  <td className="fac-list-td fac-list-td--num">
                    {tarifa ? eur(tarifa.precio_neto) : '—'}
                  </td>
                  <td className="fac-list-td">
                    {factura ? (
                      <span className="fac-badge fac-badge--ok">{factura.numero_factura}</span>
                    ) : (
                      <span className="fac-badge fac-badge--pending">Pendiente</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
