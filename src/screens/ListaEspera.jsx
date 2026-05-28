import React from 'react'
import { supabase } from '../lib/supabase.js'

const FORM_VACIO = { nombre: '', curso: '', telefono: '', notas: '' }

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function FormNueva({ onAñadido }) {
  const [form, setForm] = React.useState(FORM_VACIO)
  const [guardando, setGuardando] = React.useState(false)
  const [error, setError] = React.useState(null)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const puedeGuardar = form.nombre.trim() && form.curso.trim() && form.telefono.trim()

  const guardar = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    const { data, error } = await supabase
      .from('lista_espera')
      .insert({
        nombre:   form.nombre.trim(),
        curso:    form.curso.trim(),
        telefono: form.telefono.trim(),
        notas:    form.notas.trim() || null,
      })
      .select()
      .single()
    setGuardando(false)
    if (error) { setError('Error al guardar'); return }
    onAñadido(data)
    setForm(FORM_VACIO)
  }

  return (
    <form className="lespera__form" onSubmit={guardar}>
      <div className="lespera__form-grid">
        <div className="field">
          <label className="field__label">Nombre</label>
          <input
            className="topic__input"
            type="text"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Nombre completo"
            required
          />
        </div>
        <div className="field">
          <label className="field__label">Curso</label>
          <input
            className="topic__input"
            type="text"
            value={form.curso}
            onChange={e => set('curso', e.target.value)}
            placeholder="Ej: 3.º ESO"
            required
          />
        </div>
        <div className="field">
          <label className="field__label">Teléfono</label>
          <input
            className="topic__input"
            type="tel"
            value={form.telefono}
            onChange={e => set('telefono', e.target.value)}
            placeholder="600 000 000"
            required
          />
        </div>
        <div className="field">
          <label className="field__label">
            Notas <span className="field__hint">— opcional</span>
          </label>
          <input
            className="topic__input"
            type="text"
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Disponibilidad, asignatura, etc."
          />
        </div>
      </div>
      <div className="lespera__form-footer">
        {error && <span className="lespera__form-error">{error}</span>}
        <button
          className="btn btn--primary btn--sm"
          type="submit"
          disabled={!puedeGuardar || guardando}
        >
          <Icon.plus /> {guardando ? 'Añadiendo…' : 'Añadir a la lista'}
        </button>
      </div>
    </form>
  )
}

function EntradaCard({ entrada, posicion, onEliminar }) {
  const [eliminando, setEliminando] = React.useState(false)

  const handleEliminar = async () => {
    if (!window.confirm(`¿Eliminar a ${entrada.nombre} de la lista de espera?`)) return
    setEliminando(true)
    const { error } = await supabase.from('lista_espera').delete().eq('id', entrada.id)
    if (error) { setEliminando(false); return }
    onEliminar(entrada.id)
  }

  return (
    <li className="lespera__card">
      <span className="lespera__num">{posicion}</span>
      <div className="lespera__info">
        <div className="lespera__nombre">{entrada.nombre}</div>
        <div className="lespera__meta">
          <span>{entrada.curso}</span>
          <span className="lespera__sep">·</span>
          <span>{entrada.telefono}</span>
          {entrada.notas && (
            <>
              <span className="lespera__sep">·</span>
              <span className="lespera__notas">{entrada.notas}</span>
            </>
          )}
        </div>
      </div>
      <div className="lespera__right">
        <span className="lespera__fecha">{fmtFecha(entrada.created_at)}</span>
        <button
          className="lespera__del"
          onClick={handleEliminar}
          disabled={eliminando}
          title="Eliminar"
        >
          ✕
        </button>
      </div>
    </li>
  )
}

export function ListaEspera() {
  const [entradas, setEntradas] = React.useState([])
  const [cargando, setCargando] = React.useState(true)

  React.useEffect(() => {
    supabase
      .from('lista_espera')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { setEntradas(data ?? []); setCargando(false) })
  }, [])

  const handleAñadido = (nueva) => setEntradas(prev => [...prev, nueva])
  const handleEliminar = (id) => setEntradas(prev => prev.filter(e => e.id !== id))

  return (
    <div className="lespera">
      <FormNueva onAñadido={handleAñadido} />

      {cargando ? (
        <div className="alumnos-estado">
          <div className="alumnos-estado__spinner" /> Cargando…
        </div>
      ) : entradas.length === 0 ? (
        <div className="placeholder">
          <div className="placeholder__title">Lista vacía</div>
          <p>Aún no hay nadie en lista de espera.</p>
        </div>
      ) : (
        <>
          <div className="lespera__count">{entradas.length} {entradas.length === 1 ? 'persona' : 'personas'} en lista</div>
          <ul className="lespera__list">
            {entradas.map((e, i) => (
              <EntradaCard
                key={e.id}
                entrada={e}
                posicion={i + 1}
                onEliminar={handleEliminar}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
