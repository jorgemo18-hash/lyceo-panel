// FichaFamilias.jsx — cuartilla A6 (105×148mm) imprimible
// Al imprimir en A4 caben 4 cuartillas por hoja (2×2).
// Bloque 1: horario semanal por horas completas (5 franjas)
// Bloque 2: tabla de tarifas editable
// Bloque 3: pie con teléfono y email

import { supabase } from './supabase.js'

const FF_BLOQUES = [
  "15:30 – 16:30",
  "16:30 – 17:30",
  "17:30 – 18:30",
  "18:30 – 19:30",
  "19:30 – 20:30",
];
const FF_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const NIVEL_LABEL = { primaria: 'PRIM', eso: 'ESO', bachiller: 'BACH', otro: '' }
const DIA_COLS = [
  { key: 'lunes',     label: 'Lunes'     },
  { key: 'martes',    label: 'Martes'    },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves',    label: 'Jueves'    },
  { key: 'viernes',   label: 'Viernes'   },
]

function buildHorarioVacio() {
  const grid = {}
  FF_BLOQUES.forEach((b) => {
    grid[b] = {}
    FF_DIAS.forEach((d) => { grid[b][d] = { nivel: '', num: 0, tope: 6 } })
  })
  return grid
}

function buildGridFromRows(rows) {
  const grid = buildHorarioVacio()
  rows.forEach((row) => {
    const alumno = row.alumnos
    if (!alumno) return
    const hhmm = (row.hora_inicio ?? '').slice(0, 5)
    const bloque = FF_BLOQUES.find((b) => b.startsWith(hhmm))
    if (!bloque) return
    const nivelLabel = NIVEL_LABEL[alumno.nivel] ?? ''
    DIA_COLS.forEach(({ key, label }) => {
      if (!row[key]) return
      const cell = grid[bloque][label]
      cell.num += 1
      if (nivelLabel && !cell.nivel.split('/').includes(nivelLabel)) {
        cell.nivel = cell.nivel ? `${cell.nivel}/${nivelLabel}` : nivelLabel
      }
    })
  })
  return grid
}

function FichaCellEditor({ cell, onChange }) {
  const isFull = cell.num > 0 && cell.num >= cell.tope;
  const update = (k, v) => onChange({ ...cell, [k]: v });
  return (
    <div className={`ff-cell ${isFull ? "ff-cell--full" : ""}`}>
      <input
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
          style={isFull ? { color: "#c00" } : {}}
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
  const setCell = (b, d, val) => {
    setGrid((p) => ({ ...p, [b]: { ...p[b], [d]: val } }));
  };
  return (
    <div className="ff-block">
      <h2 className="ff-h2">Horario</h2>
      <table className="ff-tab ff-tab--horario">
        <thead>
          <tr>
            <th className="ff-th ff-th--time">Hora</th>
            {FF_DIAS.map((d) => (
              <th key={d} className="ff-th">{d.slice(0, 3)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FF_BLOQUES.map((b) => (
            <tr key={b}>
              <th className="ff-time">{b}</th>
              {FF_DIAS.map((d) => (
                <td key={d} className="ff-td">
                  <FichaCellEditor cell={grid[b][d]} onChange={(v) => setCell(b, d, v)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
            <th className="ff-th ff-th--rowhead">h/sem.</th>
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

function FichaPie({ tel, setTel, email, setEmail }) {
  return (
    <div className="ff-pie">
      <div className="ff-pie__item">
        <span className="ff-pie__lbl">Jorge —</span>
        <input className="ff-pie__input" value={tel} onChange={(e) => setTel(e.target.value)} />
      </div>
      <div className="ff-pie__sep" />
      <div className="ff-pie__item">
        <input className="ff-pie__input ff-pie__input--email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
    </div>
  );
}

function FichaSheet({ grid, setGrid, tarifas, setTarifas, tel, setTel, email, setEmail }) {
  return (
    <div className="ff-sheet">
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
  );
}

function FichaFamilias() {
  const [grid, setGrid] = React.useState(buildHorarioVacio);
  const [tarifas, setTarifas] = React.useState(() => JSON.parse(JSON.stringify(TARIFAS_INICIALES)));
  const [tel, setTel] = React.useState("675 32 41 28");
  const [email, setEmail] = React.useState("info@lyceoacademia.es");

  React.useEffect(() => {
    supabase
      .from('horario')
      .select('*, alumnos(nombre, curso, nivel)')
      .not('hora_inicio', 'is', null)
      .eq('alumnos.activo', true)
      .then(({ data }) => { if (data) setGrid(buildGridFromRows(data)) })
  }, []);

  const sheetProps = { grid, setGrid, tarifas, setTarifas, tel, setTel, email, setEmail };

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
          Cuartilla A6 — al imprimir caben 4 por folio A4.
          Edita cualquier campo haciendo clic.
        </p>
        <button className="btn btn--primary" onClick={onPrint}>
          <Icon.printer /> Imprimir
        </button>
      </div>

      {/* Pantalla: una cuartilla */}
      <div className="ff-screen-sheet">
        <FichaSheet {...sheetProps} />
      </div>

      {/* Impresión: cuatro cuartillas en rejilla 2×2 sobre A4 */}
      <div className="ff-print-grid">
        <FichaSheet {...sheetProps} />
        <FichaSheet {...sheetProps} />
        <FichaSheet {...sheetProps} />
        <FichaSheet {...sheetProps} />
      </div>
    </>
  );
}

window.FichaFamilias = FichaFamilias;
