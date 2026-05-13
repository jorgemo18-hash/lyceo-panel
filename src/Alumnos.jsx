import { supabase } from './supabase.js'

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
const METODOS_PAGO = ['bizum', 'efectivo', 'transferencia', 'recibo']

function today() {
  return new Date().toISOString().slice(0, 10)
}

function horaFin(h) {
  const [hh, mm] = h.split(':').map(Number)
  return `${String(hh + 1).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function nivelFromCurso(curso) {
  const c = curso.toUpperCase()
  if (c.includes('BACH')) return 'bachillerato'
  if (c.includes('ESO') || c.includes('SEC')) return 'eso'
  return 'primaria'
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
  fam_metodo_pago: 'bizum', fam_notas: '',
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
      let familia_id = form.sin_familia ? null : form.familia_id

      if (!form.sin_familia && form.familia_nueva) {
        const { data, error: e } = await supabase
          .from('familias')
          .insert({
            nombre: form.fam_nombre.trim(),
            email: form.fam_email.trim() || null,
            telefono: form.fam_telefono.trim() || null,
            metodo_pago: form.fam_metodo_pago,
            notas: form.fam_notas.trim() || null,
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
          nivel: nivelFromCurso(form.curso),
          slug: slugify(form.nombre.trim(), form.curso),
          familia_id,
          activo: true,
          fecha_alta: form.fecha_alta,
        })
        .select('id')
        .single()
      if (e2) throw e2

      if (form.slots.length > 0) {
        const { error: e3 } = await supabase.from('horario').insert(
          form.slots.map(s => ({
            alumno_id: alumno.id,
            dia: s.dia,
            hora_inicio: s.hora_inicio,
            hora_fin: horaFin(s.hora_inicio),
            fecha_inicio: today(),
          }))
        )
        if (e3) throw e3
      }

      if (form.precio_bruto !== '') {
        const { error: e4 } = await supabase.from('tarifas').insert({
          familia_id,
          precio_bruto: Number(form.precio_bruto),
          descuento: Number(form.descuento),
          precio_neto: precioNeto,
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
                      {METODOS_PAGO.map(m => (
                        <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="panel__field">
                    <span className="panel__lbl">Notas</span>
                    <textarea className="panel__input panel__textarea" rows={2}
                      value={form.fam_notas}
                      onChange={e => set('fam_notas', e.target.value)}
                      placeholder="Opcional…" />
                  </label>
                  <button className="panel__link" type="button"
                    onClick={() => { set('familia_nueva', false); set('fam_nombre', '') }}>
                    ← Elegir familia existente
                  </button>
                </>
              )
            )}
          </section>

          {/* ── Horario ── */}
          <section className="panel__section">
            <h3 className="panel__sh">Horario</h3>
            <div className="hor-grid-mini">
              {/* cabecera horas */}
              <div className="hor-grid-mini__corner" />
              {HORAS.map(h => (
                <div key={h} className="hor-grid-mini__hora">{h}</div>
              ))}
              {/* filas por día */}
              {DIAS.map(({ id: dia, label }) => (
                <React.Fragment key={dia}>
                  <div className="hor-grid-mini__dia">{label}</div>
                  {HORAS.map(hora => {
                    const on = slotActivo(dia, hora)
                    return (
                      <label key={hora}
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

  const cargar = React.useCallback(() => {
    setLoading(true)
    const activo = filtro === 'activos'
    Promise.all([
      supabase
        .from('alumnos')
        .select('id, nombre, curso, nivel, activo, fecha_alta, familias(nombre, email)')
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
            <div key={a.id} className={`alumno-card alumno-card--${a.nivel}`}>
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
                    <a className="alumno-card__email" href={`mailto:${a.familias.email}`}>
                      {a.familias.email}
                    </a>
                  )}
                </div>
                {filtro === 'activos' ? (
                  <button className="alumno-card__archive-btn"
                    title="Archivar alumno"
                    onClick={() => setArchivando(a)}>
                    <Icon.archive />
                  </button>
                ) : (
                  <button className="btn btn--ghost btn--sm" onClick={() => reactivar(a)}>
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
    </>
  )
}
