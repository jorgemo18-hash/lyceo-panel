// Horario.jsx — vista semanal editable
// Clic en el nombre de un chip para editarlo, en el punto para cambiar nivel, ✕ para eliminar.
// Clic en + de cualquier franja para añadir un alumno nuevo.

const NIVEL_COLORS = {
  primaria: { bg: "var(--niv-pri-bg)", fg: "var(--niv-pri-fg)" },
  eso: { bg: "var(--niv-eso-bg)", fg: "var(--niv-eso-fg)" },
  bachillerato: { bg: "var(--niv-bach-bg)", fg: "var(--niv-bach-fg)" },
};
const NIVEL_LABEL = { primaria: "Prim.", eso: "ESO", bachillerato: "Bach." };
const NIVELES = ["primaria", "eso", "bachillerato"];

// Chip editable: nombre inline, punto para ciclar nivel, ✕ para eliminar
function HorarioChip({ alumno, onUpdate, onRemove }) {
  const [editNombre, setEditNombre] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (editNombre) { inputRef.current?.focus(); inputRef.current?.select(); }
  }, [editNombre]);

  const cycleNivel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const i = NIVELES.indexOf(alumno.nivel);
    onUpdate({ nivel: NIVELES[(i + 1) % NIVELES.length] });
  };

  return (
    <div
      className={`hor-chip hor-chip--${alumno.nivel}`}
      style={{ cursor: "default" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${alumno.nombre} · ${NIVEL_LABEL[alumno.nivel]}`}
    >
      <span
        className="hor-chip__dot"
        onMouseDown={cycleNivel}
        style={{ cursor: "pointer", flexShrink: 0 }}
        title="Cambiar nivel"
      />
      {editNombre ? (
        <input
          ref={inputRef}
          value={alumno.nombre}
          onChange={(e) => onUpdate({ nombre: e.target.value })}
          onBlur={() => setEditNombre(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              setEditNombre(false);
            }
          }}
          style={{
            background: "transparent", border: 0, outline: "none",
            font: "inherit", color: "inherit", padding: 0,
            width: "80px", minWidth: 32,
          }}
        />
      ) : (
        <span
          className="hor-chip__name"
          onClick={() => setEditNombre(true)}
          style={{ cursor: "text", flex: 1 }}
          title="Editar nombre"
        >
          {alumno.nombre}
        </span>
      )}
      {(hovered || editNombre) && (
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "0 0 0 2px", color: "currentColor", opacity: 0.55,
            font: "inherit", fontSize: "10px", lineHeight: 1, flexShrink: 0,
          }}
          title="Eliminar de esta franja"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Formulario inline para añadir un alumno a una franja
function AddChipForm({ onAdd, onCancel }) {
  const [nombre, setNombre] = React.useState("");
  const [nivel, setNivel] = React.useState("primaria");
  const inputRef = React.useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const commit = () => {
    const n = nombre.trim();
    if (n) onAdd(n, nivel); else onCancel();
  };

  const cycleNivel = () => {
    const i = NIVELES.indexOf(nivel);
    setNivel(NIVELES[(i + 1) % NIVELES.length]);
  };

  return (
    <div className={`hor-chip hor-chip--${nivel}`}>
      <span
        className="hor-chip__dot"
        onMouseDown={(e) => { e.preventDefault(); cycleNivel(); }}
        style={{ cursor: "pointer", flexShrink: 0 }}
        title="Cambiar nivel"
      />
      <input
        ref={inputRef}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        placeholder="Nombre…"
        style={{
          background: "transparent", border: 0, outline: "none",
          font: "inherit", color: "inherit", padding: 0,
          width: "80px", minWidth: 32,
        }}
      />
    </div>
  );
}

function Horario() {
  const [filtroNivel, setFiltroNivel] = React.useState("todos");
  const [addingTo, setAddingTo] = React.useState(null); // { hora, dia }

  // Copia local editable de HORARIO_SEMANAL
  const [horario, setHorario] = React.useState(() => {
    const h = {};
    FRANJAS.forEach((hora) => {
      h[hora] = {};
      DIAS.forEach((dia) => {
        h[hora][dia] = [...(HORARIO_SEMANAL[hora]?.[dia] || [])];
      });
    });
    return h;
  });

  const updateAlumno = (hora, dia, idx, patch) => {
    setHorario((prev) => {
      const slot = [...prev[hora][dia]];
      slot[idx] = { ...slot[idx], ...patch };
      return { ...prev, [hora]: { ...prev[hora], [dia]: slot } };
    });
  };

  const removeAlumno = (hora, dia, idx) => {
    setHorario((prev) => {
      const slot = prev[hora][dia].filter((_, i) => i !== idx);
      return { ...prev, [hora]: { ...prev[hora], [dia]: slot } };
    });
  };

  const addAlumno = (hora, dia, nombre, nivel) => {
    setHorario((prev) => {
      const slot = [...prev[hora][dia], { nombre, nivel }];
      return { ...prev, [hora]: { ...prev[hora], [dia]: slot } };
    });
    setAddingTo(null);
  };

  const stats = React.useMemo(() => {
    const alumnosUnicos = new Set();
    let franjasOcupadas = 0;
    FRANJAS.forEach((h) => {
      DIAS.forEach((d) => {
        const arr = horario[h]?.[d] || [];
        const visibles = arr.filter((a) => !a.continuation);
        visibles.forEach((a) => alumnosUnicos.add(a.nombre));
        if (visibles.length > 0) franjasOcupadas++;
      });
    });
    return { alumnos: alumnosUnicos.size, franjas: franjasOcupadas };
  }, [horario]);

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

        {FRANJAS.map((hora) => {
          const esHora = hora.endsWith(":00");
          return (
            <div key={hora} className={`hor-grid__row ${esHora ? "hor-grid__row--major" : ""}`}>
              <div className="hor-cell hor-cell--time">
                <span className={esHora ? "hor-time__major" : "hor-time__minor"}>
                  {hora}
                </span>
              </div>
              {DIAS.map((d) => {
                const arr = horario[hora]?.[d] || [];
                // Indexar antes de filtrar para conservar posición real en el array
                const indexedVisible = arr
                  .map((a, idx) => ({ ...a, _idx: idx }))
                  .filter(visible);
                const nuevos = indexedVisible.filter((a) => !a.continuation);
                const continua = indexedVisible.filter((a) => a.continuation);
                const isAdding = addingTo?.hora === hora && addingTo?.dia === d;

                return (
                  <div key={d} className="hor-cell hor-cell--slot">
                    {continua.map((a, i) => (
                      <div
                        key={`cont-${i}`}
                        className={`hor-cont hor-cont--${a.nivel}`}
                        title={`${a.nombre} (continúa)`}
                      />
                    ))}
                    {nuevos.map((a) => (
                      <HorarioChip
                        key={a._idx}
                        alumno={a}
                        onUpdate={(patch) => updateAlumno(hora, d, a._idx, patch)}
                        onRemove={() => removeAlumno(hora, d, a._idx)}
                      />
                    ))}
                    {isAdding ? (
                      <AddChipForm
                        onAdd={(nombre, nivel) => addAlumno(hora, d, nombre, nivel)}
                        onCancel={() => setAddingTo(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setAddingTo({ hora, dia: d })}
                        title="Añadir alumno a esta franja"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--ink-4)", fontSize: "13px", padding: "1px 3px",
                          borderRadius: "4px", lineHeight: 1, fontFamily: "inherit",
                          opacity: 0.6,
                        }}
                      >
                        +
                      </button>
                    )}
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
          Clic en el nombre para editar · punto para cambiar nivel · ✕ para eliminar · + para añadir
        </span>
      </div>
    </>
  );
}

window.Horario = Horario;
