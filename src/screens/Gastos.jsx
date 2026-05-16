import React from 'react'
import { supabase } from '../lib/supabase.js'

const CATEGORIAS = [
  { value: 'material',      label: 'Material',      color: '#2563eb' },
  { value: 'gasolina',      label: 'Gasolina',      color: '#d97706' },
  { value: 'formacion',     label: 'Formación',     color: '#7c3aed' },
  { value: 'suministros',   label: 'Suministros',   color: '#0891b2' },
  { value: 'software',      label: 'Software',      color: '#4f46e5' },
  { value: 'alimentacion',  label: 'Alimentación',  color: '#16a34a' },
  { value: 'transporte',    label: 'Transporte',    color: '#b45309' },
  { value: 'otros',         label: 'Otros',         color: '#6b7280' },
]

const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function catInfo(value) {
  return CATEGORIAS.find(c => c.value === value) ?? CATEGORIAS.at(-1)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const FORM_INICIAL = {
  fecha: today(), proveedor: '', concepto: '', cif: '',
  categoria: 'otros', importe: '', notas: '',
}

// ── Convierte imagen a JPEG via canvas ────────────────────────────
function convertirAJpeg(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.9)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

// ── Panel nuevo gasto ─────────────────────────────────────────────
function NuevoGastoPanel({ onClose, onSaved }) {
  const [form, setForm] = React.useState(FORM_INICIAL)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [ocr, setOcr] = React.useState({ procesando: false, msg: null })
  const fileRef = React.useRef(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleOcr = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcr({ procesando: true, msg: null })
    try {
      const base64 = await convertirAJpeg(file)
      const res = await fetch(
        'https://hafjurzuvfglrtjmbbdu.supabase.co/functions/v1/extraer-gasto',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, mediaType: 'image/jpeg' }) }
      )
      const datos = await res.json()
      if (datos.error) throw new Error(datos.error)
      setForm(prev => ({
        ...prev,
        ...(datos.fecha      ? { fecha: datos.fecha }           : {}),
        ...(datos.proveedor  ? { proveedor: datos.proveedor }   : {}),
        ...(datos.concepto   ? { concepto: datos.concepto }     : {}),
        ...(datos.cif        ? { cif: datos.cif }               : {}),
        ...(datos.categoria  ? { categoria: datos.categoria }   : {}),
        ...(datos.importe    ? { importe: datos.importe }        : {}),
        ...(datos.notas      ? { notas: datos.notas }           : {}),
      }))
      setOcr({ procesando: false, msg: 'ok' })
    } catch (err) {
      setOcr({ procesando: false, msg: 'Error: ' + (err.message ?? 'al procesar') })
    }
    e.target.value = ''
  }

  const valid = form.fecha && form.concepto.trim() && form.importe !== ''

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('gastos').insert({
        fecha:      form.fecha,
        proveedor:  form.proveedor.trim(),
        concepto:   form.concepto.trim(),
        cif:        form.cif.trim() || null,
        categoria:  form.categoria,
        importe:    Number(form.importe),
        notas:      form.notas.trim() || null,
      })
      if (e) throw e
      onSaved()
    } catch (err) {
      setError(err.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Nuevo gasto</h2>
          <button className="panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="panel__body">

          {/* OCR */}
          <section className="panel__section" style={{ paddingBottom: 0 }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleOcr} />
            <button
              type="button"
              className="btn btn--ghost"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              onClick={() => fileRef.current?.click()}
              disabled={ocr.procesando}
            >
              {ocr.procesando
                ? <><span className="alumnos-estado__spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Procesando ticket…</>
                : <><Icon.receipt /> Subir foto de factura</>}
            </button>
            {ocr.msg === 'ok' && (
              <div className="ocr-ok">Datos extraídos — revisa antes de guardar</div>
            )}
            {ocr.msg && ocr.msg !== 'ok' && (
              <div className="panel__error" style={{ marginTop: 6 }}>{ocr.msg}</div>
            )}
          </section>

          {/* Campos */}
          <section className="panel__section">
            <label className="panel__field">
              <span className="panel__lbl">Fecha *</span>
              <input className="panel__input" type="date" value={form.fecha}
                onChange={e => set('fecha', e.target.value)} />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Proveedor</span>
              <input className="panel__input" value={form.proveedor}
                onChange={e => set('proveedor', e.target.value)} placeholder="Nombre del comercio" />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Concepto *</span>
              <input className="panel__input" value={form.concepto}
                onChange={e => set('concepto', e.target.value)} placeholder="Descripción del gasto" />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">CIF / NIF proveedor</span>
              <input className="panel__input" value={form.cif}
                onChange={e => set('cif', e.target.value)} placeholder="B12345678" />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Categoría</span>
              <select className="panel__input panel__select" value={form.categoria}
                onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Importe (€) *</span>
              <input className="panel__input" type="number" min="0" step="0.01"
                value={form.importe} onChange={e => set('importe', e.target.value)}
                placeholder="0.00" />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Notas</span>
              <textarea className="panel__input panel__textarea" rows={2}
                value={form.notas} onChange={e => set('notas', e.target.value)}
                placeholder="Opcional…" />
            </label>
          </section>

        </div>

        {error && <div className="panel__error">{error}</div>}

        <div className="panel__foot">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={handleSave}
            disabled={saving || !valid}>
            {saving ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ── Gastos ────────────────────────────────────────────────────────
export function Gastos() {
  const [gastos, setGastos] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [showPanel, setShowPanel] = React.useState(false)

  const cargar = React.useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (e) setError(e.message)
    else { setGastos(data ?? []); setError(null) }
    setLoading(false)
  }, [])

  React.useEffect(() => { cargar() }, [cargar])

  const eliminar = async (id) => {
    const { error: e } = await supabase.from('gastos').delete().eq('id', id)
    if (e) alert(e.message)
    else setGastos(prev => prev.filter(g => g.id !== id))
  }

  // Totales por categoría
  const stats = React.useMemo(() => {
    const totales = {}
    for (const g of gastos) {
      totales[g.categoria] = (totales[g.categoria] ?? 0) + Number(g.importe)
    }
    return CATEGORIAS
      .map(c => ({ ...c, total: totales[c.value] ?? 0 }))
      .filter(c => c.total > 0)
  }, [gastos])

  const totalGeneral = gastos.reduce((s, g) => s + Number(g.importe), 0)

  return (
    <>
      {/* Stats */}
      {stats.length > 0 && (
        <div className="gastos-stats">
          {stats.map(c => (
            <div key={c.value} className="gastos-stat">
              <span className="gastos-stat__dot" style={{ background: c.color }} />
              <span className="gastos-stat__label">{c.label}</span>
              <span className="gastos-stat__val">{eur(c.total)}</span>
            </div>
          ))}
          <div className="gastos-stat gastos-stat--total">
            <span className="gastos-stat__label">Total</span>
            <span className="gastos-stat__val">{eur(totalGeneral)}</span>
          </div>
        </div>
      )}

      {/* Botón añadir */}
      <div className="gastos-bar">
        <button className="btn btn--primary" onClick={() => setShowPanel(true)}>
          <Icon.plus /> Añadir gasto
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="alumnos-estado">
          <div className="alumnos-estado__spinner" /> Cargando gastos…
        </div>
      ) : error ? (
        <div className="alumnos-estado alumnos-estado--error">Error: {error}</div>
      ) : gastos.length === 0 ? (
        <div className="alumnos-estado">Sin gastos registrados.</div>
      ) : (
        <div className="gastos-table-wrap">
          <table className="gastos-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th className="gastos-table__num">Importe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => {
                const cat = catInfo(g.categoria)
                return (
                  <tr key={g.id} className="gastos-row">
                    <td className="gastos-row__fecha">
                      {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="gastos-row__proveedor">{g.proveedor || '—'}</td>
                    <td className="gastos-row__concepto">
                      {g.concepto}
                      {g.notas && <span className="gastos-row__notas"> · {g.notas}</span>}
                    </td>
                    <td>
                      <span className="gastos-badge" style={{ background: cat.color + '1a', color: cat.color, borderColor: cat.color + '44' }}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="gastos-table__num gastos-row__importe">{eur(g.importe)}</td>
                    <td className="gastos-row__actions">
                      <button
                        className="alumno-card__archive-btn"
                        title="Eliminar"
                        onClick={() => { if (confirm(`¿Eliminar "${g.concepto}"?`)) eliminar(g.id) }}
                      >
                        <Icon.absent />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPanel && (
        <NuevoGastoPanel
          onClose={() => setShowPanel(false)}
          onSaved={() => { setShowPanel(false); cargar() }}
        />
      )}
    </>
  )
}
