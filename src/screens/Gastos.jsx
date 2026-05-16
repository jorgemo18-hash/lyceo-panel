import React from 'react'
import { supabase } from '../lib/supabase.js'

const CATEGORIAS = [
  { value: 'alquiler',        label: 'Alquiler',           color: '#b45309' },
  { value: 'luz',             label: 'Luz',                color: '#d97706' },
  { value: 'internet',        label: 'Internet',           color: '#2563eb' },
  { value: 'seguro',          label: 'Seguro',             color: '#0891b2' },
  { value: 'proteccion_datos',label: 'Protección de datos',color: '#4f46e5' },
  { value: 'fotocopiadora',   label: 'Fotocopiadora',      color: '#7c3aed' },
  { value: 'extintores',      label: 'Extintores',         color: '#dc2626' },
  { value: 'agua',            label: 'Agua',               color: '#06b6d4' },
  { value: 'publicidad',      label: 'Publicidad',         color: '#db2777' },
  { value: 'cuota_autonomo',  label: 'Cuota autónomo',     color: '#7c3aed' },
  { value: 'gestoria',        label: 'Gestoría',           color: '#475569' },
  { value: 'material',        label: 'Material',           color: '#16a34a' },
  { value: 'pagina_web',      label: 'Página web',         color: '#6366f1' },
  { value: 'remesa_adeudos',  label: 'Remesa adeudos',     color: '#059669' },
  { value: 'otros',           label: 'Otros',              color: '#6b7280' },
]

const eur = (n) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const round2 = (n) => Math.round(n * 100) / 100

function catInfo(value) {
  return CATEGORIAS.find(c => c.value === value) ?? CATEGORIAS.at(-1)
}

function catDisplay(g) {
  if (g.categoria === 'otros' && g.subcategoria?.trim()) return g.subcategoria.trim()
  return catInfo(g.categoria).label
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const ANIOS = [2025, 2026]
const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const FORM_INICIAL = {
  fecha: today(), proveedor: '', concepto: '', cif: '',
  categoria: 'otros', subcategoria: '',
  base_imponible: '', iva_pct: '', iva_importe: '',
  retencion_pct: '', retencion_importe: '',
  importe: '', notas: '', foto_url: '',
}

function gastoToForm(g) {
  return {
    fecha:              g.fecha ?? today(),
    proveedor:          g.proveedor ?? '',
    concepto:           g.concepto ?? '',
    cif:                g.cif ?? '',
    categoria:          g.categoria ?? 'otros',
    subcategoria:       g.subcategoria ?? '',
    base_imponible:     g.base_imponible  != null ? String(g.base_imponible)  : '',
    iva_pct:            g.iva_pct         != null ? String(g.iva_pct)         : '',
    iva_importe:        g.iva_importe     != null ? String(g.iva_importe)     : '',
    retencion_pct:      g.retencion_pct   != null ? String(g.retencion_pct)   : '',
    retencion_importe:  g.retencion_importe != null ? String(g.retencion_importe) : '',
    importe:            g.importe         != null ? String(g.importe)         : '',
    notas:              g.notas ?? '',
    foto_url:           g.foto_url ?? '',
  }
}

function formToRow(form) {
  return {
    fecha:              form.fecha,
    proveedor:          form.proveedor.trim(),
    concepto:           form.concepto.trim(),
    cif:                form.cif.trim() || null,
    categoria:          form.categoria,
    subcategoria:       form.categoria === 'otros' ? (form.subcategoria.trim() || null) : null,
    base_imponible:     form.base_imponible     !== '' ? Number(form.base_imponible)     : null,
    iva_pct:            form.iva_pct            !== '' ? Number(form.iva_pct)            : null,
    iva_importe:        form.iva_importe        !== '' ? Number(form.iva_importe)        : null,
    retencion_pct:      form.retencion_pct      !== '' ? Number(form.retencion_pct)      : null,
    retencion_importe:  form.retencion_importe  !== '' ? Number(form.retencion_importe)  : null,
    importe:            Number(form.importe),
    notas:              form.notas.trim() || null,
    foto_url:           form.foto_url || null,
  }
}

// ── Convierte imagen a JPEG via canvas, devuelve { base64, blob } ─
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
        reader.onload = () => resolve({ base64: reader.result.split(',')[1], blob })
        reader.readAsDataURL(blob)
      }, 'image/jpeg', 0.9)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

