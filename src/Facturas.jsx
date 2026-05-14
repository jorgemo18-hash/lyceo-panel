import React from 'react'
import { supabase } from './supabase.js'

const EMISOR = {
  nombre: 'MORENO PARDO JORGE',
  dni: '18042793Y',
  direccion: 'C/ Alvarado 4, 22100 Sangarrén (Huesca)',
  telefono: '675 32 41 28',
  email: 'info@lyceoacademia.es',
}

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

const MESES_NOMBRE = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

const METODOS_LABEL = {
  bizum:         'Bizum',
  transferencia: 'Transferencia bancaria',
  efectivo:      'Efectivo',
  sepa:          'Domiciliación bancaria (SEPA)',
}

function eur(n) {
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function defaultMesIdx() {
  const now = new Date()
  const idx = MESES.findIndex(m => m.mes === now.getMonth() + 1 && m.anio === now.getFullYear())
  return idx >= 0 ? idx : MESES.length - 1
}

// ── Hoja A4 ───────────────────────────────────────────────────────
function FacturaSheet({ alumno, familia, tarifa, factura, mes, anio }) {
  const precioBruto = tarifa?.precio_bruto ?? 0
  const descPct     = tarifa?.descuento_pct ?? 0
  const descImporte = Math.round(precioBruto * descPct / 100 * 100) / 100
  const precioNeto  = Math.round(precioBruto * (1 - descPct / 100) * 100) / 100
  const mesNombre   = MESES_NOMBRE[mes - 1]

  const fecha = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const dirCompleta = [
    familia?.direccion,
    [familia?.codigo_postal, familia?.ciudad].filter(Boolean).join(' '),
  ].filter(Boolean).join(', ')

  return (
    <div className="fac-sheet">

      {/* Cabecera */}
      <div className="fac-head">
        <div className="fac-head__left">
          <div className="fac-head__emisor-name">{EMISOR.nombre} · {EMISOR.dni}</div>
          <div className="fac-head__emisor-line">{EMISOR.direccion}</div>
          <div className="fac-head__emisor-line">Teléfono: {EMISOR.telefono}</div>
          <div className="fac-head__emisor-line">Email: {EMISOR.email}</div>
        </div>
        <div className="fac-head__right">
          <img src="logo.png" alt="Lyceo" className="fac-head__logo" />
        </div>
      </div>

      <div className="fac-divider" />

      {/* Título */}
      <div className="fac-title">Factura {factura.numero_factura}</div>

      {/* Dos columnas: cliente + pago */}
      <div className="fac-sections">
        <div className="fac-section">
          <div className="fac-section__title">Datos del cliente</div>
          <div className="fac-section__row">
            <span className="fac-section__lbl">Nombre</span>
            <span>{familia?.nombre ?? alumno.nombre}</span>
          </div>
          {familia?.dni && (
            <div className="fac-section__row">
              <span className="fac-section__lbl">DNI/NIF</span>
              <span>{familia.dni}</span>
            </div>
          )}
          {dirCompleta && (
            <div className="fac-section__row">
              <span className="fac-section__lbl">Dirección</span>
              <span>{dirCompleta}</span>
            </div>
          )}
        </div>
        <div className="fac-section">
          <div className="fac-section__title">Datos del pago</div>
          <div className="fac-section__row">
            <span className="fac-section__lbl">Fecha de emisión</span>
            <span>{fecha}</span>
          </div>
          {familia?.metodo_pago && (
            <div className="fac-section__row">
              <span className="fac-section__lbl">Método de pago</span>
              <span>{METODOS_LABEL[familia.metodo_pago] ?? familia.metodo_pago}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabla de conceptos */}
      <table className="fac-table">
        <thead>
          <tr>
            <th className="fac-th fac-th--desc">Descripción</th>
            <th className="fac-th fac-th--num">Precio</th>
            <th className="fac-th fac-th--num">Cantidad</th>
            <th className="fac-th fac-th--num">Impuesto</th>
            <th className="fac-th fac-th--num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="fac-td">
              Clases Lyceo {alumno.nombre} · mes de {mesNombre} {anio}
            </td>
            <td className="fac-td fac-td--num">{eur(precioBruto)}</td>
            <td className="fac-td fac-td--num">1</td>
            <td className="fac-td fac-td--num fac-td--exento">Exento IVA Art. 20</td>
            <td className="fac-td fac-td--num">{eur(precioBruto)}</td>
          </tr>
          {descPct > 0 && (
            <tr>
              <td className="fac-td fac-td--desc">Descuento {descPct}%</td>
              <td className="fac-td fac-td--num">{eur(-descImporte)}</td>
              <td className="fac-td fac-td--num">1</td>
              <td className="fac-td fac-td--num">—</td>
              <td className="fac-td fac-td--num">{eur(-descImporte)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} />
            <td className="fac-tfoot-lbl">Subtotal</td>
            <td className="fac-tfoot-val">{eur(precioNeto)}</td>
          </tr>
          <tr>
            <td colSpan={3} />
            <td className="fac-tfoot-lbl">Base IVA 0%</td>
            <td className="fac-tfoot-val">{eur(precioNeto)}</td>
          </tr>
          <tr>
            <td colSpan={3} />
            <td className="fac-tfoot-lbl">IVA 0%</td>
            <td className="fac-tfoot-val">0,00 €</td>
          </tr>
          <tr className="fac-tfoot-total">
            <td colSpan={3} />
            <td className="fac-tfoot-lbl fac-tfoot-lbl--total">Total Factura</td>
            <td className="fac-tfoot-val fac-tfoot-val--total">{eur(precioNeto)}</td>
          </tr>
        </tfoot>
      </table>

      <p className="fac-footnote">
        Operación exenta de IVA según Art. 20.Uno.9º de la Ley 37/1992.
      </p>
    </div>
  )
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

  const { mes, anio } = MESES[mesIdx]

  // Alumnos + familias — una vez
  React.useEffect(() => {
    const cargar = async () => {
      const { data: a } = await supabase
        .from('alumnos')
        .select('id, nombre, curso, familia_id, familias(nombre, dni, direccion, ciudad, codigo_postal, metodo_pago)')
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

  // Facturas del mes seleccionado
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
      .from('facturas')
      .select('id', { count: 'exact', head: true })
      .eq('anio', year)
    return `Lyceo-${year}-${String((count ?? 0) + 1).padStart(3, '0')}`
  }

  const generarFactura = async (alumno) => {
    const tarifa = getTarifa(alumno)
    const importe = tarifa?.precio_neto ?? 0
    const numero = await generarNumero(anio)
    const { data, error } = await supabase
      .from('facturas')
      .insert({ familia_id: alumno.familia_id, alumno_id: alumno.id, anio, mes, importe, numero_factura: numero })
      .select()
      .single()
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

  const volver = () => { setAlumnoSel(null); setFacturaSel(null) }

  if (cargando) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" /> Cargando…
      </div>
    )
  }

  // ── Vista factura individual ──
  if (alumnoSel && facturaSel) {
    return (
      <div className="fac-view">
        <div className="fac-toolbar no-print">
          <button className="btn btn--ghost btn--sm" onClick={volver}>← Volver</button>
          <button className="btn btn--primary" onClick={onPrint}>
            <Icon.printer /> Imprimir / PDF
          </button>
        </div>
        <FacturaSheet
          alumno={alumnoSel}
          familia={alumnoSel.familias}
          tarifa={getTarifa(alumnoSel)}
          factura={facturaSel}
          mes={mes}
          anio={anio}
        />
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
