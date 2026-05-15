import { supabase } from './supabase.js'
import { InformeSheet, rango, mesLabel } from './sheets.jsx'

const NIVEL_LABEL = { primaria: 'Primaria', eso: 'ESO', bachillerato: 'Bachillerato' }
const HORAS = ['15:30', '16:30', '17:30', '18:30', '19:30']
const DIAS = [
  { id: 'lunes',     label: 'LU' },
  { id: 'martes',    label: 'MA' },
  { id: 'miércoles', label: 'MI' },
  { id: 'jueves',    label: 'JU' },
  { id: 'viernes',   label: 'VI' },
]
const CURSOS = [
  '1º PRIM','2º PRIM','3º PRIM','4º PRIM','5º PRIM','6º PRIM',
  '1º ESO','2º ESO','3º ESO','4º ESO',
  '1º BACH','2º BACH',
]
const METODOS_PAGO = [
  { value: 'bizum',         label: 'Bizum' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'sepa',          label: 'Recibo domiciliado' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function horaFin(h) {
  const [hh, mm] = h.split(':').map(Number)
  return `${String(hh + 1).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}


function slugify(nombre, curso) {
  return (nombre + '_' + curso).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
}

// ── NuevoAlumnoPanel ──────────────────────────────────────────────

const FORM_INICIAL = {
  nombre: '', curso: '', fecha_alta: today(),
  sin_familia: true,
  familia_id: '', familia_nueva: false,
  fam_nombre: '', fam_email: '', fam_telefono: '',
  fam_metodo_pago: 'bizum', fam_codigo_sepa: '', fam_notas: '',
  fam_dni: '', fam_direccion: '', fam_ciudad: 'Huesca', fam_cp: '22005',
  slots: [], // [{ dia, hora_inicio }]
  precio_bruto: '', descuento: 0,
}

function NuevoAlumnoPanel({ familias, onClose, onSaved }) {
  const [form, setForm] = React.useState(FORM_INICIAL)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleSlot = (dia, hora_inicio) => {
    const existe = form.slots.some(s => s.dia === dia && s.hora_inicio === hora_inicio)
    set('slots', existe
      ? form.slots.filter(s => !(s.dia === dia && s.hora_inicio === hora_inicio))
      : [...form.slots, { dia, hora_inicio }]
    )
  }
  const slotActivo = (dia, hora_inicio) =>
    form.slots.some(s => s.dia === dia && s.hora_inicio === hora_inicio)

  const precioNeto = form.precio_bruto !== ''
    ? Math.round(Number(form.precio_bruto) * (1 - Number(form.descuento) / 100) * 100) / 100
    : ''

  const valid = form.nombre.trim() && form.curso &&
    (form.sin_familia || (form.familia_nueva ? form.fam_nombre.trim() : form.familia_id))

  const handleSave = async () => {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      let familia_id = form.familia_id

      const sepa = (mp) => mp === 'sepa'

      if (form.sin_familia) {
        const { data, error: e } = await supabase
          .from('familias')
          .insert({
            nombre: form.nombre.trim(),
            email: form.fam_email.trim() || null,
            telefono: form.fam_telefono.trim() || null,
            metodo_pago: form.fam_metodo_pago,
            codigo_sepa: sepa(form.fam_metodo_pago) ? form.fam_codigo_sepa.trim() || null : null,
            notas: form.fam_notas.trim() || null,
            dni: form.fam_dni.trim() || null,
            direccion: form.fam_direccion.trim() || null,
            ciudad: form.fam_ciudad.trim() || null,
            codigo_postal: form.fam_cp.trim() || null,
          })
          .select('id')
          .single()
        if (e) throw e
        familia_id = data.id
      } else if (form.familia_nueva) {
        const { data, error: e } = await supabase
          .from('familias')
          .insert({
            nombre: form.fam_nombre.trim(),
            email: form.fam_email.trim() || null,
            telefono: form.fam_telefono.trim() || null,
            metodo_pago: form.fam_metodo_pago,
            codigo_sepa: sepa(form.fam_metodo_pago) ? form.fam_codigo_sepa.trim() || null : null,
            notas: form.fam_notas.trim() || null,
            dni: form.fam_dni.trim() || null,
            direccion: form.fam_direccion.trim() || null,
            ciudad: form.fam_ciudad.trim() || null,
            codigo_postal: form.fam_cp.trim() || null,
          })
          .select('id')
          .single()
        if (e) throw e
        familia_id = data.id
      }

      const { data: alumno, error: e2 } = await supabase
        .from('alumnos')
        .insert({
          nombre: form.nombre.trim(),
          curso: form.curso,
          slug: slugify(form.nombre.trim(), form.curso),
          familia_id,
          activo: true,
          fecha_alta: form.fecha_alta,
        })
        .select('id')
        .single()
      if (e2) throw e2

      if (form.slots.length > 0) {
        // Agrupar por hora y construir una fila por franja con booleanos por día
        const porHora = {}
        form.slots.forEach(({ dia, hora_inicio }) => {
          if (!porHora[hora_inicio]) porHora[hora_inicio] = new Set()
          porHora[hora_inicio].add(dia)
        })
        const filas = Object.entries(porHora).map(([hora, dias]) => ({
          alumno_id: alumno.id,
          hora_inicio: hora,
          hora_fin: horaFin(hora),
          fecha_inicio: today(),
          fecha_fin: null,
          lunes:     dias.has('lunes'),
          martes:    dias.has('martes'),
          miercoles: dias.has('miércoles'),
          jueves:    dias.has('jueves'),
          viernes:   dias.has('viernes'),
        }))
        const { error: e3 } = await supabase.from('horario').insert(filas)
        if (e3) throw e3
      }

      if (form.precio_bruto !== '') {
        const { error: e4 } = await supabase.from('tarifas').insert({
          familia_id,
          precio_bruto: Number(form.precio_bruto),
          descuento_pct: Number(form.descuento),
          fecha_inicio: today(),
        })
        if (e4) throw e4
      }

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
          <h2 className="panel__title">Nuevo alumno</h2>
          <button className="panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="panel__body">

          {/* ── Datos del alumno ── */}
          <section className="panel__section">
            <h3 className="panel__sh">Datos del alumno</h3>
            <label className="panel__field">
              <span className="panel__lbl">Nombre *</span>
              <input className="panel__input" value={form.nombre}
                onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Curso *</span>
              <select className="panel__input panel__select" value={form.curso}
                onChange={e => set('curso', e.target.value)}>
                <option value="">— Seleccionar —</option>
                {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="panel__field">
              <span className="panel__lbl">Fecha de alta</span>
              <input className="panel__input" type="date" value={form.fecha_alta}
                onChange={e => set('fecha_alta', e.target.value)} />
            </label>
          </section>

          {/* ── Familia ── */}
          <section className="panel__section">
            <div className="panel__sh-row">
              <h3 className="panel__sh">Familia</h3>
              <button
                type="button"
                className={`panel__toggle ${form.sin_familia ? 'panel__toggle--on' : ''}`}
                onClick={() => set('sin_familia', !form.sin_familia)}
              >
                Sin familia
              </button>
            </div>
            {/* Selector familia existente / nueva (solo cuando sin_familia OFF) */}
            {!form.sin_familia && (
              !form.familia_nueva ? (
                <>
                  <label className="panel__field">
                    <span className="panel__lbl">Familia existente</span>
                    <select className="panel__input panel__select"
                      value={form.familia_id}
                      onChange={e => set('familia_id', e.target.value)}
                    >
                      <option value="">— Seleccionar —</option>
                      {familias.map(f => (
                        <option key={f.id} value={f.id}>{f.nombre}</option>
                      ))}
                    </select>
                  </label>
                  <button className="panel__link" type="button"
                    onClick={() => set('familia_nueva', true)}>
                    + Crear familia nueva
                  </button>
                </>
              ) : (
                <>
                  <label className="panel__field">
                    <span className="panel__lbl">Nombre familia *</span>
                    <input className="panel__input" value={form.fam_nombre}
                      onChange={e => set('fam_nombre', e.target.value)}
                      placeholder="Apellidos o nombre" />
                  </label>
                  <button className="panel__link" type="button"
                    onClick={() => { set('familia_nueva', false); set('fam_nombre', '') }}>
                    ← Elegir familia existente
                  </button>
                </>
              )
            )}

            {/* Contacto y pago: siempre visible en sin_familia o al crear familia nueva */}
            {(form.sin_familia || form.familia_nueva) && (
              <>
                <label className="panel__field">
                  <span className="panel__lbl">Email</span>
                  <input className="panel__input" type="email" value={form.fam_email}
                    onChange={e => set('fam_email', e.target.value)}
                    placeholder="correo@ejemplo.com" />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Teléfono</span>
                  <input className="panel__input" type="tel" value={form.fam_telefono}
                    onChange={e => set('fam_telefono', e.target.value)}
                    placeholder="600 000 000" />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Método de pago</span>
                  <select className="panel__input panel__select"
                    value={form.fam_metodo_pago}
                    onChange={e => set('fam_metodo_pago', e.target.value)}
                  >
                    {METODOS_PAGO.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                {form.fam_metodo_pago === 'sepa' && (
                  <label className="panel__field">
                    <span className="panel__lbl">IBAN</span>
                    <input className="panel__input" value={form.fam_codigo_sepa}
                      onChange={e => set('fam_codigo_sepa', e.target.value)}
                      placeholder="ES00 0000 0000 0000 0000 0000" />
                  </label>
                )}
                <label className="panel__field">
                  <span className="panel__lbl">Notas</span>
                  <textarea className="panel__input panel__textarea" rows={2}
                    value={form.fam_notas}
                    onChange={e => set('fam_notas', e.target.value)}
                    placeholder="Opcional…" />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">DNI/NIF</span>
                  <input className="panel__input" value={form.fam_dni}
                    onChange={e => set('fam_dni', e.target.value)}
                    placeholder="12345678A" />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Dirección</span>
                  <input className="panel__input" value={form.fam_direccion}
                    onChange={e => set('fam_direccion', e.target.value)}
                    placeholder="C/ Nombre, número" />
                </label>
                <div className="panel__row">
                  <label className="panel__field">
                    <span className="panel__lbl">Ciudad</span>
                    <input className="panel__input" value={form.fam_ciudad}
                      onChange={e => set('fam_ciudad', e.target.value)} />
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">Código postal</span>
                    <input className="panel__input" value={form.fam_cp}
                      onChange={e => set('fam_cp', e.target.value)} />
                  </label>
                </div>
              </>
            )}
          </section>

          {/* ── Horario ── */}
          <section className="panel__section">
            <h3 className="panel__sh">Horario</h3>
            <div className="hor-grid-mini">
              <div className="hor-grid-mini__corner" />
              {DIAS.map(({ label }) => (
                <div key={label} className="hor-grid-mini__dia">{label}</div>
              ))}
              {HORAS.map(hora => (
                <React.Fragment key={hora}>
                  <div className="hor-grid-mini__hora">{hora}</div>
                  {DIAS.map(({ id: dia }) => {
                    const on = slotActivo(dia, hora)
                    return (
                      <label key={dia}
                        className={`hor-grid-mini__cell ${on ? 'hor-grid-mini__cell--on' : ''}`}>
                        <input type="checkbox" hidden checked={on}
                          onChange={() => toggleSlot(dia, hora)} />
                      </label>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
            {form.slots.length > 0 && (
              <div className="panel__lbl" style={{ marginTop: 6 }}>
                {form.slots.length} {form.slots.length === 1 ? 'sesión seleccionada' : 'sesiones seleccionadas'}
              </div>
            )}
          </section>

          {/* ── Tarifa ── */}
          <section className="panel__section">
            <h3 className="panel__sh">Tarifa mensual</h3>
            <div className="panel__row">
              <label className="panel__field">
                <span className="panel__lbl">Precio bruto (€)</span>
                <input className="panel__input" type="number" min="0" step="1"
                  value={form.precio_bruto}
                  onChange={e => set('precio_bruto', e.target.value)}
                  placeholder="0" />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Descuento (%)</span>
                <input className="panel__input" type="number" min="0" max="100" step="1"
                  value={form.descuento}
                  onChange={e => set('descuento', e.target.value)} />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Precio neto (€)</span>
                <input className="panel__input panel__input--calc"
                  value={precioNeto !== '' ? precioNeto : '—'} readOnly />
              </label>
            </div>
          </section>

        </div>

        {error && <div className="panel__error">{error}</div>}

        <div className="panel__foot">
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={handleSave}
            disabled={saving || !valid}>
            {saving ? 'Guardando…' : 'Guardar alumno'}
          </button>
        </div>
      </aside>
    </div>
  )
}

// ── InformePreviewOverlay ─────────────────────────────────────────

function InformePreviewOverlay({ alumno, informe: inf, onClose }) {
  const [datos, setDatos] = React.useState(null)

  React.useEffect(() => {
    const { primero, ultimo } = rango(inf.mes, inf.anio)
    Promise.all([
      supabase.from('sesiones').select('*').eq('alumno_id', alumno.id)
        .gte('fecha', primero).lte('fecha', ultimo).order('fecha'),
      supabase.from('festivos').select('*').gte('fecha', primero).lte('fecha', ultimo),
    ]).then(([{ data: sesiones }, { data: festivos }]) => {
      setDatos({ sesiones: sesiones ?? [], festivos: festivos ?? [], comentario: inf.comentario ?? '' })
    })
  }, [])

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">{mesLabel(inf.mes, inf.anio)} · {alumno.nombre}</span>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', maxHeight: '72vh', padding: '16px' }}>
          {!datos
            ? <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>
            : <InformeSheet alumno={alumno} mes={inf.mes} anio={inf.anio} informe={datos} />
          }
        </div>
      </div>
    </div>
  )
}

// ── DetalleAlumnoPanel ────────────────────────────────────────────

function DetalleAlumnoPanel({ alumnoId, onClose, onUpdated }) {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [editMode, setEditMode] = React.useState(false)
  const [form, setForm] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState(null)
  const [savedAt, setSavedAt] = React.useState(null)
  const [historialTab, setHistorialTab] = React.useState(null)
  const [historialData, setHistorialData] = React.useState([])
  const [historialLoading, setHistorialLoading] = React.useState(false)
  const [previewInforme, setPreviewInforme] = React.useState(null)

  const dataToForm = (d) => {
    if (!d) return {
      nombre: '', curso: '', fecha_alta: '',
      fam_email: '', fam_telefono: '', fam_metodo_pago: 'bizum',
      fam_codigo_sepa: '', fam_notas: '',
      fam_dni: '', fam_direccion: '', fam_ciudad: 'Huesca', fam_cp: '22005',
      slots: [], precio_bruto: '', descuento: 0,
    }
    const slots = []
    ;(d.horario ?? []).forEach(row => {
      const hora = row.hora_inicio?.substring(0, 5)
      if (!hora) return
      DIAS.forEach(({ id: dia }) => {
        const col = dia === 'miércoles' ? 'miercoles' : dia
        if (row[col]) slots.push({ dia, hora_inicio: hora })
      })
    })
    const tarifa = d.tarifas?.[0] ?? {}
    return {
      nombre: d.nombre ?? '',
      curso: d.curso ?? '',
      fecha_alta: d.fecha_alta ?? '',
      fam_email: d.familias?.email ?? '',
      fam_telefono: d.familias?.telefono ?? '',
      fam_metodo_pago: d.familias?.metodo_pago ?? 'bizum',
      fam_codigo_sepa: d.familias?.codigo_sepa ?? '',
      fam_notas: d.familias?.notas ?? '',
      fam_dni: d.familias?.dni ?? '',
      fam_direccion: d.familias?.direccion ?? '',
      fam_ciudad: d.familias?.ciudad ?? 'Huesca',
      fam_cp: d.familias?.codigo_postal ?? '22005',
      slots,
      precio_bruto: tarifa.precio_bruto ?? '',
      descuento: tarifa.descuento_pct ?? 0,
    }
  }

  const cargarDetalle = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: alumno, error: e1 } = await supabase
        .from('alumnos')
        .select('*, familias(*), horario(*)')
        .eq('id', alumnoId)
        .single()
      if (e1) throw e1

      let tarifa = null
      if (alumno.familia_id) {
        const { data: t } = await supabase
          .from('tarifas')
          .select('*')
          .eq('familia_id', alumno.familia_id)
          .order('fecha_inicio', { ascending: false })
          .limit(1)
          .single()
        tarifa = t ?? null
      }

      const d = { ...alumno, tarifas: tarifa ? [tarifa] : [] }
      setData(d)
      setForm(dataToForm(d))
    } catch (err) {
      setError(err.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { cargarDetalle() }, [alumnoId])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const toggleSlot = (dia, hora_inicio) => {
    const existe = form.slots.some(s => s.dia === dia && s.hora_inicio === hora_inicio)
    set('slots', existe
      ? form.slots.filter(s => !(s.dia === dia && s.hora_inicio === hora_inicio))
      : [...form.slots, { dia, hora_inicio }]
    )
  }
  const slotActivo = (dia, hora_inicio) =>
    form?.slots.some(s => s.dia === dia && s.hora_inicio === hora_inicio) ?? false

  const precioNeto = (form?.precio_bruto ?? '') !== ''
    ? Math.round(Number(form?.precio_bruto) * (1 - Number(form?.descuento ?? 0) / 100) * 100) / 100
    : ''

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const sepa = (mp) => mp === 'sepa'

      const { error: e1 } = await supabase
        .from('alumnos')
        .update({ nombre: form.nombre.trim(), curso: form.curso, fecha_alta: form.fecha_alta })
        .eq('id', data.id)
      if (e1) throw e1

      if (data.familia_id) {
        const { error: e2 } = await supabase
          .from('familias')
          .update({
            email: form.fam_email.trim() || null,
            telefono: form.fam_telefono.trim() || null,
            metodo_pago: form.fam_metodo_pago,
            codigo_sepa: sepa(form.fam_metodo_pago) ? form.fam_codigo_sepa.trim() || null : null,
            notas: form.fam_notas.trim() || null,
            dni: form.fam_dni.trim() || null,
            direccion: form.fam_direccion.trim() || null,
            ciudad: form.fam_ciudad.trim() || null,
            codigo_postal: form.fam_cp.trim() || null,
          })
          .eq('id', data.familia_id)
        if (e2) throw e2
      }

      const { error: e3 } = await supabase.from('horario').delete().eq('alumno_id', data.id)
      if (e3) throw e3
      if (form.slots.length > 0) {
        const porHora = {}
        form.slots.forEach(({ dia, hora_inicio }) => {
          if (!porHora[hora_inicio]) porHora[hora_inicio] = new Set()
          porHora[hora_inicio].add(dia)
        })
        const fechaInicio = data.horario?.[0]?.fecha_inicio ?? today()
        const filas = Object.entries(porHora).map(([hora, dias]) => ({
          alumno_id: data.id,
          hora_inicio: hora,
          hora_fin: horaFin(hora),
          fecha_inicio: fechaInicio,
          fecha_fin: null,
          lunes:     dias.has('lunes'),
          martes:    dias.has('martes'),
          miercoles: dias.has('miércoles'),
          jueves:    dias.has('jueves'),
          viernes:   dias.has('viernes'),
        }))
        const { error: e4 } = await supabase.from('horario').insert(filas)
        if (e4) throw e4
      }

      const tarifa = data.tarifas?.[0]
      if ((form?.precio_bruto ?? '') !== '') {
        if (tarifa) {
          const { error: e5 } = await supabase
            .from('tarifas')
            .update({ precio_bruto: Number(form?.precio_bruto), descuento_pct: Number(form?.descuento ?? 0) })
            .eq('id', tarifa.id)
          if (e5) throw e5
        } else {
          const { error: e5 } = await supabase.from('tarifas').insert({
            familia_id: data.familia_id,
            precio_bruto: Number(form?.precio_bruto),
            descuento_pct: Number(form?.descuento ?? 0),
            fecha_inicio: today(),
          })
          if (e5) throw e5
        }
      }

      const now = new Date()
      setSavedAt(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
      setEditMode(false)
      cargarDetalle()
      onUpdated?.()
    } catch (err) {
      setSaveError(err.message ?? String(err))
    } finally {
      setSaving(false)
    }
  }

  const cargarHistorial = async (tab) => {
    if (historialTab === tab) { setHistorialTab(null); return }
    setHistorialTab(tab)
    setHistorialData([])
    setHistorialLoading(true)
    try {
      if (tab === 'informes') {
        const { data } = await supabase
          .from('informes').select('*').eq('alumno_id', alumnoId)
          .order('anio', { ascending: false }).order('mes', { ascending: false })
        setHistorialData(data ?? [])
      } else {
        const { data } = await supabase
          .from('facturas').select('*').eq('alumno_id', alumnoId)
          .order('anio', { ascending: false }).order('mes', { ascending: false })
        setHistorialData(data ?? [])
      }
    } catch {}
    setHistorialLoading(false)
  }

  const metodoLabel = (val) =>
    METODOS_PAGO.find(m => m.value === val)?.label ?? val

  return (
    <>
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="panel">
        <div className="panel__head">
          <h2 className="panel__title">{loading ? 'Cargando…' : (data?.nombre ?? 'Detalle')}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!loading && !error && !editMode && (
              <button className="btn btn--ghost btn--sm" onClick={() => setEditMode(true)}>
                Editar
              </button>
            )}
            <button className="panel__close" onClick={onClose}>✕</button>
          </div>
        </div>

        {loading ? (
          <div className="panel__body">
            <div className="alumnos-estado"><div className="alumnos-estado__spinner" /> Cargando…</div>
          </div>
        ) : error ? (
          <div className="panel__body">
            <div className="alumnos-estado alumnos-estado--error">Error: {error}</div>
          </div>
        ) : editMode ? (
          <div className="panel__body">
            <section className="panel__section">
              <h3 className="panel__sh">Datos del alumno</h3>
              <label className="panel__field">
                <span className="panel__lbl">Nombre *</span>
                <input className="panel__input" value={form?.nombre ?? ''}
                  onChange={e => set('nombre', e.target.value)} />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Curso *</span>
                <select className="panel__input panel__select" value={form?.curso ?? ''}
                  onChange={e => set('curso', e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Fecha de alta</span>
                <input className="panel__input" type="date" value={form?.fecha_alta ?? ''}
                  onChange={e => set('fecha_alta', e.target.value)} />
              </label>
            </section>

            <section className="panel__section">
              <h3 className="panel__sh">Familia</h3>
              <label className="panel__field">
                <span className="panel__lbl">Email</span>
                <input className="panel__input" type="email" value={form?.fam_email ?? ''}
                  onChange={e => set('fam_email', e.target.value)} />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Teléfono</span>
                <input className="panel__input" type="tel" value={form?.fam_telefono ?? ''}
                  onChange={e => set('fam_telefono', e.target.value)} />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Método de pago</span>
                <select className="panel__input panel__select" value={form?.fam_metodo_pago ?? 'bizum'}
                  onChange={e => set('fam_metodo_pago', e.target.value)}>
                  {METODOS_PAGO.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              {form?.fam_metodo_pago === 'sepa' && (
                <label className="panel__field">
                  <span className="panel__lbl">IBAN</span>
                  <input className="panel__input" value={form?.fam_codigo_sepa ?? ''}
                    onChange={e => set('fam_codigo_sepa', e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000" />
                </label>
              )}
              <label className="panel__field">
                <span className="panel__lbl">Notas</span>
                <textarea className="panel__input panel__textarea" rows={2}
                  value={form?.fam_notas ?? ''} onChange={e => set('fam_notas', e.target.value)} />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">DNI/NIF</span>
                <input className="panel__input" value={form?.fam_dni ?? ''}
                  onChange={e => set('fam_dni', e.target.value)}
                  placeholder="12345678A" />
              </label>
              <label className="panel__field">
                <span className="panel__lbl">Dirección</span>
                <input className="panel__input" value={form?.fam_direccion ?? ''}
                  onChange={e => set('fam_direccion', e.target.value)}
                  placeholder="C/ Nombre, número" />
              </label>
              <div className="panel__row">
                <label className="panel__field">
                  <span className="panel__lbl">Ciudad</span>
                  <input className="panel__input" value={form?.fam_ciudad ?? 'Huesca'}
                    onChange={e => set('fam_ciudad', e.target.value)} />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Código postal</span>
                  <input className="panel__input" value={form?.fam_cp ?? '22005'}
                    onChange={e => set('fam_cp', e.target.value)} />
                </label>
              </div>
            </section>

            <section className="panel__section">
              <h3 className="panel__sh">Horario</h3>
              <div className="hor-grid-mini">
                <div className="hor-grid-mini__corner" />
                {DIAS.map(({ label }) => (
                  <div key={label} className="hor-grid-mini__dia">{label}</div>
                ))}
                {HORAS.map(hora => (
                  <React.Fragment key={hora}>
                    <div className="hor-grid-mini__hora">{hora}</div>
                    {DIAS.map(({ id: dia }) => {
                      const on = slotActivo(dia, hora)
                      return (
                        <label key={dia}
                          className={`hor-grid-mini__cell ${on ? 'hor-grid-mini__cell--on' : ''}`}>
                          <input type="checkbox" hidden checked={on}
                            onChange={() => toggleSlot(dia, hora)} />
                        </label>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            </section>

            <section className="panel__section">
              <h3 className="panel__sh">Tarifa mensual</h3>
              <div className="panel__row">
                <label className="panel__field">
                  <span className="panel__lbl">Precio bruto (€)</span>
                  <input className="panel__input" type="number" min="0" step="1"
                    value={form?.precio_bruto ?? ''} onChange={e => set('precio_bruto', e.target.value)} />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Descuento (%)</span>
                  <input className="panel__input" type="number" min="0" max="100" step="1"
                    value={form?.descuento ?? 0} onChange={e => set('descuento', e.target.value)} />
                </label>
                <label className="panel__field">
                  <span className="panel__lbl">Precio neto (€)</span>
                  <input className="panel__input panel__input--calc"
                    value={precioNeto !== '' ? precioNeto : '—'} readOnly />
                </label>
              </div>
            </section>
          </div>
        ) : (
          <div className="panel__body">
            <section className="panel__section">
              <h3 className="panel__sh">Datos del alumno</h3>
              <div className="panel__field">
                <span className="panel__lbl">Nombre</span>
                <span className="panel__val">{data?.nombre ?? '—'}</span>
              </div>
              <div className="panel__field">
                <span className="panel__lbl">Curso</span>
                <span className="panel__val">{data?.curso ?? '—'}</span>
              </div>
              <div className="panel__field">
                <span className="panel__lbl">Fecha de alta</span>
                <span className="panel__val">{data.fecha_alta ?? '—'}</span>
              </div>
            </section>

            <section className="panel__section">
              <h3 className="panel__sh">Familia — {data.familias?.nombre ?? '—'}</h3>
              {data.familias?.email && (
                <div className="panel__field">
                  <span className="panel__lbl">Email</span>
                  <span className="panel__val">{data.familias.email}</span>
                </div>
              )}
              {data.familias?.telefono && (
                <div className="panel__field">
                  <span className="panel__lbl">Teléfono</span>
                  <span className="panel__val">{data.familias.telefono}</span>
                </div>
              )}
              {data.familias?.metodo_pago && (
                <div className="panel__field">
                  <span className="panel__lbl">Método de pago</span>
                  <span className="panel__val">{metodoLabel(data.familias.metodo_pago)}</span>
                </div>
              )}
              {data.familias?.codigo_sepa && (
                <div className="panel__field">
                  <span className="panel__lbl">IBAN</span>
                  <span className="panel__val">{data.familias.codigo_sepa}</span>
                </div>
              )}
              {data.familias?.notas && (
                <div className="panel__field">
                  <span className="panel__lbl">Notas</span>
                  <span className="panel__val">{data.familias.notas}</span>
                </div>
              )}
              {data.familias?.dni && (
                <div className="panel__field">
                  <span className="panel__lbl">DNI/NIF</span>
                  <span className="panel__val">{data.familias.dni}</span>
                </div>
              )}
              {data.familias?.direccion && (
                <div className="panel__field">
                  <span className="panel__lbl">Dirección</span>
                  <span className="panel__val">
                    {[data.familias.direccion, data.familias.ciudad, data.familias.codigo_postal].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </section>

            <section className="panel__section">
              <h3 className="panel__sh">Horario</h3>
              <div className="hor-grid-mini">
                <div className="hor-grid-mini__corner" />
                {DIAS.map(({ label }) => (
                  <div key={label} className="hor-grid-mini__dia">{label}</div>
                ))}
                {HORAS.map(hora => (
                  <React.Fragment key={hora}>
                    <div className="hor-grid-mini__hora">{hora}</div>
                    {DIAS.map(({ id: dia }) => (
                      <div key={dia}
                        className={`hor-grid-mini__cell ${slotActivo(dia, hora) ? 'hor-grid-mini__cell--on' : ''}`}
                        style={{ cursor: 'default', pointerEvents: 'none' }} />
                    ))}
                  </React.Fragment>
                ))}
              </div>
              {(form?.slots?.length ?? 0) === 0 && (
                <p className="panel__lbl" style={{ marginTop: 6 }}>Sin horario asignado</p>
              )}
            </section>

            {(data.tarifas?.length ?? 0) > 0 && (
              <section className="panel__section">
                <h3 className="panel__sh">Tarifa mensual</h3>
                <div className="panel__field">
                  <span className="panel__lbl">Precio bruto</span>
                  <span className="panel__val">{data.tarifas?.[0]?.precio_bruto ?? 0} €</span>
                </div>
                {(data.tarifas?.[0]?.descuento_pct ?? 0) > 0 && (
                  <div className="panel__field">
                    <span className="panel__lbl">Descuento</span>
                    <span className="panel__val">{data.tarifas?.[0]?.descuento_pct ?? 0}%</span>
                  </div>
                )}
                <div className="panel__field">
                  <span className="panel__lbl">Precio neto</span>
                  <span className="panel__val panel__val--strong">{data.tarifas?.[0]?.precio_neto ?? 0} €</span>
                </div>
              </section>
            )}

            <section className="panel__section">
              <div className="panel__sh-row">
                <h3 className="panel__sh">Historial</h3>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`btn btn--sm ${historialTab === 'informes' ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => cargarHistorial('informes')}
                  >
                    Informes
                  </button>
                  <button
                    className={`btn btn--sm ${historialTab === 'facturas' ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => cargarHistorial('facturas')}
                  >
                    Facturas
                  </button>
                </div>
              </div>

              {historialLoading && (
                <div className="alumnos-estado" style={{ padding: '8px 0' }}>
                  <div className="alumnos-estado__spinner" /> Cargando…
                </div>
              )}

              {!historialLoading && historialTab === 'informes' && (
                historialData.length === 0
                  ? <p className="panel__lbl" style={{ marginTop: 8 }}>Sin informes enviados.</p>
                  : <ul className="hist-list">
                      {historialData.map(inf => (
                        <li key={inf.id} className="hist-item">
                          <span className="hist-item__fecha">{mesLabel(inf.mes, inf.anio)}</span>
                          {inf.enviado_at && (
                            <span className="hist-item__dim">
                              {new Date(inf.enviado_at).toLocaleDateString('es-ES')}
                            </span>
                          )}
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => setPreviewInforme(inf)}
                          >
                            Previsualizar
                          </button>
                        </li>
                      ))}
                    </ul>
              )}

              {!historialLoading && historialTab === 'facturas' && (
                historialData.length === 0
                  ? <p className="panel__lbl" style={{ marginTop: 8 }}>Sin facturas.</p>
                  : <ul className="hist-list">
                      {historialData.map(fac => (
                        <li key={fac.id} className="hist-item">
                          <span className="hist-item__fecha">{mesLabel(fac.mes, fac.anio)}</span>
                          <span className="hist-item__num">{fac.numero_factura}</span>
                          <span className="hist-item__importe">{fac.importe} €</span>
                        </li>
                      ))}
                    </ul>
              )}
            </section>
          </div>
        )}

        {saveError && <div className="panel__error">{saveError}</div>}

        {editMode && (
          <div className="panel__foot">
            <button className="btn btn--ghost" onClick={() => { setEditMode(false); setForm(dataToForm(data)) }}
              disabled={saving}>
              Cancelar
            </button>
            {savedAt && <span className="panel__saved">Guardado a las {savedAt}</span>}
            <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
        {!editMode && savedAt && (
          <div className="panel__foot" style={{ justifyContent: 'center' }}>
            <span className="panel__saved">Cambios guardados a las {savedAt}</span>
          </div>
        )}
      </aside>
    </div>
    {previewInforme && data && (
      <InformePreviewOverlay
        alumno={data}
        informe={previewInforme}
        onClose={() => setPreviewInforme(null)}
      />
    )}
    </>
  )
}

// ── ConfirmEliminar ───────────────────────────────────────────────

function ConfirmEliminar({ alumno, onConfirm, onCancel }) {
  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-box">
        <div className="confirm-box__title">¿Eliminar a {alumno.nombre}?</div>
        <p className="confirm-box__body">
          Esto borrará al alumno y todos sus datos permanentemente. No se puede deshacer.
        </p>
        <div className="confirm-box__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirm}>Eliminar definitivamente</button>
        </div>
      </div>
    </div>
  )
}

// ── ConfirmArchive ────────────────────────────────────────────────

function ConfirmArchive({ alumno, onConfirm, onCancel }) {
  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="confirm-box">
        <div className="confirm-box__title">¿Archivar a {alumno.nombre}?</div>
        <p className="confirm-box__body">
          Seguirá guardado pero no aparecerá en el listado activo.
        </p>
        <div className="confirm-box__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--danger" onClick={onConfirm}>Archivar</button>
        </div>
      </div>
    </div>
  )
}

// ── Alumnos ───────────────────────────────────────────────────────

export function Alumnos() {
  const [alumnos, setAlumnos] = React.useState([])
  const [familias, setFamilias] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [filtro, setFiltro] = React.useState('activos')
  const [showPanel, setShowPanel] = React.useState(false)
  const [archivando, setArchivando] = React.useState(null)
  const [eliminando, setEliminando] = React.useState(null)
  const [detalleId, setDetalleId] = React.useState(null)

  const cargar = React.useCallback(() => {
    setLoading(true)
    const activo = filtro === 'activos'
    Promise.all([
      supabase
        .from('alumnos')
        .select('id, nombre, curso, nivel, activo, fecha_alta, familia_id, familias(nombre, email)')
        .eq('activo', activo)
        .order('nombre'),
      supabase
        .from('familias')
        .select('id, nombre')
        .order('nombre'),
    ]).then(([ar, fr]) => {
      if (ar.error) setError(ar.error.message)
      else { setAlumnos(ar.data ?? []); setError(null) }
      if (!fr.error) setFamilias(fr.data ?? [])
      setLoading(false)
    })
  }, [filtro])

  React.useEffect(() => { cargar() }, [cargar])

  const archivar = async (alumno) => {
    const { error: e } = await supabase
      .from('alumnos')
      .update({ activo: false, fecha_baja: today() })
      .eq('id', alumno.id)
    setArchivando(null)
    if (e) alert(e.message)
    else cargar()
  }

  const eliminar = async (alumno) => {
    setEliminando(null)
    try {
      // 1. Borrar horario del alumno
      const { error: e1 } = await supabase.from('horario').delete().eq('alumno_id', alumno.id)
      if (e1) throw e1

      // 2. Borrar tarifas de la familia
      if (alumno.familia_id) {
        const { error: e2 } = await supabase.from('tarifas').delete().eq('familia_id', alumno.familia_id)
        if (e2) throw e2
      }

      // 3. Borrar el alumno
      const { error: e3 } = await supabase.from('alumnos').delete().eq('id', alumno.id)
      if (e3) throw e3

      // 4. Borrar la familia solo si no tiene otros alumnos
      if (alumno.familia_id) {
        const { count } = await supabase
          .from('alumnos')
          .select('id', { count: 'exact', head: true })
          .eq('familia_id', alumno.familia_id)
        if (count === 0) {
          await supabase.from('familias').delete().eq('id', alumno.familia_id)
        }
      }

      cargar()
    } catch (err) {
      alert('Error al eliminar: ' + (err.message ?? err))
    }
  }

  const reactivar = async (alumno) => {
    const { error: e } = await supabase
      .from('alumnos')
      .update({ activo: true, fecha_baja: null })
      .eq('id', alumno.id)
    if (e) alert(e.message)
    else cargar()
  }

  return (
    <>
      <div className="alumnos-bar">
        <div className="alumnos-toggle">
          {['activos', 'archivados'].map(f => (
            <button key={f}
              className={`alumnos-toggle__btn ${filtro === f ? 'alumnos-toggle__btn--on' : ''}`}
              onClick={() => setFiltro(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => setShowPanel(true)}>
          + Nuevo alumno
        </button>
      </div>

      {loading ? (
        <div className="alumnos-estado">
          <div className="alumnos-estado__spinner" /> Cargando alumnos…
        </div>
      ) : error ? (
        <div className="alumnos-estado alumnos-estado--error">Error: {error}</div>
      ) : alumnos.length === 0 ? (
        <div className="alumnos-estado">
          No hay alumnos {filtro === 'archivados' ? 'archivados' : 'activos'}.
        </div>
      ) : (
        <div className="alumnos-list">
          {alumnos.map(a => (
            <div key={a.id} className={`alumno-card alumno-card--${a.nivel}`}
              onClick={() => setDetalleId(a.id)} style={{ cursor: 'pointer' }}>
              <div className="alumno-card__main">
                <span className="alumno-card__nombre">{a.nombre}</span>
                <span className="alumno-card__curso">{a.curso}</span>
                <span className={`alumno-card__nivel alumno-card__nivel--${a.nivel}`}>
                  {NIVEL_LABEL[a.nivel] ?? a.nivel}
                </span>
              </div>
              <div className="alumno-card__right">
                <div className="alumno-card__familia">
                  <span className="alumno-card__familia-nombre">{a.familias?.nombre}</span>
                  {a.familias?.email && (
                    <a className="alumno-card__email" href={`mailto:${a.familias.email}`}
                      onClick={e => e.stopPropagation()}>
                      {a.familias.email}
                    </a>
                  )}
                </div>
                {filtro === 'activos' ? (
                  <button className="alumno-card__archive-btn"
                    title="Archivar alumno"
                    onClick={e => { e.stopPropagation(); setArchivando(a) }}>
                    <Icon.archive />
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button className="btn btn--ghost btn--sm" onClick={() => reactivar(a)}>
                      Reactivar
                    </button>
                    <button className="btn btn--danger btn--sm" onClick={() => setEliminando(a)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {detalleId && (
        <DetalleAlumnoPanel
          alumnoId={detalleId}
          onClose={() => setDetalleId(null)}
          onUpdated={cargar}
        />
      )}

      {showPanel && (
        <NuevoAlumnoPanel
          familias={familias}
          onClose={() => setShowPanel(false)}
          onSaved={() => { setShowPanel(false); cargar() }}
        />
      )}

      {archivando && (
        <ConfirmArchive
          alumno={archivando}
          onConfirm={() => archivar(archivando)}
          onCancel={() => setArchivando(null)}
        />
      )}

      {eliminando && (
        <ConfirmEliminar
          alumno={eliminando}
          onConfirm={() => eliminar(eliminando)}
          onCancel={() => setEliminando(null)}
        />
      )}
    </>
  )
}
