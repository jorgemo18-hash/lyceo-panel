import React from 'react';
window.React = React;

import './icons.jsx';
import { cargarSesionesHoy, groupByHora, guardarSesion } from './data.jsx';
import { supabase } from './supabase.js';
import './Chrome.jsx';
import './SessionCard.jsx';
import './Horario.jsx';
import './Tarifas.jsx';
import './FichaFamilias.jsx';
import './Documentos.jsx';
import { Alumnos } from './Alumnos.jsx';
import { Pagos } from './Pagos.jsx';
import { Informes } from './Informes.jsx';
import { EnvioFamilias } from './EnvioFamilias.jsx';
import { Facturas } from './Facturas.jsx';
import { Ajustes } from './Ajustes.jsx';

const PRIMARY = '#8B0000';
const HORAS_EXTRA = ['15:30', '16:30', '17:30', '18:30', '19:30'];
const toIniciales = n => n.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

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

  const [sesiones, setSesiones] = React.useState([]);
  const [hoy, setHoy] = React.useState('');
  const [cargando, setCargando] = React.useState(true);
  const [registros, setRegistros] = React.useState({});
  const [expandido, setExpandido] = React.useState(null);
  const timers = React.useRef({});

  const [modalOpen, setModalOpen] = React.useState(false);
  const [busqueda, setBusqueda] = React.useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = React.useState([]);
  const [alumnoElegido, setAlumnoElegido] = React.useState(null);
  const [horaElegida, setHoraElegida] = React.useState('16:30');
  const [buscando, setBuscando] = React.useState(false);
  const busquedaTimer = React.useRef(null);

  React.useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') cerrarModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  React.useEffect(() => {
    if (!busqueda.trim()) { setResultadosBusqueda([]); setBuscando(false); return; }
    setBuscando(true);
    clearTimeout(busquedaTimer.current);
    busquedaTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('alumnos')
        .select('id, nombre, curso, nivel')
        .ilike('nombre', `%${busqueda}%`)
        .eq('activo', true)
        .limit(10);
      setResultadosBusqueda(data ?? []);
      setBuscando(false);
    }, 250);
  }, [busqueda]);

  const cerrarModal = () => {
    setModalOpen(false);
    setBusqueda('');
    setResultadosBusqueda([]);
    setAlumnoElegido(null);
    setHoraElegida('16:30');
  };

  const añadirAlumno = () => {
    if (!alumnoElegido) return;
    const id = `extra-${alumnoElegido.id}-${Date.now()}`;
    const nuevaSesion = {
      id,
      hora: horaElegida,
      duracion: 60,
      alumno: {
        id: alumnoElegido.id,
        nombre: alumnoElegido.nombre,
        iniciales: toIniciales(alumnoElegido.nombre),
        curso: alumnoElegido.curso,
        nivel: alumnoElegido.nivel,
        familia: null,
      },
      historial: [],
      racha: 0,
    };
    setSesiones(prev => [...prev, nuevaSesion]);
    setRegistros(prev => ({
      ...prev,
      [id]: { asignatura: '', tema: '', comentario: '', nota: '', estado: null, lastSavedAt: null, _dirty: false },
    }));
    cerrarModal();
  };

  React.useEffect(() => {
    cargarSesionesHoy()
      .then(({ sesiones: s, hoy: h, registrosIniciales }) => {
        setSesiones(s);
        setHoy(h);
        setRegistros(registrosIniciales ?? Object.fromEntries(
          s.map((ses) => [
            ses.id,
            { asignatura: '', tema: '', comentario: '', nota: '', estado: null, lastSavedAt: null, _dirty: false },
          ])
        ));
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }, []);

  const onChange = (id, patch) => {
    setRegistros((prev) => {
      clearTimeout(timers.current[id]);
      timers.current[id] = setTimeout(() => {
        setRegistros((p) => {
          const registro = p[id];
          const sesion = sesiones.find(s => s.id === id);
          const debeGuardar = sesion && (
            (registro.asignatura && registro.tema?.trim()) ||
            registro.estado === 'absent'
          );
          if (debeGuardar) guardarSesion(sesion, registro);
          const now = new Date();
          const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          return { ...p, [id]: { ...p[id], lastSavedAt: ts, _dirty: false } };
        });
      }, 1200);
      return { ...prev, [id]: { ...prev[id], ...patch, _dirty: true } };
    });
  };

  const vals = Object.values(registros);
  const done = vals.filter((r) => r.asignatura && r.tema?.trim()).length;
  const absent = vals.filter((r) => r.estado === 'absent').length;
  const lastSaved = vals.map((r) => r.lastSavedAt).filter(Boolean).sort().at(-1) ?? null;
  const groups = groupByHora(sesiones);
  const todoCompleto = sesiones.length > 0 && vals.every((r) => (r.asignatura && r.tema?.trim()) || r.estado === 'absent');

  const btnAñadir = (
    <button className="btn btn--ghost btn--sm" onClick={() => setModalOpen(true)}>
      <Icon.plus /> Añadir alumno hoy
    </button>
  );

  if (cargando) {
    return (
      <>
        <Topbar eyebrow="Hoy" title="Cargando…" showSearch={false} mobile={mobile} rightExtra={btnAñadir} />
        <div className="content">
          <div className="alumnos-estado">
            <div className="alumnos-estado__spinner" /> Cargando sesiones…
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar eyebrow="Hoy" title={hoy} allSavedAt={lastSaved} mobile={mobile} rightExtra={btnAñadir} />
      <div className="content">
        <ProgressBar
          done={done}
          total={sesiones.length}
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
        {sesiones.length === 0 && (
          <div className="placeholder">
            <div className="placeholder__title">Sin sesiones hoy</div>
            <p>No hay alumnos con clase este día.</p>
          </div>
        )}
        {todoCompleto && (
          <div className="endcard">
            <div className="endcard__title">Todo registrado</div>
            Todas las sesiones del día están completadas.
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={cerrarModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <span className="modal__title">Añadir alumno hoy</span>
              <button className="modal__close" onClick={cerrarModal}>✕</button>
            </div>

            <div className="modal__body">
              <label className="modal__label">Alumno</label>
              <input
                className="modal__input"
                type="text"
                placeholder="Buscar alumno…"
                value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setAlumnoElegido(null); }}
                autoFocus
              />
              {buscando && <div className="modal__hint">Buscando…</div>}
              {resultadosBusqueda.length > 0 && (
                <ul className="modal__results">
                  {resultadosBusqueda.map(a => (
                    <li
                      key={a.id}
                      className={`modal__result${alumnoElegido?.id === a.id ? ' modal__result--sel' : ''}`}
                      onClick={() => { setAlumnoElegido(a); setBusqueda(a.nombre); setResultadosBusqueda([]); }}
                    >
                      <span className="modal__result-nombre">{a.nombre}</span>
                      <span className="modal__result-curso">{a.curso}</span>
                    </li>
                  ))}
                </ul>
              )}

              <label className="modal__label" style={{ marginTop: 12 }}>Hora</label>
              <select
                className="modal__select"
                value={horaElegida}
                onChange={e => setHoraElegida(e.target.value)}
              >
                {HORAS_EXTRA.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="modal__footer">
              <button className="btn btn--ghost btn--sm" onClick={cerrarModal}>Cancelar</button>
              <button
                className="btn btn--primary btn--sm"
                onClick={añadirAlumno}
                disabled={!alumnoElegido}
              >
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
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
      <Topbar eyebrow="Gestión" title="Tarifas" showSearch={false} mobile={mobile} />
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
  informes: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Informes" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <Informes />
        </div>
      </>
    );
  },
  envio: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Envío familias" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <EnvioFamilias />
        </div>
      </>
    );
  },
  facturas: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Facturas" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <Facturas />
        </div>
      </>
    );
  },
  pagos: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Pagos" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <Pagos />
        </div>
      </>
    );
  },
  ajustes: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Configuración" title="Ajustes" showSearch={false} mobile={mobile} />
        <div className="content">
          <Ajustes />
        </div>
      </>
    );
  },
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
