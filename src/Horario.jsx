import { supabase } from './supabase.js'

const FRANJAS = [
  { hora_inicio: '15:30', label: '15:30–16:30' },
  { hora_inicio: '16:30', label: '16:30–17:30' },
  { hora_inicio: '17:30', label: '17:30–18:30' },
  { hora_inicio: '18:30', label: '18:30–19:30' },
  { hora_inicio: '19:30', label: '19:30–20:30' },
]

const DIAS = [
  { id: 'lunes',     label: 'Lunes' },
  { id: 'martes',    label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves',    label: 'Jueves' },
  { id: 'viernes',   label: 'Viernes' },
]

function abreviar(nombre) {
  return nombre.trim().split(' ')[0]
}

function HorarioChip({ alumno }) {
  return (
    <div
      className={`hor-chip hor-chip--${alumno.nivel}`}
      title={`${alumno.nombre} · ${alumno.curso}`}
    >
      <span className="hor-chip__dot" />
      <span className="hor-chip__name">{abreviar(alumno.nombre)}</span>
    </div>
  )
}

function Horario() {
  const [rows, setRows] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [filtroNivel, setFiltroNivel] = React.useState('todos')

  React.useEffect(() => {
    supabase
      .from('horario')
      .select('*, alumnos(nombre, curso, nivel)')
      .order('hora_inicio')
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        else setRows(data ?? [])
        setLoading(false)
      })
  }, [])

  const getAlumnos = (hora_inicio, dia_id) =>
    rows
      .filter(r => r.hora_inicio === hora_inicio && r[dia_id] === true && r.alumnos)
      .map(r => r.alumnos)
      .filter(a => filtroNivel === 'todos' || a.nivel === filtroNivel)

  const stats = React.useMemo(() => {
    const ids = new Set()
    rows.forEach(r => DIAS.forEach(d => { if (r[d.id]) ids.add(r.alumno_id) }))
    let franjas = 0
    FRANJAS.forEach(f => DIAS.forEach(d => {
      if (rows.some(r => r.hora_inicio === f.hora_inicio && r[d.id])) franjas++
    }))
    return { alumnos: ids.size, franjas }
  }, [rows])

  if (loading) {
    return (
      <div className="alumnos-estado">
        <div className="alumnos-estado__spinner" /> Cargando horario…
      </div>
    )
  }

  if (error) {
    return <div className="alumnos-estado alumnos-estado--error">Error: {error}</div>
  }

  return (
    <>
      <div className="hor-header">
        <div className="hor-stats">
          <div className="stat">
            <div className="stat__num">{stats.alumnos}</div>
            <div className="stat__lbl">alumnos en cuadro</div>
          </div>
          <div className="stat">
            <div className="stat__num">{stats.franjas}</div>
            <div className="stat__lbl">franjas ocupadas</div>
          </div>
        </div>
        <div className="hor-filter">
          <span className="hor-filter__lbl">Filtrar nivel</span>
          <div className="hor-filter__chips">
            {[
              { id: 'todos',        label: 'Todos' },
              { id: 'primaria',     label: 'Primaria' },
              { id: 'eso',          label: 'ESO' },
              { id: 'bachillerato', label: 'Bachillerato' },
            ].map(n => (
              <button
                key={n.id}
                className={`hf-chip hf-chip--${n.id} ${filtroNivel === n.id ? 'hf-chip--on' : ''}`}
                onClick={() => setFiltroNivel(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hor-grid" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 250px)', minHeight: 300 }}>
        <div className="hor-grid__head" style={{ flexShrink: 0 }}>
          <div className="hor-cell hor-cell--corner">Hora</div>
          {DIAS.map(d => (
            <div key={d.id} className="hor-cell hor-cell--day">
              <span className="hor-day__name">{d.label}</span>
              <span className="hor-day__short">{d.label.slice(0, 3).toUpperCase()}</span>
            </div>
          ))}
        </div>

        {FRANJAS.map(franja => (
          <div key={franja.hora_inicio} className="hor-grid__row" style={{ flex: 1, minHeight: 0 }}>
            <div className="hor-cell hor-cell--time">
              <span className="hor-time__major" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                {franja.label}
              </span>
            </div>
            {DIAS.map(dia => {
              const alumnos = getAlumnos(franja.hora_inicio, dia.id)
              const llena = alumnos.length >= 6
              return (
                <div
                  key={dia.id}
                  className={`hor-cell hor-cell--slot${llena ? ' hor-cell--full' : ''}`}
                >
                  {alumnos.map((a, i) => (
                    <HorarioChip key={i} alumno={a} />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="hor-legend">
        <span className="hor-legend__item">
          <span className="hor-legend__dot hor-chip--primaria" /> Primaria
        </span>
        <span className="hor-legend__item">
          <span className="hor-legend__dot hor-chip--eso" /> ESO
        </span>
        <span className="hor-legend__item">
          <span className="hor-legend__dot hor-chip--bachillerato" /> Bachillerato
        </span>
        <span className="hor-legend__sep">·</span>
        <span className="hor-legend__hint">Las celdas en rojo tienen 6 o más alumnos</span>
      </div>
    </>
  )
}

window.Horario = Horario
