// SessionCard — tarjeta colapsable de un alumno con su sesión del día
// Acordeón: tap para expandir, dentro tiene SubjectPicker + TopicInput + nota privada
// Estados: pending | in-progress | done | absent

function SessionCard({ sesion, registro, onChange, onToggle, expandido, primaryColor }) {
  const { alumno, hora, duracion, historial, racha } = sesion;
  const completo = registro.asignatura && registro.tema && registro.tema.trim().length > 0;
  const ausente = registro.estado === "absent";
  const guardado = registro.lastSavedAt;

  const estado = ausente ? "absent" : completo ? "done" : (registro.asignatura || registro.tema) ? "progress" : "pending";

  return (
    <article
      className={`scard scard--${estado} ${expandido ? "scard--open" : ""}`}
      data-screen-label={`Sesión ${hora} — ${alumno.nombre}`}
    >
      {/* HEADER — siempre visible */}
      <button className="scard__head" onClick={onToggle} aria-expanded={expandido}>
        <div className="scard__time">
          <span className="scard__hora">{hora}</span>
          <span className="scard__dur">{duracion}′</span>
        </div>

        <div className="scard__avatar" aria-hidden="true">
          {alumno.iniciales}
        </div>

        <div className="scard__who">
          <div className="scard__name">{alumno.nombre}</div>
          <div className="scard__meta">
            {alumno.curso}
            {racha >= 5 && (
              <span className="scard__racha" title={`${racha} sesiones consecutivas`}>
                <Icon.flame /> {racha}
              </span>
            )}
          </div>
        </div>

        <div className="scard__status">
          {estado === "done" && (
            <span className="scard__pill scard__pill--done">
              <Icon.check /> Hecho
            </span>
          )}
          {estado === "absent" && (
            <span className="scard__pill scard__pill--absent">
              <Icon.absent /> Ausente
            </span>
          )}
          {estado === "progress" && (
            <span className="scard__pill scard__pill--progress">En curso</span>
          )}
          {estado === "pending" && (
            <span className="scard__pill scard__pill--pending">Pendiente</span>
          )}
          <span className="scard__chevron"><Icon.chevron /></span>
        </div>
      </button>

      {/* BODY — acordeón */}
      {expandido && !ausente && (
        <div className="scard__body">
          {alumno.nota_previa && (
            <div className="scard__alert">
              <Icon.note /> {alumno.nota_previa}
            </div>
          )}

          <SubjectPicker
            nivel={alumno.nivel}
            value={registro.asignatura}
            onChange={(v) => onChange({ asignatura: v })}
          />

          <TopicInput
            value={registro.tema || ""}
            historial={historial}
            onChange={(v) => onChange({ tema: v })}
          />

          <NotaPrivada
            value={registro.nota || ""}
            onChange={(v) => onChange({ nota: v })}
          />

          <div className="scard__footer">
            <button className="scard__absent-btn" onClick={() => onChange({ estado: "absent" })}>
              <Icon.absent /> Marcar ausente
            </button>
            <SaveStatus savedAt={guardado} dirty={registro._dirty} />
          </div>
        </div>
      )}

      {expandido && ausente && (
        <div className="scard__body scard__body--absent">
          <p className="scard__absent-msg">
            {alumno.nombre.split(" ")[0]} no ha venido hoy. Se notificará a la familia automáticamente.
          </p>
          <button className="scard__undo" onClick={() => onChange({ estado: null })}>
            Deshacer ausencia
          </button>
        </div>
      )}
    </article>
  );
}

// SubjectPicker — chips con asignaturas según el nivel del alumno
function SubjectPicker({ nivel, value, onChange }) {
  const lista = ASIGNATURAS_POR_NIVEL[nivel] || ASIGNATURAS_POR_NIVEL.eso;
  const [otraMode, setOtraMode] = React.useState(() => value !== "" && !lista.includes(value));
  const otraRef = React.useRef(null);

  React.useEffect(() => {
    if (otraMode) otraRef.current?.focus();
  }, [otraMode]);

  const elegirOtra = () => {
    if (!otraMode) { setOtraMode(true); onChange(""); }
  };

  return (
    <div className="field">
      <label className="field__label">Asignatura</label>
      <div className="chips">
        {lista.map((a) => (
          <button
            key={a}
            className={`chip ${!otraMode && value === a ? "chip--on" : ""}`}
            onClick={() => { setOtraMode(false); onChange(a); }}
          >
            {a}
          </button>
        ))}
        <button className={`chip ${otraMode ? "chip--on" : ""}`} onClick={elegirOtra}>
          Otra
        </button>
      </div>
      {otraMode && (
        <input
          ref={otraRef}
          className="topic__input"
          type="text"
          value={value}
          placeholder="Nombre de la asignatura…"
          onChange={(e) => onChange(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
    </div>
  );
}

// TopicInput — input con sugerencias de historial + temas frecuentes
function TopicInput({ value, historial, onChange }) {
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef(null);

  const sugerencias = React.useMemo(() => {
    const v = value.toLowerCase().trim();
    const pool = [...historial, ...TEMAS_FRECUENTES];
    const seen = new Set();
    const dedup = pool.filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!v) return dedup.slice(0, 5);
    return dedup.filter((t) => t.toLowerCase().includes(v) && t.toLowerCase() !== v).slice(0, 5);
  }, [value, historial]);

  return (
    <div className="field">
      <label className="field__label">Tema trabajado</label>
      <div className="topic">
        <input
          ref={inputRef}
          className="topic__input"
          type="text"
          value={value}
          placeholder="Ej. Fracciones equivalentes, repaso examen…"
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && sugerencias.length > 0 && (
          <ul className="topic__suggest">
            <li className="topic__suggest-h">
              {value ? "Coincidencias" : "Anteriores con este alumno"}
            </li>
            {sugerencias.map((s) => (
              <li key={s}>
                <button
                  className="topic__suggest-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(s);
                  }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotaPrivada({ value, onChange }) {
  const [open, setOpen] = React.useState(!!value);
  if (!open) {
    return (
      <button className="nota-toggle" onClick={() => setOpen(true)}>
        <Icon.note /> Añadir nota privada
      </button>
    );
  }
  return (
    <div className="field">
      <label className="field__label">
        Nota privada <span className="field__hint">— solo visible para ti</span>
      </label>
      <textarea
        className="nota__area"
        rows="2"
        value={value}
        placeholder="Observaciones del día, dudas, comportamiento…"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SaveStatus({ savedAt, dirty }) {
  if (dirty) {
    return (
      <span className="save save--saving">
        <span className="save__dot save__dot--pulse" /> Guardando…
      </span>
    );
  }
  if (savedAt) {
    return (
      <span className="save save--saved">
        <Icon.check /> Guardado {savedAt}
      </span>
    );
  }
  return <span className="save save--idle">Sin guardar</span>;
}

Object.assign(window, { SessionCard });
