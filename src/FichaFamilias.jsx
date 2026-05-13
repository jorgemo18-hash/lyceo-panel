// FichaFamilias.jsx — hoja A4 editable e imprimible
// Bloque 1: horario semanal con celdas editables (nivel + nº alumnos + tope)
// Bloque 2: tabla de tarifas (idéntica a Tarifas) editable inline, sin nota de matrícula
// Bloque 3: pie de página con teléfono y email editables

const FF_FRANJAS = [
  "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];
const FF_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// Estado inicial: cada celda { nivel, num, tope }. num=0 → vacía.
function buildHorarioInicial() {
  const blank = { nivel: "", num: 0, tope: 6 };
  const grid = {};
  FF_FRANJAS.forEach((h) => {
    grid[h] = {};
    FF_DIAS.forEach((d) => { grid[h][d] = { ...blank }; });
  });
  // Sembrar datos plausibles
  const seed = (h, d, nivel, num, tope = 6) => { grid[h][d] = { nivel, num, tope }; };
  seed("16:00", "Lunes", "PRIM/ESO", 4, 6);
  seed("16:30", "Lunes", "PRIM/ESO", 4, 6);
  seed("16:00", "Miércoles", "PRIM/ESO", 4, 6);
  seed("16:30", "Miércoles", "PRIM/ESO", 4, 6);
  seed("16:00", "Martes", "PRIM", 2, 6);
  seed("16:30", "Martes", "PRIM", 2, 6);
  seed("16:00", "Jueves", "PRIM", 2, 6);
  seed("16:30", "Jueves", "PRIM", 2, 6);
  seed("17:00", "Lunes", "ESO/BACH", 3, 6);
  seed("17:30", "Lunes", "ESO/BACH", 3, 6);
  seed("17:00", "Miércoles", "ESO/BACH", 3, 6);
  seed("17:30", "Miércoles", "ESO/BACH", 3, 6);
  seed("17:00", "Martes", "ESO", 2, 6);
  seed("17:30", "Martes", "ESO", 2, 6);
  seed("17:00", "Jueves", "ESO", 2, 6);
  seed("17:30", "Jueves", "ESO", 2, 6);
  seed("18:00", "Lunes", "ESO", 2, 6);
  seed("18:30", "Lunes", "ESO", 2, 6);
  seed("19:00", "Lunes", "ESO/BACH", 3, 6);
  seed("19:30", "Lunes", "ESO/BACH", 3, 6);
  seed("18:00", "Martes", "BACH", 1, 6);
  seed("18:30", "Martes", "BACH", 1, 6);
  seed("19:00", "Martes", "BACH", 1, 6);
  seed("19:30", "Martes", "BACH", 1, 6);
  seed("18:00", "Miércoles", "ESO", 2, 6);
  seed("18:30", "Miércoles", "ESO", 2, 6);
  seed("19:00", "Miércoles", "BACH", 1, 6);
  seed("19:30", "Miércoles", "BACH", 1, 6);
  seed("18:00", "Jueves", "ESO/BACH", 3, 6);
  seed("18:30", "Jueves", "ESO/BACH", 3, 6);
  seed("19:00", "Jueves", "BACH", 1, 6);
  seed("19:30", "Jueves", "BACH", 1, 6);
  seed("18:00", "Viernes", "ESO", 2, 6);
  seed("18:30", "Viernes", "ESO", 2, 6);
  return grid;
}

// Edición inline genérica para celdas de la tabla de horario
function FichaCellEditor({ cell, onChange }) {
  const [editing, setEditing] = React.useState(false);
  const nivelRef = React.useRef(null);
  const isFull = cell.num > 0 && cell.num >= cell.tope;
  const isEmpty = cell.num === 0 && !cell.nivel;
  const update = (k, v) => onChange({ ...cell, [k]: v });

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => nivelRef.current?.focus(), 0);
  };

  const stopEdit = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false);
  };

  // ── Modo lectura ──────────────────────────────────────────────
  if (!editing) {
    if (isEmpty) {
      return (
        <button className="ff-cell ff-cell--empty" onClick={startEdit}>+</button>
      );
    }
    return (
      <div
        className={`ff-cell ff-cell--read ${isFull ? "ff-cell--full" : ""}`}
        onClick={startEdit}
        title="Editar"
      >
        <span className="ff-cell__nivel-lbl">{cell.nivel}</span>
        <span className="ff-cell__nums-lbl">{cell.num}/{cell.tope}</span>
        <span className="ff-cell__pencil">✏</span>
      </div>
    );
  }

  // ── Modo edición ──────────────────────────────────────────────
  return (
    <div
      className={`ff-cell ff-cell--editing ${isFull ? "ff-cell--full" : ""}`}
      onBlur={stopEdit}
      onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
    >
      <input
        ref={nivelRef}
        className="ff-cell__nivel"
        value={cell.nivel}
        placeholder="Nivel"
        onChange={(e) => update("nivel", e.target.value.toUpperCase())}
      />
      <div className="ff-cell__nums">
        <input
          type="text"
          inputMode="numeric"
          className="ff-cell__num"
          value={cell.num || ""}
          placeholder="0"
          onChange={(e) => update("num", parseInt(e.target.value || "0", 10) || 0)}
        />
        <span className="ff-cell__sep">/</span>
        <input
          type="text"
          inputMode="numeric"
          className="ff-cell__tope"
          value={cell.tope}
          onChange={(e) => update("tope", parseInt(e.target.value || "0", 10) || 0)}
        />
      </div>
    </div>
  );
}

