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
import { NuevoAlumnoPanel } from './screens/Alumnos.jsx';
import { Cobros } from './screens/Cobros.jsx';
import { Gastos } from './screens/Gastos.jsx';
import { NuevoGastoPanel } from './screens/Gastos.jsx';
import { EnvioFamilias } from './screens/EnvioFamilias.jsx';
import { Facturas } from './screens/Facturas.jsx';
import { Ajustes } from './screens/Ajustes.jsx';
import { Login } from './screens/Login.jsx';

// ── Captura helpers ──────────────────────────────────────────────
function convertirAJpegBlob(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      canvas.toBlob((blob) => { resolve(blob); URL.revokeObjectURL(url) }, 'image/jpeg', 0.9)
    }
    img.src = url
  })
}

async function uploadCapturaFile(file) {
  const ahora = new Date()
  const anio  = ahora.getFullYear()
  const mes   = String(ahora.getMonth() + 1).padStart(2, '0')
  const esPdf = file.type === 'application/pdf'
  const payload     = esPdf ? file : await convertirAJpegBlob(file)
  const contentType = esPdf ? 'application/pdf' : 'image/jpeg'
  const ext         = esPdf ? 'pdf' : 'jpg'
  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(`gastos/${anio}/${mes}/${Date.now()}.${ext}`, payload, { contentType })
  if (error || !data) throw new Error('Error al subir archivo')
  const { data: { publicUrl } } = supabase.storage.from('documentos').getPublicUrl(data.path)
  return publicUrl
}

// ── CapturaScreen ────────────────────────────────────────────────
function CapturaScreen() {
  const [estado, setEstado] = React.useState('idle') // idle | uploading-gasto | uploading-inscripcion
  const [pendiente, setPendiente] = React.useState(null) // { tipo, foto_url }
  const [familias, setFamilias] = React.useState([])
  const gastoRef      = React.useRef(null)
  const inscripcionRef = React.useRef(null)

  React.useEffect(() => {
    supabase.from('familias').select('id, nombre').order('nombre')
      .then(({ data }) => setFamilias(data ?? []))
  }, [])

  const handleFile = async (file, tipo) => {
    setEstado(`uploading-${tipo}`)
    try {
      const fotoUrl = await uploadCapturaFile(file)
      setPendiente({ tipo, foto_url: fotoUrl })
    } catch { /* permanece en idle */ }
    setEstado('idle')
  }

  if (pendiente?.tipo === 'gasto') {
    return (
      <NuevoGastoPanel
        pendiente={pendiente}
        onClose={() => setPendiente(null)}
        onSaved={() => setPendiente(null)}
      />
    )
  }

  if (pendiente?.tipo === 'inscripcion') {
    return (
      <NuevoAlumnoPanel
        familias={familias}
        pendiente={pendiente}
        onClose={() => setPendiente(null)}
        onSaved={() => setPendiente(null)}
      />
    )
  }

  return (
    <div className="captura-screen">
      <input ref={gastoRef} type="file" accept="image/*,application/pdf" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'gasto'); e.target.value = '' }} />
      <input ref={inscripcionRef} type="file" accept="image/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, 'inscripcion'); e.target.value = '' }} />

      <button className="captura-btn" onClick={() => gastoRef.current?.click()} disabled={estado !== 'idle'}>
        {estado === 'uploading-gasto'
          ? <span className="captura-btn__spinner" />
          : <Icon.receipt width={40} height={40} />}
        <span className="captura-btn__label">Subir gasto</span>
      </button>

      <button className="captura-btn" onClick={() => inscripcionRef.current?.click()} disabled={estado !== 'idle'}>
        {estado === 'uploading-inscripcion'
          ? <span className="captura-btn__spinner" />
          : <Icon.users width={40} height={40} />}
        <span className="captura-btn__label">Subir inscripción</span>
      </button>
    </div>
  )
}

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
        <Topbar eyebrow="Gestión" title="Cobros" showSearch={false} mobile={mobile} />
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
