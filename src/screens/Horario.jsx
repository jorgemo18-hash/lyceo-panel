import { supabase } from '../lib/supabase.js'

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



function Horario() {
  const [rows, setRows] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [filtroNivel, setFiltroNivel] = React.useState('todos')

React.useEffect(() => {
    supabase
      .from('horario')
      .select('*, alumnos!inner(nombre, curso, nivel, activo)')
      .eq('alumnos.activo', true)
      .order('hora_inicio')
      .then(({ data, error: e }) => {
        if (e) setError(e.message)
        else setRows((data ?? []).filter(r => r.hora_inicio))
        setLoading(false)
      })
  }, [])

  const getAlumnos = (hora_inicio, dia_id) =>
    rows
      .filter(r => r.hora_inicio?.substring(0, 5) === hora_inicio && r[dia_id] === true && r.alumnos)
      .map(r => r.alumnos)
      .filter(a => filtroNivel === 'todos' || a.nivel === filtroNivel)

  const stats = React.useMemo(() => {
    const ids = new Set()
    rows.forEach(r => DIAS.forEach(d => { if (r[d.id]) ids.add(r.alumno_id) }))
    let franjas = 0
    FRANJAS.forEach(f => DIAS.forEach(d => {
      if (getAlumnos(f.hora_inicio, d.id).length >= 6) franjas++
    }))
    return { alumnos: ids.size, franjas }
  }, [rows, filtroNivel])

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
            <div className="stat__num">{stats.franjas}/23</div>
            <div className="stat__lbl">franjas llenas</div>
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

      <div className="hc-cards">
        {DIAS.map((d) => {
          const bloques = FRANJAS.map((f) => ({
            h: f.hora_inicio,
            label: f.label,
            arr: getAlumnos(f.hora_inicio, d.id),
          })).filter((b) => b.arr.length > 0)

          const total = bloques.reduce((s, b) => s + b.arr.length, 0)

          return (
            <div key={d.id} className="hc-card">
              <div className="hc-card__head">
                <span className="hc-card__day">{d.label}</span>
                <span className="hc-card__count">
                  {total} {total === 1 ? 'alumno' : 'alumnos'}
                </span>
              </div>
              <div className="hc-card__body">
                {bloques.length === 0 ? (
                  <span className="hc-empty">Sin clases</span>
                ) : (
                  bloques.map(({ h, arr }) => {
                    const heat = Math.min(arr.length, 6)
                    return (
                      <div key={h} className={`hc-block hc-block--h${heat}`}>
                        <div className="hc-block__head">
                          <span className="hc-time">{h}</span>
                          <span className="hc-tally">{arr.length}</span>
                        </div>
                        <div className="hc-names">
                          {arr.map((a, i) => (
                            <div
                              key={i}
                              className="hc-name"
                              title={`${a.nombre} · ${a.curso}`}
                            >
                              <span className={`hc-dot hc-dot--${a.nivel}`} />
                              <span className="hc-nm">{a.nombre.trim().split(' ')[0]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

<div className="hor-legend">
        <span className="hor-legend__item">
          <span className="hc-dot hc-dot--primaria" /> Primaria
        </span>
        <span className="hor-legend__item">
          <span className="hc-dot hc-dot--eso" /> ESO
        </span>
        <span className="hor-legend__item">
          <span className="hc-dot hc-dot--bachillerato" /> Bachillerato
        </span>
      </div>
    </>
  )
}

window.Horario = Horario
