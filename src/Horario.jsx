// Horario.jsx — vista semanal de quién viene a cada franja
// Diseño: tabla de franjas × días, pero presentada con tarjetas-chip por alumno
// y guías visuales (no tipo Excel). Cada chip lleva color por nivel.

const NIVEL_COLORS = {
  primaria: { bg: "var(--niv-pri-bg)", fg: "var(--niv-pri-fg)" },
  eso: { bg: "var(--niv-eso-bg)", fg: "var(--niv-eso-fg)" },
  bachillerato: { bg: "var(--niv-bach-bg)", fg: "var(--niv-bach-fg)" },
};
const NIVEL_LABEL = { primaria: "Prim.", eso: "ESO", bachillerato: "Bach." };

function Horario() {
  const [filtroNivel, setFiltroNivel] = React.useState("todos");

  // Stats — total alumnos únicos, total franjas ocupadas
  const stats = React.useMemo(() => {
    const alumnosUnicos = new Set();
    let franjasOcupadas = 0;
    FRANJAS.forEach((h) => {
      DIAS.forEach((d) => {
        const arr = HORARIO_SEMANAL[h]?.[d] || [];
        const visibles = arr.filter((a) => !a.continuation);
        visibles.forEach((a) => alumnosUnicos.add(a.nombre));
        if (visibles.length > 0) franjasOcupadas++;
      });
    });
    return { alumnos: alumnosUnicos.size, franjas: franjasOcupadas };
  }, []);

  const visible = (al) => filtroNivel === "todos" || al.nivel === filtroNivel;

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
          <div className="stat">
            <div className="stat__num">5h–8h</div>
            <div className="stat__lbl">tarde lectiva</div>
          </div>
        </div>
        <div className="hor-filter">
          <span className="hor-filter__lbl">Filtrar nivel</span>
          <div className="hor-filter__chips">
            {[
              { id: "todos", label: "Todos" },
              { id: "primaria", label: "Primaria" },
              { id: "eso", label: "ESO" },
              { id: "bachillerato", label: "Bachillerato" },
            ].map((n) => (
              <button
                key={n.id}
                className={`hf-chip hf-chip--${n.id} ${filtroNivel === n.id ? "hf-chip--on" : ""}`}
                onClick={() => setFiltroNivel(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="hor-grid">
        <div className="hor-grid__head">
          <div className="hor-cell hor-cell--corner">Hora</div>
          {DIAS.map((d) => (
            <div key={d} className="hor-cell hor-cell--day">
              <span className="hor-day__name">{d}</span>
              <span className="hor-day__short">{d.slice(0, 3).toUpperCase()}</span>
            </div>
          ))}
        </div>

        {FRANJAS.map((hora, i) => {
          const esHora = hora.endsWith(":00");
          return (
            <div key={hora} className={`hor-grid__row ${esHora ? "hor-grid__row--major" : ""}`}>
              <div className="hor-cell hor-cell--time">
                <span className={esHora ? "hor-time__major" : "hor-time__minor"}>
                  {hora}
                </span>
              </div>
              {DIAS.map((d) => {
                const arr = (HORARIO_SEMANAL[hora]?.[d] || []).filter(visible);
                const nuevos = arr.filter((a) => !a.continuation);
                const continua = arr.filter((a) => a.continuation);
                return (
                  <div key={d} className="hor-cell hor-cell--slot">
                    {/* Líneas de continuación */}
                    {continua.map((a, idx) => (
                      <div
                        key={`cont-${idx}-${a.nombre}`}
                        className={`hor-cont hor-cont--${a.nivel}`}
                        title={`${a.nombre} (continúa)`}
                      />
                    ))}
                    {nuevos.map((a) => (
                      <div
                        key={a.nombre}
                        className={`hor-chip hor-chip--${a.nivel}`}
                        title={`${a.nombre} · ${NIVEL_LABEL[a.nivel]}`}
                      >
                        <span className="hor-chip__dot" />
                        <span className="hor-chip__name">{a.nombre}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
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
        <span className="hor-legend__hint">
          Las barras tenues bajo un alumno indican que su clase continúa en la siguiente franja.
        </span>
      </div>
    </>
  );
}

window.Horario = Horario;
