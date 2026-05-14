// Componentes de hoja compartidos entre Informes y Facturas
// Extraídos aquí para evitar dependencias circulares al importar
// ambos en los respectivos módulos de envío de email

// ── Helpers comunes ───────────────────────────────────────────────
export function rango(mes, anio) {
  const pad = n => String(n).padStart(2, '0')
  const diasEnMes = new Date(anio, mes, 0).getDate()
  return {
    primero: `${anio}-${pad(mes)}-01`,
    ultimo:  `${anio}-${pad(mes)}-${pad(diasEnMes)}`,
    diasEnMes,
  }
}

export function mesLabel(mes, anio) {
  return new Date(anio, mes - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())
}

export function eur(n) {
  return Number(n).toLocaleString('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }) + ' €'
}

// ── InformeSheet ──────────────────────────────────────────────────
function generarDias(mes, anio, sesiones, festivos) {
  const pad = n => String(n).padStart(2, '0')
  const { diasEnMes } = rango(mes, anio)
  return Array.from({ length: diasEnMes }, (_, i) => {
    const d = i + 1
    const fecha = `${anio}-${pad(mes)}-${pad(d)}`
    const dow = new Date(fecha).getDay()
    const sesion  = sesiones?.find(s => s.fecha === fecha) ?? null
    const festivo = festivos?.find(f => f.fecha === fecha) ?? null
    return { d, fecha, dow, sesion, festivo }
  })
}

function filaInfo(item) {
  const { dow, sesion, festivo } = item
  if (dow === 6) return { cls: 'inf-tr--weekend', asig: 'Sábado',  tema: '' }
  if (dow === 0) return { cls: 'inf-tr--weekend', asig: 'Domingo', tema: '' }
  if (festivo)   return { cls: 'inf-tr--festivo', asig: festivo.nombre ?? 'Festivo', tema: '' }
  if (sesion?.tipo === 'ausencia') return { cls: 'inf-tr--ausencia', asig: 'NO', tema: 'NO' }
  if (sesion)    return { cls: '', asig: sesion.asignatura ?? '', tema: sesion.tema ?? '' }
  return { cls: 'inf-tr--empty', asig: '', tema: '' }
}

export function InformeSheet({ alumno, mes, anio, informe }) {
  const { sesiones, festivos, comentario } = informe
  const dias = generarDias(mes, anio, sesiones, festivos)

  const tabla = (
    <table className="inf-table">
      <thead>
        <tr>
          <th className="inf-th inf-th--dia">Día</th>
          <th className="inf-th inf-th--asig">Asignatura</th>
          <th className="inf-th inf-th--tema">Tema</th>
        </tr>
      </thead>
      <tbody>
        {dias.map(item => {
          const { cls, asig, tema } = filaInfo(item)
          return (
            <tr key={item.d} className={`inf-tr ${cls}`}>
              <td className="inf-td inf-td--dia">{item.d}</td>
              <td className="inf-td">{asig}</td>
              <td className="inf-td">{tema}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  return (
    <div className="inf-sheet">
      <div className="inf-sheet__head">
        <img src="logo.png" alt="Lyceo" className="inf-sheet__logo" />
        <h1 className="inf-sheet__title">Lyceo · Informe mensual</h1>
        <p className="inf-sheet__sub">
          {alumno.nombre} ({alumno.curso}) · {mesLabel(mes, anio)}
        </p>
      </div>

      {comentario ? (
        <div className="inf-cols">
          <div className="inf-col-tabla">{tabla}</div>
          <div className="inf-col-coment">
            <div className="inf-coment">
              <div className="inf-coment__label">Resumen del mes</div>
              <div className="inf-coment__body">{comentario}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="inf-table-solo">{tabla}</div>
      )}
    </div>
  )
}

// ── FacturaSheet ──────────────────────────────────────────────────
const EMISOR = {
  nombre:    'MORENO PARDO JORGE',
  dni:       '18042793Y',
  direccion: 'C/ Alvarado 4, 22100 Sangarrén (Huesca)',
  telefono:  '675 32 41 28',
  email:     'info@lyceoacademia.es',
}

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

export function FacturaSheet({ alumno, familia, tarifa, factura, mes, anio }) {
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
      <div className="fac-title">Factura {factura?.numero_factura}</div>

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
