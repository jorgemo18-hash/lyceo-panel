import { supabase } from '../lib/supabase.js'

export function Login() {
  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '24px',
      background: '#fafafa',
    }}>
      <img src="/logo.png" style={{ width: 80 }} alt="Lyceo" />
      <h1 style={{ color: '#8B0000', margin: 0 }}>Lyceo Academia</h1>
      <p style={{ color: '#666', margin: 0 }}>Panel de gestión</p>
      <button onClick={handleGoogle} style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 24px', border: '1px solid #ddd', borderRadius: '8px',
        background: 'white', cursor: 'pointer', fontSize: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}>
        <img src="https://www.google.com/favicon.ico" style={{ width: 20 }} alt="" />
        Entrar con Google
      </button>
    </div>
  )
}
