import { supabase } from './supabase.js'

const NIVEL_LABEL = {
  primaria: 'Primaria',
  eso: 'ESO',
  bachillerato: 'Bachillerato',
}

export function Alumnos() {
  const [alumnos, setAlumnos] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    supabase
      .from('alumnos')
      .select(`
        id,
        nombre,
        curso,
        nivel,
        familias (
          nombre,
          email
        )
      `)
      .order('nombre')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setAlumnos(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" />
        Cargando alumnos…
      </div>
    )
  }

  if (error) {
    return (
      <div className="alumnos-estado alumnos-estado--error">
        Error al cargar los datos: {error}
      </div>
    )
  }

  if (alumnos.length === 0) {
    return (
      <div className="alumnos-estado">
        No hay alumnos registrados todavía.
      </div>
    )
  }

  return (
    <div className="alumnos-list">
      {alumnos.map((a) => (
        <div key={a.id} className={`alumno-card alumno-card--${a.nivel}`}>
          <div className="alumno-card__main">
            <span className="alumno-card__nombre">{a.nombre}</span>
            <span className="alumno-card__curso">{a.curso}</span>
            <span className={`alumno-card__nivel alumno-card__nivel--${a.nivel}`}>
              {NIVEL_LABEL[a.nivel] ?? a.nivel}
            </span>
          </div>
          <div className="alumno-card__familia">
            <span className="alumno-card__familia-nombre">{a.familias?.nombre}</span>
            {a.familias?.email && (
              <a className="alumno-card__email" href={`mailto:${a.familias.email}`}>
                {a.familias.email}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