// ── Recalcula campos fiscales derivados ───────────────────────────
function recalcFiscal(prev, changed, value) {
  const next = { ...prev, [changed]: value }
  const base = parseFloat(next.base_imponible) || 0
  if (base > 0) {
    if (changed === 'base_imponible' || changed === 'iva_pct') {
      const pct = parseFloat(next.iva_pct) || 0
      if (pct > 0) next.iva_importe = String(round2(base * pct / 100))
    }
    if (changed === 'base_imponible' || changed === 'retencion_pct') {
      const pct = parseFloat(next.retencion_pct) || 0
      if (pct > 0) next.retencion_importe = String(round2(base * pct / 100))
    }
    const iva = parseFloat(next.iva_importe) || 0
    const ret = parseFloat(next.retencion_importe) || 0
    next.importe = String(round2(base + iva - ret))
  }
  return next
}

// ── Subir imagen a Storage ────────────────────────────────────────
async function subirFoto(blob) {
  const ahora = new Date()
  const anio  = ahora.getFullYear()
  const mes   = String(ahora.getMonth() + 1).padStart(2, '0')
  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(`gastos/${anio}/${mes}/${Date.now()}.jpg`, blob, { contentType: 'image/jpeg' })
  if (error || !data) return null
  const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(data.path)
  return publicUrl
}

// ── Sección de campos fiscales (reutilizada en crear y editar) ────
function CamposFiscales({ form, set }) {
  const tieneDesglose = form.base_imponible !== ''
  return (
    <>
      <label className="panel__field">
        <span className="panel__lbl">Base imponible (€)</span>
        <input className="panel__input" type="number" min="0" step="0.01"
          value={form.base_imponible} onChange={e => set('base_imponible', e.target.value)}
          placeholder="0.00" />
      </label>
      <div className="panel__row">
        <label className="panel__field">
          <span className="panel__lbl">IVA %</span>
          <input className="panel__input" type="number" min="0" max="100" step="0.01"
            value={form.iva_pct} onChange={e => set('iva_pct', e.target.value)}
            placeholder="21" disabled={!tieneDesglose} />
        </label>
        <label className="panel__field">
          <span className="panel__lbl">Importe IVA (€)</span>
          <input className="panel__input" type="number" min="0" step="0.01"
            value={form.iva_importe} onChange={e => set('iva_importe', e.target.value)}
            placeholder="0.00" disabled={!tieneDesglose} />
        </label>
      </div>
      <div className="panel__row">
        <label className="panel__field">
          <span className="panel__lbl">Retención %</span>
          <input className="panel__input" type="number" min="0" max="100" step="0.01"
            value={form.retencion_pct} onChange={e => set('retencion_pct', e.target.value)}
            placeholder="15" disabled={!tieneDesglose} />
        </label>
        <label className="panel__field">
          <span className="panel__lbl">Importe retención (€)</span>
          <input className="panel__input" type="number" min="0" step="0.01"
            value={form.retencion_importe} onChange={e => set('retencion_importe', e.target.value)}
            placeholder="0.00" disabled={!tieneDesglose} />
        </label>
      </div>
      <label className="panel__field">
        <span className="panel__lbl">Total a pagar (€) *</span>
        <input
          className={`panel__input${tieneDesglose ? ' panel__input--calc' : ''}`}
          type="number" min="0" step="0.01"
          value={form.importe}
          onChange={e => !tieneDesglose && set('importe', e.target.value)}
          readOnly={tieneDesglose}
          placeholder="0.00"
        />
      </label>
    </>
  )
}

