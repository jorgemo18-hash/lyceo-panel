import React from 'react';
window.React = React;

import './icons.jsx';
import './data.jsx';
import './Chrome.jsx';
import './SessionCard.jsx';
import './Horario.jsx';
import './Tarifas.jsx';
import './FichaFamilias.jsx';
import './Documentos.jsx';
import { Alumnos } from './Alumnos.jsx';

const PRIMARY = '#8B0000';

function useMobile() {
  const [mobile, setMobile] = React.useState(
    () => window.matchMedia('(max-width: 768px)').matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ── Diario ──────────────────────────────────────────────────────
function DiarioScreen({ mobile }) {
  const Topbar = window.Topbar;
  const ProgressBar = window.ProgressBar;
  const SessionCard = window.SessionCard;
  const { SESIONES_HOY, HOY, groupByHora } = window;

  const [registros, setRegistros] = React.useState(() =>
    Object.fromEntries(
      SESIONES_HOY.map((s) => [
        s.id,
        { asignatura: '', tema: '', nota: '', estado: null, lastSavedAt: null, _dirty: false },
      ])
    )
  );
  const [expandido, setExpandido] = React.useState(null);
  const timers = React.useRef({});

  const onChange = (id, patch) => {
    setRegistros((prev) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        const now = new Date();
        const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setRegistros((p) => ({ ...p, [id]: { ...p[id], lastSavedAt: ts, _dirty: false } }));
      }, 1200);
      return { ...prev, [id]: { ...prev[id], ...patch, _dirty: true } };
    });
  };

  const vals = Object.values(registros);
  const done = vals.filter((r) => r.asignatura && r.tema?.trim()).length;
  const absent = vals.filter((r) => r.estado === 'absent').length;
  const lastSaved = vals.map((r) => r.lastSavedAt).filter(Boolean).sort().at(-1) ?? null;
  const groups = groupByHora(SESIONES_HOY);
  const todoCompleto = vals.every((r) => (r.asignatura && r.tema?.trim()) || r.estado === 'absent');

  return (
    <>
      <Topbar eyebrow="Hoy" title={HOY} allSavedAt={lastSaved} mobile={mobile} />
      <div className="content">
        <ProgressBar
          done={done}
          total={SESIONES_HOY.length}
          absent={absent}
          primaryColor={PRIMARY}
        />
        {groups.map(({ hora, items }) => (
          <div key={hora} className="hgroup">
            <div className="hgroup__head">
              <span className="hgroup__hora">{hora}</span>
              <span className="hgroup__line" />
              <span className="hgroup__count">
                {items.length} {items.length === 1 ? 'alumno' : 'alumnos'}
              </span>
            </div>
            {items.map((s) => (
              <SessionCard
                key={s.id}
                sesion={s}
                registro={registros[s.id]}
                onChange={(patch) => onChange(s.id, patch)}
                onToggle={() => setExpandido((p) => (p === s.id ? null : s.id))}
                expandido={expandido === s.id}
                primaryColor={PRIMARY}
              />
            ))}
          </div>
        ))}
        {todoCompleto && (
          <div className="endcard">
            <div className="endcard__title">Todo registrado</div>
            Todas las sesiones del día están completadas.
          </div>
        )}
      </div>
    </>
  );
}

// ── Horario ─────────────────────────────────────────────────────
function HorarioScreen({ mobile }) {
  const Topbar = window.Topbar;
  const Horario = window.Horario;
  return (
    <>
      <Topbar eyebrow="Vista semanal" title="Horario" showSearch={false} mobile={mobile} />
      <div className="content content--wide">
        <Horario />
      </div>
    </>
  );
}

// ── Tarifas ─────────────────────────────────────────────────────
function TarifasScreen({ mobile }) {
  const Topbar = window.Topbar;
  const Tarifas = window.Tarifas;
  return (
    <>
      <Topbar eyebrow="Configuración" title="Tarifas" showSearch={false} mobile={mobile} />
      <div className="content">
        <Tarifas />
      </div>
    </>
  );
}

// ── Ficha familias ───────────────────────────────────────────────
function FichaScreen({ mobile }) {
  const Topbar = window.Topbar;
  const FichaFamilias = window.FichaFamilias;
  return (
    <>
      <Topbar eyebrow="Documentos" title="Ficha para familias" showSearch={false} mobile={mobile} />
      <div className="content content--ficha">
        <FichaFamilias />
      </div>
    </>
  );
}

// ── Documentos ──────────────────────────────────────────────────
function DocumentosScreen({ mobile }) {
  const Topbar = window.Topbar;
  const Documentos = window.Documentos;
  return (
    <>
      <Topbar eyebrow="Documentos" title="Pack de bienvenida" showSearch={false} mobile={mobile} />
      <div className="content content--docs">
        <Documentos />
      </div>
    </>
  );
}

// ── Placeholder ─────────────────────────────────────────────────
function PlaceholderScreen({ eyebrow, title, desc, mobile }) {
  const Topbar = window.Topbar;
  return (
    <>
      <Topbar eyebrow={eyebrow} title={title} showSearch={false} mobile={mobile} />
      <div className="content">
        <div className="placeholder">
          <div className="placeholder__title">{title}</div>
          <p>{desc ?? 'Esta sección está en construcción.'}</p>
        </div>
      </div>
    </>
  );
}

// ── Mapa de pantallas ────────────────────────────────────────────
const PANTALLAS = {
  diario: DiarioScreen,
  horario: HorarioScreen,
  tarifas: TarifasScreen,
  ficha: FichaScreen,
  documentos: DocumentosScreen,
  alumnos: ({ mobile }) => {
    const Topbar = window.Topbar
    return (
      <>
        <Topbar eyebrow="Gestión" title="Alumnos" showSearch={false} mobile={mobile} />
        <div className="content">
          <Alumnos />
        </div>
      </>
    )
  },
  informes: (p) => (
    <PlaceholderScreen
      eyebrow="Gestión"
      title="Informes"
      desc="Informes trimestrales por alumno listos para enviar a las familias."
      {...p}
    />
  ),
  pagos: (p) => (
    <PlaceholderScreen
      eyebrow="Gestión"
      title="Pagos"
      desc="Control de cuotas mensuales, recibos y domiciliaciones."
      {...p}
    />
  ),
};

// ── App ──────────────────────────────────────────────────────────
export default function App() {
  const [pantalla, setPantalla] = React.useState('horario');
  const mobile = useMobile();

  const Sidebar = window.Sidebar;
  const BottomNav = window.BottomNav;
  const Screen = PANTALLAS[pantalla] ?? DiarioScreen;

  return (
    <div className={`app${mobile ? ' app--mobile' : ''}`}>
      {!mobile && <Sidebar activo={pantalla} onNavigate={setPantalla} />}
      <div className="main">
        <Screen mobile={mobile} />
      </div>
      {mobile && <BottomNav activo={pantalla} onNavigate={setPantalla} />}
    </div>
  );
}
