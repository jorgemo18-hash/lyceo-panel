// Iconografía — SVG inline, trazo fino, estilo serio/académico
// Sin librerías de iconos para mantener control total del trazo

const Icon = {
  check: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  ),
  calendar: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
    </svg>
  ),
  pencil: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" />
    </svg>
  ),
  note: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 2.5h7l3 3v8a.5.5 0 0 1-.5.5h-9.5a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5z" />
      <path d="M9.5 2.5v3.5h3.5" />
    </svg>
  ),
  absent: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5 5l6 6M11 5l-6 6" />
    </svg>
  ),
  chevron: (p) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 3l5 5-5 5" />
    </svg>
  ),
  flame: (p) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 1.5s3 2.5 3 5.5a3 3 0 0 1-6 0c0-1 .5-1.5 1-2C5 7.5 5 9 5 10a3 3 0 0 0 6 0" />
    </svg>
  ),
  home: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2.5 7.5L8 2.5l5.5 5M4 7v6.5h8V7" />
    </svg>
  ),
  users: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="6" cy="6" r="2.5" />
      <path d="M2 13.5c0-2 2-3.5 4-3.5s4 1.5 4 3.5" />
      <path d="M11 6.5a2 2 0 1 0 0-4M14 13.5c0-1.5-1-2.7-2.5-3.2" />
    </svg>
  ),
  euro: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 4a5 5 0 1 0 0 8M3 7h6M3 9.5h5" />
    </svg>
  ),
  grid: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <path d="M2.5 6h11M2.5 10h11M6 2.5v11M10 2.5v11" />
    </svg>
  ),
  tag: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8.5 1.5h5v5l-7 7-5-5z" />
      <circle cx="11" cy="5" r="1" fill="currentColor" />
    </svg>
  ),
  printer: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 6V2.5h8V6" />
      <rect x="2" y="6" width="12" height="6" rx="1" />
      <rect x="4.5" y="9.5" width="7" height="4" rx=".5" />
      <circle cx="12" cy="8.5" r=".5" fill="currentColor" />
    </svg>
  ),
  doc: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3.5 1.5h6l3 3v10h-9z" />
      <path d="M6 7h4M6 9.5h4M6 12h2.5" />
    </svg>
  ),
  settings: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4" />
    </svg>
  ),
  archive: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="2.5" width="12" height="3.5" rx="1" />
      <path d="M3.5 6v7h9V6" />
      <path d="M6.5 9.5l1.5 1.5 1.5-1.5M8 11V8" />
    </svg>
  ),
  search: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  ),
  sun: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  ),
  mail: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="2" y="4" width="12" height="9" rx="1" />
      <path d="M2 5l6 4.5L14 5" />
    </svg>
  ),
  plus: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  logout: (p) => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 2.5H3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h3" />
      <path d="M10.5 11l3-3-3-3M13.5 8H6" />
    </svg>
  ),
  receipt: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 1.5v13l2-1.5 2 1.5 2-1.5 2 1.5 2-1.5V1.5z" />
      <path d="M6 5.5h4M6 8h4M6 10.5h2.5" />
    </svg>
  ),
  camera: (p) => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M1.5 5.5a1 1 0 0 1 1-1h1.5l1.5-2h4l1.5 2H13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1z" />
      <circle cx="8" cy="9" r="2.2" />
    </svg>
  ),
};

window.Icon = Icon;