// ── Panel nuevo gasto ─────────────────────────────────────────────
function NuevoGastoPanel({ onClose, onSaved }) {
  const [form, setForm] = React.useState(FORM_INICIAL)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [ocr, setOcr] = React.useState({ procesando: false, msg: null })
  const fileRef = React.useRef(null)

  const set = (k, v) => setForm(prev => recalcFiscal(prev, k, v))

  const handleOcr = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcr({ procesando: true, msg: null })
    try {
      const { base64, blob } = await convertirAJpeg(file)

      // Subir a Storage (en paralelo con el OCR)
      const [fotoUrl, res] = await Promise.all([
        subirFoto(blob),
        fetch('https://hafjurzuvfglrtjmbbdu.supabase.co/functions/v1/extraer-gasto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mediaType: 'image/jpeg' }),
        }),
      ])

      const datos = await res.json()
      if (datos.error) throw new Error(datos.error)

      setForm(prev => ({
        ...prev,
        foto_url: fotoUrl ?? prev.foto_url,
        ...(datos.fecha      ? { fecha: datos.fecha }         : {}),
        ...(datos.proveedor  ? { proveedor: datos.proveedor } : {}),
        ...(datos.concepto   ? { concepto: datos.concepto }   : {}),
        ...(datos.cif        ? { cif: datos.cif }             : {}),
        ...(datos.categoria  ? { categoria: datos.categoria, subcategoria: '' } : {}),
        ...(datos.importe    ? { importe: datos.importe }     : {}),
        ...(datos.notas      ? { notas: datos.notas }         : {}),
      }))
      setOcr({ procesando: false, msg: 'ok' })
    } catch (err) {
      setOcr({ procesando: false, msg: 'Error: ' + (err.message ?? 'al procesar') })
    }
    e.target.value = ''
  }

  const valid = form.fecha && form.concepto.trim() && form.importe !== '' &&
    (form.categoria !== 'otros' || form.subcategoria.trim() !== '')

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('gastos').insert(formToRow(form))
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
            <button type="button" className="btn btn--ghost"
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              onClick={() => fileRef.current?.click()}
              disabled={ocr.procesando}
            >
              {ocr.procesando
                ? <><span className="alumnos-estado__spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Procesando…</>
                : <><Icon.receipt /> Subir foto de factura</>}
            </button>
            {form.foto_url && <img src={form.foto_url} alt="" className="gastos-foto-preview" />}
            {ocr.msg === 'ok' && <div className="ocr-ok">Datos extraídos — revisa antes de guardar</div>}
            {ocr.msg && ocr.msg !== 'ok' && <div className="panel__error" style={{ marginTop: 6 }}>{ocr.msg}</div>}
          </section>

          {/* Datos generales */}
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
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            {form.categoria === 'otros' && (
              <label className="panel__field">
                <span className="panel__lbl">Especifica *</span>
                <input className="panel__input" value={form.subcategoria}
                  onChange={e => set('subcategoria', e.target.value)}
                  placeholder="Describe el tipo de gasto" autoFocus />
              </label>
            )}
          </section>

          {/* Fiscal */}
          <section className="panel__section">
            <div className="panel__sh">Importe y desglose fiscal</div>
            <CamposFiscales form={form} set={set} />
            <label className="panel__field">
              <span className="panel__lbl">Notas</span>
              <textarea className="panel__input panel__textarea" rows={2}
                value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Opcional…" />
            </label>
          </section>
        </div>

        {error && <div className="panel__error">{error}</div>}

        <div className="panel__foot">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving || !valid}>
            {saving ? 'Guardando…' : 'Guardar gasto'}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ── Panel detalle / edición ───────────────────────────────────────
