import { supabase } from '../lib/supabase.js'
import { NuevoGastoPanel } from './Gastos.jsx'
import { NuevoAlumnoPanel } from './Alumnos.jsx'

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

export function CapturaScreen() {
  const [estado, setEstado] = React.useState('idle') // idle | uploading-gasto | uploading-inscripcion
  const [pendiente, setPendiente] = React.useState(null) // { tipo, foto_url }
  const [familias, setFamilias] = React.useState([])
  const gastoRef       = React.useRef(null)
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
    } catch {}
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

      <button
        className="captura-btn captura-btn--gasto"
        onClick={() => gastoRef.current?.click()}
        disabled={estado !== 'idle'}
      >
        {estado === 'uploading-gasto'
          ? <span className="captura-btn__spinner" />
          : <Icon.receipt width={44} height={44} />}
        <span className="captura-btn__label">Subir gasto</span>
      </button>

      <button
        className="captura-btn captura-btn--inscripcion"
        onClick={() => inscripcionRef.current?.click()}
        disabled={estado !== 'idle'}
      >
        {estado === 'uploading-inscripcion'
          ? <span className="captura-btn__spinner" />
          : <Icon.users width={44} height={44} />}
        <span className="captura-btn__label">Subir inscripción</span>
      </button>
    </div>
  )
}
