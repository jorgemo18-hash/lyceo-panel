import React from 'react';
window.React = React;

import './components/icons.jsx';
import { supabase } from './lib/supabase.js';
import './components/Chrome.jsx';
import './components/SessionCard.jsx';
import './components/Tarifas.jsx';
import './screens/Horario.jsx';
import './screens/Tarifas.jsx';
import './screens/Documentos.jsx';
import { DiarioScreen } from './screens/Diario.jsx';
import { Alumnos } from './screens/Alumnos.jsx';
import { Cobros } from './screens/Cobros.jsx';
import { Gastos } from './screens/Gastos.jsx';
import { CapturaScreen } from './screens/Captura.jsx';
import { EnvioFamilias } from './screens/EnvioFamilias.jsx';
import { Ajustes } from './screens/Ajustes.jsx';
import { Login } from './screens/Login.jsx';

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

// ── Thin screen wrappers (uso componentes globales via window) ────

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

// ── Mapa de pantallas ────────────────────────────────────────────
const PANTALLAS = {
  captura:    () => <CapturaScreen />,
  diario:     DiarioScreen,
  horario:    HorarioScreen,
  tarifas:    TarifasScreen,
  ficha:      FichaScreen,
  documentos: DocumentosScreen,
  alumnos: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Alumnos" showSearch={false} mobile={mobile} />
        <div className="content">
          <Alumnos />
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
  pagos: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Ingresos" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <Cobros />
        </div>
      </>
    );
  },
  gastos: ({ mobile }) => {
    const Topbar = window.Topbar;
    return (
      <>
        <Topbar eyebrow="Gestión" title="Gastos" showSearch={false} mobile={mobile} />
        <div className="content content--wide">
          <Gastos />
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
const ALLOWED_EMAIL = 'jorgemo18@gmail.com';

export default function App() {
  const [pantalla, setPantalla] = React.useState(
    () => window.matchMedia('(max-width: 768px)').matches ? 'captura' : 'horario'
  );
  const [session, setSession]   = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      window._lyceoSearchQuery = e.detail
      if (e.detail) setPantalla('alumnos')
    }
    window.addEventListener('lyceo-topbar-search', handler)
    return () => window.removeEventListener('lyceo-topbar-search', handler)
  }, [])
  const [loadingAuth, setLoadingAuth] = React.useState(true);
  const [accessDenied, setAccessDenied] = React.useState(false);
  const mobile = useMobile();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        setAccessDenied(true);
      } else {
        setSession(session);
      }
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.email !== ALLOWED_EMAIL) {
        supabase.auth.signOut();
        setAccessDenied(true);
        setSession(null);
      } else {
        setSession(session);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loadingAuth) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      Cargando…
    </div>
  );
  if (accessDenied) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ color: '#8B0000' }}>Acceso denegado</h2>
      <p>Este panel es privado.</p>
    </div>
  );
  if (!session) return <Login />;

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