function DetalleGastoPanel({ gasto, onClose, onDeleted, onUpdated }) {
  const [editando, setEditando]   = React.useState(false)
  const [form, setForm]           = React.useState(() => gastoToForm(gasto))
  const [saving, setSaving]       = React.useState(false)
  const [error, setError]         = React.useState(null)
  const [lightbox, setLightbox]   = React.useState(false)
  const [imgError, setImgError]   = React.useState(false)

  // Reset image error when gasto changes
  React.useEffect(() => { setImgError(false) }, [gasto.foto_url])

  const set = (k, v) => setForm(prev => recalcFiscal(prev, k, v))

  const cancelarEdicion = () => {
    setForm(gastoToForm(gasto))
    setEditando(false)
    setError(null)
  }

  const guardar = async () => {
    setSaving(true)
    setError(null)
    const row = { ...formToRow(form), foto_url: gasto.foto_url ?? null }
    const { data: updated, error: e } = await supabase
      .from('gastos').update(row).eq('id', gasto.id).select().single()
    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false)
    setEditando(false)
    onUpdated(updated)
  }

  const eliminar = async () => {
    if (!confirm(`¿Eliminar "${gasto.concepto || gasto.proveedor || 'este gasto'}"?`)) return
    const { error: e } = await supabase.from('gastos').delete().eq('id', gasto.id)
    if (e) { alert(e.message); return }
    onDeleted(gasto.id)
  }

  const cat = catInfo(gasto.categoria)
  const fmtFecha = (iso) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <aside className="panel">
          <div className="panel__head">
            <h2 className="panel__title">{gasto.proveedor || gasto.concepto || 'Gasto'}</h2>
            <button className="panel__close" onClick={onClose}>✕</button>
          </div>

          <div className="panel__body">
            {/* Foto */}
            {gasto.foto_url && (
              <section className="panel__section" style={{ gap: 8 }}>
                {imgError ? (
                  <div className="gastos-foto-error">No se pudo cargar la imagen</div>
                ) : (
                  <img
                    src={gasto.foto_url}
                    alt="Factura"
                    className="gastos-foto-thumb"
                    onClick={() => setLightbox(true)}
                    onError={() => setImgError(true)}
                    title="Ver a tamaño completo"
                  />
                )}
                <button
                  className="btn btn--ghost btn--sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => window.open(gasto.foto_url, '_blank')}
                >
                  <Icon.doc /> Descargar factura
                </button>
              </section>
            )}

            {editando ? (
              /* ── Modo edición ── */
              <>
                <section className="panel__section">
                  <label className="panel__field">
                    <span className="panel__lbl">Fecha *</span>
                    <input className="panel__input" type="date" value={form.fecha}
                      onChange={e => set('fecha', e.target.value)} />
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">Proveedor</span>
                    <input className="panel__input" value={form.proveedor}
                      onChange={e => set('proveedor', e.target.value)} />
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">Concepto *</span>
                    <input className="panel__input" value={form.concepto}
                      onChange={e => set('concepto', e.target.value)} />
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">CIF / NIF</span>
                    <input className="panel__input" value={form.cif}
                      onChange={e => set('cif', e.target.value)} />
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">Categoría</span>
                    <select className="panel__input panel__select" value={form.categoria}
                      onChange={e => set('categoria', e.target.value)}>
                      {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  {form.categoria === 'otros' && (
                    <label className="panel__field">
                      <span className="panel__lbl">Especifica</span>
                      <input className="panel__input" value={form.subcategoria}
                        onChange={e => set('subcategoria', e.target.value)} />
                    </label>
                  )}
                </section>
                <section className="panel__section">
                  <div className="panel__sh">Importe y desglose fiscal</div>
                  <CamposFiscales form={form} set={set} />
                  <label className="panel__field">
                    <span className="panel__lbl">Notas</span>
                    <textarea className="panel__input panel__textarea" rows={2}
                      value={form.notas} onChange={e => set('notas', e.target.value)} />
                  </label>
                </section>
                {error && <div className="panel__error" style={{ margin: '0 0 8px' }}>{error}</div>}
              </>
            ) : (
              /* ── Modo lectura ── */
              <section className="panel__section">
                <GastoCampo label="Fecha" value={fmtFecha(gasto.fecha)} />
                <GastoCampo label="Proveedor" value={gasto.proveedor} />
                <GastoCampo label="Concepto" value={gasto.concepto} />
                <GastoCampo label="CIF / NIF" value={gasto.cif} />
                <div className="gasto-campo">
                  <span className="gasto-campo__lbl">Categoría</span>
                  <span className="gastos-badge" style={{ background: cat.color + '1a', color: cat.color, borderColor: cat.color + '44', display: 'inline-block' }}>
                    {catDisplay(gasto)}
                  </span>
                </div>
                {gasto.base_imponible != null && (
                  <>
                    <div className="gasto-campo__sep">Desglose fiscal</div>
                    <GastoCampo label="Base imponible" value={eur(gasto.base_imponible)} />
                    {gasto.iva_pct     != null && <GastoCampo label={`IVA ${gasto.iva_pct} %`}         value={eur(gasto.iva_importe)} />}
                    {gasto.retencion_pct != null && <GastoCampo label={`Retención ${gasto.retencion_pct} %`} value={eur(gasto.retencion_importe)} />}
                  </>
                )}
                <div className="gasto-campo gasto-campo--total">
                  <span className="gasto-campo__lbl">Total</span>
                  <span className="gasto-campo__total">{eur(gasto.importe)}</span>
                </div>
                <GastoCampo label="Notas" value={gasto.notas} />
              </section>
            )}
          </div>

          <div className="panel__foot">
            {editando ? (
              <>
                <button className="btn btn--ghost" onClick={cancelarEdicion} disabled={saving}>Cancelar</button>
                <button className="btn btn--primary" onClick={guardar} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn--ghost btn--danger" onClick={eliminar}>
                  <Icon.absent /> Eliminar
                </button>
                <button className="btn btn--primary" onClick={() => setEditando(true)}>
                  <Icon.pencil /> Editar
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {lightbox && (
        <div className="gastos-lightbox" onClick={() => setLightbox(false)}>
          <img src={gasto.foto_url} alt="Factura" onClick={e => e.stopPropagation()} />
          <button className="gastos-lightbox__close" onClick={() => setLightbox(false)}>✕</button>
        </div>
      )}
    </>
  )
}

function GastoCampo({ label, value }) {
  if (!value) return null
  return (
    <div className="gasto-campo">
      <span className="gasto-campo__lbl">{label}</span>
      <span className="gasto-campo__val">{value}</span>
    </div>
  )
}

// ── Gastos ────────────────────────────────────────────────────────
export function Gastos() {
  const anioActual = new Date().getFullYear()
  const [gastos, setGastos]       = React.useState([])
  const [loading, setLoading]     = React.useState(true)
  const [error, setError]         = React.useState(null)
  const [showPanel, setShowPanel] = React.useState(false)
  const [gastoSel, setGastoSel]   = React.useState(null)
  const [filtroAnio, setFiltroAnio] = React.useState(anioActual)
  const [filtroMes, setFiltroMes]   = React.useState(null)

  const filtroAnioRef = React.useRef(filtroAnio)
  React.useEffect(() => { filtroAnioRef.current = filtroAnio }, [filtroAnio])

  const cargar = React.useCallback(async (anio) => {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('gastos').select('*')
      .gte('fecha', `${anio}-01-01`)
      .lte('fecha', `${anio}-12-31`)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    if (e) setError(e.message)
    else { setGastos(data ?? []); setError(null) }
    setLoading(false)
  }, [])

  React.useEffect(() => { cargar(filtroAnio) }, [cargar, filtroAnio])

  const gastosFiltrados = React.useMemo(() => {
    if (filtroMes === null) return gastos
    return gastos.filter(g => parseInt(g.fecha.split('-')[1], 10) === filtroMes)
  }, [gastos, filtroMes])

  const stats = React.useMemo(() => {
    const totales = {}
    for (const g of gastosFiltrados) {
      totales[g.categoria] = (totales[g.categoria] ?? 0) + Number(g.importe)
    }
    return CATEGORIAS.map(c => ({ ...c, total: totales[c.value] ?? 0 })).filter(c => c.total > 0)
  }, [gastosFiltrados])

  const totalGeneral = gastosFiltrados.reduce((s, g) => s + Number(g.importe), 0)

  return (
    <>
      {/* Filtros */}
      <div className="gastos-filtros">
        <div className="gastos-filtros__anios">
          {ANIOS.map(a => (
            <button key={a}
              className={`gastos-filtro-btn${filtroAnio === a ? ' gastos-filtro-btn--on' : ''}`}
              onClick={() => { setFiltroAnio(a); setFiltroMes(null) }}
            >{a}</button>
          ))}
        </div>
        <div className="gastos-filtros__meses">
          <button
            className={`gastos-filtro-btn gastos-filtro-btn--sm${filtroMes === null ? ' gastos-filtro-btn--on' : ''}`}
            onClick={() => setFiltroMes(null)}
          >Todos</button>
          {MESES_LABELS.map((label, i) => (
            <button key={i}
              className={`gastos-filtro-btn gastos-filtro-btn--sm${filtroMes === i + 1 ? ' gastos-filtro-btn--on' : ''}`}
              onClick={() => setFiltroMes(filtroMes === i + 1 ? null : i + 1)}
            >{label}</button>
          ))}
        </div>
      </div>

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
        <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando gastos…</div>
      ) : error ? (
        <div className="alumnos-estado alumnos-estado--error">Error: {error}</div>
      ) : gastosFiltrados.length === 0 ? (
        <div className="alumnos-estado">Sin gastos en este período.</div>
      ) : (
        <div className="gastos-table-wrap">
          <table className="gastos-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Categoría</th>
                <th className="gastos-table__num">Importe</th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(g => {
                const cat = catInfo(g.categoria)
                return (
                  <tr key={g.id} className="gastos-row gastos-row--clickable"
                    onClick={() => setGastoSel(g)}>
                    <td className="gastos-row__fecha">
                      {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="gastos-row__proveedor">
                      {g.proveedor || '—'}
                      {g.concepto && <span className="gastos-row__notas"> · {g.concepto}</span>}
                    </td>
                    <td>
                      <span className="gastos-badge" style={{ background: cat.color + '1a', color: cat.color, borderColor: cat.color + '44' }}>
                        {catDisplay(g)}
                      </span>
                    </td>
                    <td className="gastos-table__num gastos-row__importe">
                      {eur(g.importe)}
                      {g.base_imponible != null && (
                        <div className="gastos-row__desglose">
                          {eur(g.base_imponible)}
                          {g.iva_importe     != null && <> + {eur(g.iva_importe)} IVA</>}
                          {g.retencion_importe != null && <> − {eur(g.retencion_importe)} ret.</>}
                        </div>
                      )}
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
          onSaved={() => { setShowPanel(false); cargar(filtroAnioRef.current) }}
        />
      )}

      {gastoSel && (
        <DetalleGastoPanel
          gasto={gastoSel}
          onClose={() => setGastoSel(null)}
          onDeleted={(id) => {
            setGastos(prev => prev.filter(g => g.id !== id))
            setGastoSel(null)
          }}
          onUpdated={(updated) => {
            setGastos(prev => prev.map(g => g.id === updated.id ? updated : g))
            setGastoSel(updated)
          }}
        />
      )}
    </>
  )
}
