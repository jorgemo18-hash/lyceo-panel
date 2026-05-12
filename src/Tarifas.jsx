// Tarifas.jsx — tabla editable de precios por nivel × horas semanales
// Click en cualquier precio para editarlo inline. Guardado simulado.

function Tarifas() {
  const [tarifas, setTarifas] = React.useState(() => JSON.parse(JSON.stringify(TARIFAS_INICIALES)));
  const [editing, setEditing] = React.useState(null); // {nivel, fila}
  const [savedAt, setSavedAt] = React.useState(null);
  const [recienGuardado, setRecienGuardado] = React.useState(null);

  const setPrecio = (nivel, fila, valor) => {
    setTarifas((p) => ({ ...p, [nivel]: { ...p[nivel], [fila]: valor } }));
  };

  const commit = (nivel, fila, raw) => {
    const n = parseInt(String(raw).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) setPrecio(nivel, fila, n);
    setEditing(null);
    const now = new Date();
    setSavedAt(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setRecienGuardado(`${nivel}-${fila}`);
    setTimeout(() => setRecienGuardado(null), 900);
  };

  const reset = () => {
    setTarifas(JSON.parse(JSON.stringify(TARIFAS_INICIALES)));
    setSavedAt(null);
  };

  // Calcular columna "diferencia con anterior" para mostrar incremento por hora
  const incremento = (nivel, fila, idx) => {
    if (idx === 0) return null;
    const prev = tarifas[nivel][TARIFA_FILAS[idx - 1]];
    return tarifas[nivel][fila] - prev;
  };

  return (
    <>
      <div className="tar-intro">
        <p>
          Tabla de tarifas mensuales según el nivel del alumno y las horas semanales contratadas.
          Haz clic en cualquier precio para editarlo — los cambios se aplican a las nuevas matriculaciones.
        </p>
        <div className="tar-actions">
          <button className="btn btn--ghost" onClick={reset}>Restaurar valores originales</button>
        </div>
      </div>

      <div className="tar-card">
        <div className="tar-card__head">
          <div className="tar-card__title">
            <Icon.tag />
            <span>Tarifas vigentes — Curso 2025/26</span>
          </div>
          {savedAt && (
            <span className="gsave gsave--ok">
              <Icon.check /> Cambios guardados · {savedAt}
            </span>
          )}
        </div>

        <table className="tar-table">
          <thead>
            <tr>
              <th className="tar-th tar-th--rowhead">Horas / semana</th>
              {TARIFA_NIVELES.map((n) => (
                <th key={n.id} className={`tar-th tar-th--${n.id}`}>
                  <div className="tar-th__label">{n.label}</div>
                  <div className="tar-th__sub">{n.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TARIFA_FILAS.map((fila, idx) => (
              <tr key={fila}>
                <th className="tar-rowhead">
                  <span className="tar-rowhead__num">{fila}</span>
                  <span className="tar-rowhead__sub">{idx === 0 ? "una hora" : `${fila[0]} horas`} a la semana</span>
                </th>
                {TARIFA_NIVELES.map((n) => {
                  const isEditing = editing && editing.nivel === n.id && editing.fila === fila;
                  const val = tarifas[n.id][fila];
                  const inc = incremento(n.id, fila, idx);
                  const recien = recienGuardado === `${n.id}-${fila}`;
                  return (
                    <td
                      key={n.id}
                      className={`tar-cell ${recien ? "tar-cell--saved" : ""}`}
                      onClick={() => !isEditing && setEditing({ nivel: n.id, fila })}
                    >
                      {isEditing ? (
                        <PriceEditor
                          initial={val}
                          onCommit={(v) => commit(n.id, fila, v)}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <>
                          <span className="tar-price">
                            <span className="tar-price__amt">{val}</span>
                            <span className="tar-price__cur">€</span>
                          </span>
                          <span className="tar-price__per">/mes</span>
                          {inc != null && (
                            <span className="tar-inc">+{inc}€ vs {TARIFA_FILAS[idx - 1]}</span>
                          )}
                          <span className="tar-edit-hint"><Icon.pencil /></span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="tar-foot">
          <Icon.note />
          <span>
            Hermanos: descuento sobre la cuota total.
          </span>
        </div>
      </div>
    </>
  );
}

function PriceEditor({ initial, onCommit, onCancel }) {
  const [v, setV] = React.useState(String(initial));
  const ref = React.useRef(null);
  React.useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="tar-editor" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(v)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(v);
          else if (e.key === "Escape") onCancel();
        }}
      />
      <span className="tar-editor__cur">€</span>
    </div>
  );
}

window.Tarifas = Tarifas;
