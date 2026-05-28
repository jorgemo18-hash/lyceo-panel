// Sidebar y Topbar — chrome del panel
// Desktop: sidebar izquierdo fijo. Móvil: topbar + bottom nav.

function Sidebar({ activo = "horario", onNavigate }) {
  const [gastosBadge, setGastosBadge] = React.useState(0)
  const [alumnosBadge, setAlumnosBadge] = React.useState(0)

  const cargarBadges = React.useCallback(() => {
    import('../lib/supabase.js').then(({ supabase }) => {
      Promise.all([
        supabase.from('gastos_pendientes').select('id', { count: 'exact', head: true }).eq('tipo', 'gasto').eq('procesado', false),
        supabase.from('gastos_pendientes').select('id', { count: 'exact', head: true }).eq('tipo', 'inscripcion').eq('procesado', false),
      ]).then(([g, i]) => {
        setGastosBadge(g.count || 0)
        setAlumnosBadge(i.count || 0)
      })
    })
  }, [])

  React.useEffect(() => {
    cargarBadges()
    window.addEventListener('pendientes-actualizado', cargarBadges)
    return () => window.removeEventListener('pendientes-actualizado', cargarBadges)
  }, [cargarBadges])

  const grupos = [
    [
      { id: "horario",      label: "Horario",          icon: <Icon.grid /> },
      { id: "diario",       label: "Diario",            icon: <Icon.calendar /> },
      { id: "alumnos",      label: "Alumnos",           icon: <Icon.users />, badge: alumnosBadge || null },
      { id: "lista_espera", label: "Lista de espera",   icon: <Icon.clock /> },
      { id: "ficha",        label: "Tarifas",           icon: <Icon.tag /> },
      { id: "documentos",   label: "Documentos",        icon: <Icon.doc /> },
    ],
    [
      { id: "envio",        label: "Envío familias",    icon: <Icon.mail /> },
    ],
    [
      { id: "pagos",        label: "Ingresos",          icon: <Icon.euro /> },
      { id: "gastos",       label: "Gastos",            icon: <Icon.receipt />, badge: gastosBadge || null },
    ],
  ];

  const renderItems = (items) => items.map((it) => (
    <a
      key={it.id}
      href="#"
      className={`navitem ${activo === it.id ? "navitem--on" : ""}`}
      onClick={(e) => { e.preventDefault(); onNavigate && onNavigate(it.id); }}
    >
      <span className="navitem__icon">{it.icon}</span>
      <span className="navitem__label">{it.label}</span>
      {it.badge ? <span className="navitem__badge">{it.badge}</span> : null}
    </a>
  ));

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
        {grupos.map((grupo, i) => (
          <React.Fragment key={i}>
            {i > 0 && <hr className="nav-sep" />}
            {renderItems(grupo)}
          </React.Fragment>
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
            <div>Jorge Moreno Pardo</div>
            <div className="user__role">Profesor</div>
          </div>
          <button
            className="user__signout"
            title="Cerrar sesión"
            onClick={() => import('../lib/supabase.js').then(m => m.supabase.auth.signOut())}
          >
            <Icon.logout />
          </button>
        </div>
      </div>
    </aside>
  );
}

function BottomNav({ activo = "horario", onNavigate }) {
  const [masOpen, setMasOpen] = React.useState(false)

  const main = [
    { id: "captura", label: "Captura", icon: <Icon.camera /> },
    { id: "horario", label: "Horario", icon: <Icon.grid /> },
    { id: "alumnos", label: "Alumnos", icon: <Icon.users /> },
    { id: "gastos",  label: "Gastos",  icon: <Icon.receipt /> },
    { id: "pagos",   label: "Ingresos", icon: <Icon.euro /> },
  ]

  const mas = [
    { id: "diario",       label: "Diario",           icon: <Icon.calendar /> },
    { id: "facturas",     label: "Facturas",         icon: <Icon.note /> },
    { id: "envio",        label: "Envío familias",   icon: <Icon.mail /> },
    { id: "ficha",        label: "Tarifas",          icon: <Icon.tag /> },
    { id: "lista_espera", label: "Lista de espera",  icon: <Icon.clock /> },
    { id: "documentos",   label: "Documentos",       icon: <Icon.doc /> },
    { id: "ajustes",      label: "Ajustes",          icon: <Icon.settings /> },
  ]

  const handleNav = (id) => { setMasOpen(false); onNavigate && onNavigate(id) }
  const masActivo = mas.some(it => it.id === activo)

  return (
    <>
      {masOpen && (
        <div className="bnav-mas-backdrop" onClick={() => setMasOpen(false)} />
      )}
      {masOpen && (
        <div className="bnav-mas">
          {mas.map(it => (
            <a
              key={it.id}
              href="#"
              className={`bnav-mas__item ${activo === it.id ? "bnav-mas__item--on" : ""}`}
              onClick={(e) => { e.preventDefault(); handleNav(it.id) }}
            >
              <span className="bnav-mas__icon">{it.icon}</span>
              <span className="bnav-mas__label">{it.label}</span>
            </a>
          ))}
        </div>
      )}
      <nav className="bottomnav">
        {main.map(it => (
          <a
            key={it.id}
            href="#"
            className={`bnav ${activo === it.id ? "bnav--on" : ""}`}
            onClick={(e) => { e.preventDefault(); handleNav(it.id) }}
          >
            <span className="bnav__icon">{it.icon}</span>
            <span className="bnav__label">{it.label}</span>
          </a>
        ))}
        <button
          className={`bnav bnav--more ${masActivo || masOpen ? "bnav--on" : ""}`}
          onClick={() => setMasOpen(v => !v)}
        >
          <span className="bnav__icon"><Icon.settings /></span>
          <span className="bnav__label">Más</span>
        </button>
      </nav>
    </>
  )
}

function Topbar({ eyebrow, title, allSavedAt, mobile, rightExtra, showSearch = true }) {
  const [query, setQuery] = React.useState('')

  const handleChange = (val) => {
    setQuery(val)
    window.dispatchEvent(new CustomEvent('lyceo-topbar-search', { detail: val }))
  }

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
          <div className={`search${query ? ' search--active' : ''}`}>
            <Icon.search />
            <input
              type="text"
              placeholder="Buscar alumno…"
              value={query}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { handleChange(''); e.target.blur() } }}
            />
            {query
              ? <button className="search__clear" onClick={() => handleChange('')}>✕</button>
              : <kbd>⌘K</kbd>
            }
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
