// SessionCard — tarjeta colapsable de un alumno con su sesión del día
// Acordeón: tap para expandir, dentro tiene SubjectPicker + TopicInput + nota privada
// Estados: pending | in-progress | done | absent

function SessionCard({ sesion, registro, onChange, onToggle, expandido, primaryColor, recuperacion = null, onGuardarRecuperacion = null, fechaOriginal = '', onAvisarFamilia = null, notasExamen = [], onGuardarNota = null, onEliminarNota = null }) {
  const { alumno, hora, duracion, historial, racha } = sesion;
  const completo = registro.asignatura && registro.tema && registro.tema.trim().length > 0;
  const ausente = registro.estado === "absent";
  const guardado = registro.lastSavedAt;

  const [enviandoAviso, setEnviandoAviso] = React.useState(false);
  const [errorAviso, setErrorAviso] = React.useState(null);

  const handleAvisar = async () => {
    setEnviandoAviso(true);
    setErrorAviso(null);
    const result = await onAvisarFamilia();
    setEnviandoAviso(false);
    if (!result?.ok) setErrorAviso(result?.msg ?? 'Error al enviar');
  };

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
          {sesion.esRecuperacion && (
            <span className="scard__pill scard__pill--recup">
              <Icon.refresh /> Recuperación
            </span>
          )}
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
          {estado === "pending" && !sesion.esRecuperacion && (
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

          {(registro.asignaturasExtra ?? []).map((bloque, i) => (
            <div key={i} className="scard__asig-extra">
              <button
                className="scard__asig-remove"
                onClick={() => {
                  const next = [...(registro.asignaturasExtra ?? [])]
                  next.splice(i, 1)
                  onChange({ asignaturasExtra: next })
                }}
              >✕</button>
              <SubjectPicker
                nivel={alumno.nivel}
                value={bloque.asignatura}
                onChange={(v) => {
                  const next = [...(registro.asignaturasExtra ?? [])]
                  next[i] = { ...next[i], asignatura: v }
                  onChange({ asignaturasExtra: next })
                }}
              />
              <TopicInput
                value={bloque.tema || ""}
                historial={historial}
                onChange={(v) => {
                  const next = [...(registro.asignaturasExtra ?? [])]
                  next[i] = { ...next[i], tema: v }
                  onChange({ asignaturasExtra: next })
                }}
              />
            </div>
          ))}

          <button
            className="scard__add-asig"
            onClick={() => onChange({ asignaturasExtra: [...(registro.asignaturasExtra ?? []), { asignatura: '', tema: '' }] })}
          >
            <Icon.plus /> Añadir otra asignatura
          </button>

          <ComentarioInput
            value={registro.comentario || ""}
            onChange={(v) => onChange({ comentario: v })}
          />

          <NotaPrivada
            value={registro.nota || ""}
            onChange={(v) => onChange({ nota: v })}
          />

          {onGuardarNota && (
            <NotaExamenInline
              alumnoId={sesion.alumno.id}
              fecha={fechaOriginal}
              nivel={sesion.alumno.nivel}
              notas={notasExamen}
              onGuardar={onGuardarNota}
              onEliminar={onEliminarNota ? (id) => onEliminarNota(id, sesion.alumno.id) : null}
            />
          )}

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
          <div className="field">
            <label className="field__label">
              Motivo de ausencia <span className="field__hint">— se incluye en el email a la familia</span>
            </label>
            <textarea
              className="nota__area scard__absent-motivo"
              rows="2"
              value={registro.motivoAusencia || ""}
              placeholder="Ej: enfermedad, viaje, cambio de día…"
              onChange={(e) => onChange({ motivoAusencia: e.target.value })}
            />
          </div>
          <button className="scard__undo" onClick={() => onChange({ estado: null })}>
            Deshacer ausencia
          </button>
          {onGuardarRecuperacion && (
            <RecuperacionPanel
              alumnoId={alumno.id}
              fechaOriginal={fechaOriginal}
              recuperacion={recuperacion}
              onGuardar={onGuardarRecuperacion}
            />
          )}
          {onAvisarFamilia && !registro.avisoEnviado && (
            <button
              className="scard__aviso-btn"
              onClick={handleAvisar}
              disabled={enviandoAviso}
            >
              {enviandoAviso
                ? <><span className="btn-spinner" /> Enviando…</>
                : <><Icon.mail /> Avisar a la familia</>}
            </button>
          )}
          {registro.avisoEnviado && (
            <div className="scard__aviso-sent">
              <Icon.check /> Aviso enviado a la familia
            </div>
          )}
          {errorAviso && (
            <div className="scard__aviso-error">{errorAviso}</div>
          )}
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

function ComentarioInput({ value, onChange }) {
  return (
    <div className="field">
      <label className="field__label">
        Comentario <span className="field__hint">— opcional, se guarda con la sesión</span>
      </label>
      <textarea
        className="nota__area"
        rows="2"
        value={value}
        placeholder="Observaciones del día, actitud, próxima sesión…"
        onChange={(e) => onChange(e.target.value)}
      />
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

// ── RecuperacionPanel ─────────────────────────────────────────────
const HORAS_RECUP = ['15:30', '16:30', '17:30', '18:30', '19:30', '20:30']

function RecuperacionPanel({ alumnoId, fechaOriginal, recuperacion, onGuardar }) {
  const [editando, setEditando] = React.useState(false)
  const [fecha, setFecha] = React.useState('')
  const [hora, setHora] = React.useState('16:30')
  const [generaCobro, setGeneraCobro] = React.useState(false)
  const [guardando, setGuardando] = React.useState(false)

  const abrirForm = () => {
    setFecha(recuperacion ? recuperacion.fecha_recuperacion : '')
    setHora(recuperacion ? recuperacion.hora_inicio : '16:30')
    setGeneraCobro(recuperacion ? recuperacion.genera_cobro : false)
    setEditando(true)
  }

  const guardar = async () => {
    if (!fecha) return
    setGuardando(true)
    await onGuardar({
      id: recuperacion?.id ?? null,
      alumno_id: alumnoId,
      fecha_original: fechaOriginal,
      fecha_recuperacion: fecha,
      hora_inicio: hora,
      genera_cobro: generaCobro,
    })
    setGuardando(false)
    setEditando(false)
  }

  const fmtFecha = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (editando) {
    return (
      <div className="scard__recup-form">
        <div className="scard__recup-form__title">
          {recuperacion ? 'Editar recuperación' : 'Programar recuperación'}
        </div>
        <div className="scard__recup-fields">
          <div className="scard__recup-field">
            <label className="field__label">Fecha</label>
            <input
              type="date"
              className="topic__input"
              value={fecha}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setFecha(e.target.value)}
              autoFocus
            />
          </div>
          <div className="scard__recup-field">
            <label className="field__label">Hora</label>
            <select className="topic__input" value={hora} onChange={e => setHora(e.target.value)}>
              {HORAS_RECUP.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
        <label className="scard__recup-cobro">
          <input type="checkbox" checked={generaCobro} onChange={e => setGeneraCobro(e.target.checked)} />
          <span>Genera cobro adicional</span>
        </label>
        <div className="scard__recup-actions">
          <button className="btn btn--ghost btn--sm" onClick={() => setEditando(false)} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn btn--primary btn--sm" onClick={guardar} disabled={!fecha || guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  if (recuperacion) {
    return (
      <div className="scard__recup-info">
        <Icon.refresh />
        <span>Recuperación: {fmtFecha(recuperacion.fecha_recuperacion)} · {recuperacion.hora_inicio}</span>
        {recuperacion.genera_cobro && <span className="scard__recup-cobro-badge">+cobro</span>}
        <button className="scard__recup-edit-btn" onClick={abrirForm}>Editar</button>
      </div>
    )
  }

  return (
    <button className="scard__recup-btn" onClick={abrirForm}>
      <Icon.refresh /> Programar recuperación
    </button>
  )
}

// ── NotaExamenInline ──────────────────────────────────────────────
function NotaExamenInline({ alumnoId, fecha, nivel, notas = [], onGuardar, onEliminar }) {
  const [addingNew, setAddingNew] = React.useState(false)
  const [asig, setAsig]           = React.useState('')
  const [valor, setValor]         = React.useState('')
  const [guardando, setGuardando] = React.useState(false)
  const [eliminando, setEliminando] = React.useState(null)
  const lista = (window.ASIGNATURAS_POR_NIVEL?.[nivel] ?? window.ASIGNATURAS_POR_NIVEL?.eso ?? [])

  const guardar = async () => {
    if (!asig || valor === '') return
    setGuardando(true)
    await onGuardar({ alumno_id: alumnoId, fecha, asignatura: asig, nota: valor })
    setGuardando(false)
    setAddingNew(false)
    setAsig('')
    setValor('')
  }

  const eliminar = async (id) => {
    setEliminando(id)
    await onEliminar?.(id)
    setEliminando(null)
  }

  return (
    <div className="nota-exam-section">
      {notas.map(n => (
        <div key={n.id} className="nota-exam-badge">
          <Icon.grad />
          <span>{n.asignatura} <strong style={{ color: Number(n.nota) >= 5 ? '#16a34a' : '#dc2626' }}>{n.nota}</strong></span>
          <button
            className="nota-exam-badge__delete"
            onClick={() => eliminar(n.id)}
            disabled={eliminando === n.id}
          >✕</button>
        </div>
      ))}
      {addingNew ? (
        <div className="nota-exam-form">
          <div className="chips" style={{ marginBottom: 6 }}>
            {lista.map(a => (
              <button key={a} className={`chip${asig === a ? ' chip--on' : ''}`} onClick={() => setAsig(a)}>{a}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="topic__input"
              type="number" min="0" max="10" step="0.5"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Nota (0–10)"
              style={{ width: 110 }}
            />
            <button className="btn btn--primary btn--sm" onClick={guardar} disabled={!asig || valor === '' || guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => { setAddingNew(false); setAsig(''); setValor('') }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="nota-toggle" onClick={() => setAddingNew(true)}>
          <Icon.grad /> {notas.length > 0 ? 'Añadir otra nota' : 'Añadir nota de examen'}
        </button>
      )}
    </div>
  )
}

Object.assign(window, { SessionCard });
