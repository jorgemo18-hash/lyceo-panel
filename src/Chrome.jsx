// Sidebar y Topbar — chrome del panel
// Desktop: sidebar izquierdo fijo. Móvil: topbar + bottom nav.

function Sidebar({ activo = "horario", onNavigate }) {
  const items = [
    { id: "horario", label: "Horario", icon: <Icon.grid /> },
    { id: "diario", label: "Diario", icon: <Icon.calendar /> },
    { id: "alumnos", label: "Alumnos", icon: <Icon.users /> },
    { id: "informes", label: "Informes", icon: <Icon.doc /> },
    { id: "envio", label: "Envío familias", icon: <Icon.mail /> },
    { id: "facturas", label: "Facturas", icon: <Icon.note /> },
    { id: "ficha", label: "Tarifas", icon: <Icon.tag /> },
    { id: "documentos", label: "Documentos", icon: <Icon.doc /> },
    { id: "pagos", label: "Cobros", icon: <Icon.euro /> },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="logo.png" alt="" className="brand__logo" aria-hidden="true" />
        <div className="brand__name">
          <div className="brand__title">Lyceo</div>
          <div className="brand__sub">Academia de estudios</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        {items.map((it) => (
          <a
            key={it.id}
            href="#"
            className={`navitem ${activo === it.id ? "navitem--on" : ""}`}
            onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(it.id); }}
          >
            <span className="navitem__icon">{it.icon}</span>
            <span className="navitem__label">{it.label}</span>
            {it.id === "diario" && <span className="navitem__badge">8</span>}
          </a>
        ))}
      </nav>

      <div className="sidebar__foot">
        <a
          href="#"
          className={`navitem ${activo === 'ajustes' ? 'navitem--on' : ''}`}
          onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('ajustes'); }}
        >
          <span className="navitem__icon"><Icon.settings /></span>
          <span className="navitem__label">Ajustes</span>
        </a>
        <div className="user">
          <div className="user__avatar">JM</div>
          <div className="user__name">
            <div>Jorge Martínez</div>
            <div className="user__role">Profesor</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ activo = "horario", onNavigate }) {
  const items = [
    { id: "horario", label: "Horario", icon: <Icon.grid /> },
    { id: "diario", label: "Diario", icon: <Icon.calendar /> },
    { id: "alumnos", label: "Alumnos", icon: <Icon.users /> },
    { id: "ficha", label: "Tarifas", icon: <Icon.tag /> },
    { id: "ajustes", label: "Más", icon: <Icon.settings /> },
  ];
  return (
    <nav className="bottomnav">
      {items.map((it) => (
        <a
          key={it.id}
          href="#"
          className={`bnav ${activo === it.id ? "bnav--on" : ""}`}
          onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(it.id); }}
        >
          <span className="bnav__icon">{it.icon}</span>
          <span className="bnav__label">{it.label}</span>
        </a>
      ))}
    </nav>
  );
}

function Topbar({ eyebrow, title, allSavedAt, mobile, rightExtra, showSearch = true }) {
  return (
    <header className="topbar">
      {mobile && (
        <div className="topbar__brand-mobile">
          <img src="logo.png" alt="" className="brand__logo brand__logo--sm" aria-hidden="true" />
          <span>Lyceo</span>
          <span className="topbar__brand-sub">· Academia de estudios</span>
        </div>
      )}
      <div className="topbar__left">
        <div className="topbar__eyebrow">{eyebrow}</div>
        <h1 className="topbar__title">{title}</h1>
      </div>

      <div className="topbar__right">
        {rightExtra}
        {allSavedAt !== undefined && <GlobalSaveStatus savedAt={allSavedAt} />}
        {!mobile && showSearch && (
          <div className="search">
            <Icon.search />
            <input type="text" placeholder="Buscar alumno…" />
            <kbd>⌘K</kbd>
          </div>
        )}
      </div>
    </header>
  );
}

function GlobalSaveStatus({ savedAt }) {
  if (!savedAt) {
    return (
      <span className="gsave gsave--idle">
        <span className="gsave__dot" /> Listo para empezar
      </span>
    );
  }
  return (
    <span className="gsave gsave--ok">
      <Icon.check /> Sincronizado · {savedAt}
    </span>
  );
}

function ProgressBar({ done, total, absent, primaryColor }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  const absPct = total > 0 ? (absent / total) * 100 : 0;
  return (
    <div className="progress">
      <div className="progress__row">
        <div className="progress__label">
          <span className="progress__count">{done}</span>
          <span className="progress__sep">/</span>
          <span>{total} sesiones registradas</span>
        </div>
        <div className="progress__legend">
          {absent > 0 && (
            <span className="progress__leg-item progress__leg-item--abs">
              {absent} ausencia{absent !== 1 ? "s" : ""}
            </span>
          )}
          <span className="progress__leg-item">
            {total - done - absent} pendiente{total - done - absent !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="progress__track">
        <div
          className="progress__fill"
          style={{ width: `${pct}%`, background: primaryColor }}
        />
        <div
          className="progress__fill progress__fill--abs"
          style={{ width: `${absPct}%`, left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Agrupa sesiones por hora para mostrar separadores cronológicos
function groupByHora(sesiones) {
  const groups = {};
  sesiones.forEach((s) => {
    if (!groups[s.hora]) groups[s.hora] = [];
    groups[s.hora].push(s);
  });
  return Object.keys(groups)
    .sort()
    .map((hora) => ({ hora, items: groups[hora] }));
}

Object.assign(window, { Sidebar, BottomNav, Topbar, ProgressBar, groupByHora });