function FichaHorario({ grid, setGrid }) {
  const setCell = (h, d, val) => {
    setGrid((p) => ({ ...p, [h]: { ...p[h], [d]: val } }));
  };
  return (
    <div className="ff-block">
      <h2 className="ff-h2">Horario semanal</h2>
      <table className="ff-tab ff-tab--horario">
        <thead>
          <tr>
            <th className="ff-th ff-th--time">Hora</th>
            {FF_DIAS.map((d) => (
              <th key={d} className="ff-th">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FF_FRANJAS.map((h) => (
            <tr key={h}>
              <th className="ff-time">{h}</th>
              {FF_DIAS.map((d) => {
                const cell = grid[h][d];
                const isEmpty = cell.num === 0 && !cell.nivel;
                return (
                  <td key={d} className={`ff-td ${isEmpty ? "ff-td--empty" : ""}`}>
                    <FichaCellEditor cell={cell} onChange={(v) => setCell(h, d, v)} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FichaTarifas({ tarifas, setTarifas }) {
  const [editing, setEditing] = React.useState(null);
  const set = (nivel, fila, val) => {
    const n = parseInt(String(val).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > 0) {
      setTarifas((p) => ({ ...p, [nivel]: { ...p[nivel], [fila]: n } }));
    }
    setEditing(null);
  };

  return (
    <div className="ff-block">
      <h2 className="ff-h2">Tarifas mensuales</h2>
      <table className="ff-tab ff-tab--tarifas">
        <thead>
          <tr>
            <th className="ff-th ff-th--rowhead">Horas/sem.</th>
            {TARIFA_NIVELES.map((n) => (
              <th key={n.id} className="ff-th">{n.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TARIFA_FILAS.map((fila) => (
            <tr key={fila}>
              <th className="ff-rowhead">{fila}</th>
              {TARIFA_NIVELES.map((n) => {
                const isEditing = editing && editing.nivel === n.id && editing.fila === fila;
                const val = tarifas[n.id][fila];
                return (
                  <td
                    key={n.id}
                    className="ff-td ff-td--price"
                    onClick={() => !isEditing && setEditing({ nivel: n.id, fila })}
                  >
                    {isEditing ? (
                      <FichaPriceEditor initial={val} onCommit={(v) => set(n.id, fila, v)} onCancel={() => setEditing(null)} />
                    ) : (
                      <span className="ff-price">
                        <span className="ff-price__amt">{val}</span>
                        <span className="ff-price__cur">€</span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ff-tarifas-foot">Hermanos: 10% descuento sobre la cuota total.</div>
    </div>
  );
}

function FichaPriceEditor({ initial, onCommit, onCancel }) {
  const [v, setV] = React.useState(String(initial));
  const ref = React.useRef(null);
  React.useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      className="ff-price__edit"
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
  );
}

function FichaPie({ tel, setTel, email, setEmail }) {
  return (
    <div className="ff-pie">
      <div className="ff-pie__item">
        <span className="ff-pie__lbl">Jorge —</span>
        <input
          className="ff-pie__input"
          value={tel}
          onChange={(e) => setTel(e.target.value)}
        />
      </div>
      <div className="ff-pie__sep" />
      <div className="ff-pie__item">
        <input
          className="ff-pie__input ff-pie__input--email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
    </div>
  );
}

function FichaFamilias() {
  const [grid, setGrid] = React.useState(buildHorarioInicial);
  const [tarifas, setTarifas] = React.useState(() => JSON.parse(JSON.stringify(TARIFAS_INICIALES)));
  const [tel, setTel] = React.useState("656 12 34 56");
  const [email, setEmail] = React.useState("info@lyceoacademia.es");

  const onPrint = () => {
    document.body.classList.add("printing");
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("printing"), 300);
    }, 30);
  };

  React.useEffect(() => {
    const after = () => document.body.classList.remove("printing");
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  return (
    <>
      <div className="ff-toolbar no-print">
        <p className="ff-toolbar__hint">
          Hoja informativa para familias. Edita cualquier campo haciendo clic.
          Las celdas que llegan al tope se marcan en rojo.
        </p>
        <button className="btn btn--primary" onClick={onPrint}>
          <Icon.printer /> Imprimir
        </button>
      </div>

      <div className="ff-sheet" id="ff-sheet">
        <header className="ff-head">
          <img src="logo.png" alt="" className="ff-head__logo" />
          <div className="ff-head__title">
            <div className="ff-head__brand">Lyceo</div>
            <div className="ff-head__sub">Academia de estudios</div>
          </div>
          <div className="ff-head__line" />
          <div className="ff-head__tag">Información para familias</div>
        </header>

        <FichaHorario grid={grid} setGrid={setGrid} />
        <FichaTarifas tarifas={tarifas} setTarifas={setTarifas} />
        <FichaPie tel={tel} setTel={setTel} email={email} setEmail={setEmail} />
      </div>
    </>
  );
}

window.FichaFamilias = FichaFamilias;
