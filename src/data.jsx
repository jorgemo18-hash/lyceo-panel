// Datos de prueba — simulan lo que vendría de Supabase
// Tablas: alumnos, horario, sesiones (registros previos para sugerencias)

const HOY = "Lunes, 4 de mayo";
const FECHA_ISO = "2026-05-04";

const ASIGNATURAS_POR_NIVEL = {
  primaria: ["Matemáticas", "Lengua", "Inglés", "Ciencias", "Lectura"],
  eso: ["Matemáticas", "Lengua", "Inglés", "Física y Química", "Biología", "Historia"],
  bachillerato: ["Matemáticas II", "Física", "Química", "Lengua", "Inglés", "Historia"],
};

// Sesiones del día — orden cronológico
const SESIONES_HOY = [
  {
    id: "s01",
    hora: "16:00",
    duracion: 60,
    alumno: {
      id: "a-martina",
      nombre: "Martina Cebrián",
      iniciales: "MC",
      curso: "5º Primaria",
      nivel: "primaria",
      familia: "Cebrián López",
    },
    historial: ["Fracciones equivalentes", "Comprensión lectora — El árbol generoso", "Verbos irregulares (past simple)"],
    racha: 4,
  },
  {
    id: "s02",
    hora: "16:00",
    duracion: 60,
    alumno: {
      id: "a-pablo",
      nombre: "Pablo Ruiz",
      iniciales: "PR",
      curso: "2º ESO",
      nivel: "eso",
      familia: "Ruiz Ortega",
    },
    historial: ["Ecuaciones de primer grado", "Análisis sintáctico — oración simple", "Reported speech"],
    racha: 7,
  },
  {
    id: "s03",
    hora: "17:00",
    duracion: 60,
    alumno: {
      id: "a-lucia",
      nombre: "Lucía Hernández",
      iniciales: "LH",
      curso: "1º Bachillerato",
      nivel: "bachillerato",
      familia: "Hernández Vidal",
      nota_previa: "Examen de Física el viernes — repasar cinemática",
    },
    historial: ["MRU y MRUA — problemas", "Tiro parabólico", "Derivadas — regla de la cadena"],
    racha: 12,
  },
  {
    id: "s04",
    hora: "17:00",
    duracion: 60,
    alumno: {
      id: "a-diego",
      nombre: "Diego Moreno",
      iniciales: "DM",
      curso: "6º Primaria",
      nivel: "primaria",
      familia: "Moreno Sanz",
    },
    historial: ["Decimales y porcentajes", "Tipos de palabras (sustantivo, adjetivo)", "Present continuous"],
    racha: 2,
  },
  {
    id: "s05",
    hora: "18:00",
    duracion: 90,
    alumno: {
      id: "a-claudia",
      nombre: "Claudia Sáez",
      iniciales: "CS",
      curso: "4º ESO",
      nivel: "eso",
      familia: "Sáez Romero",
    },
    historial: ["Funciones cuadráticas", "Comentario de texto — generación del 27", "Tabla periódica — grupos"],
    racha: 9,
  },
  {
    id: "s06",
    hora: "18:00",
    duracion: 90,
    alumno: {
      id: "a-mateo",
      nombre: "Mateo Galván",
      iniciales: "MG",
      curso: "3º ESO",
      nivel: "eso",
      familia: "Galván Ibáñez",
    },
    historial: ["Sistemas de ecuaciones", "Edad Media — feudalismo", "Mitosis y meiosis"],
    racha: 5,
  },
  {
    id: "s07",
    hora: "19:00",
    duracion: 60,
    alumno: {
      id: "a-elena",
      nombre: "Elena Prieto",
      iniciales: "EP",
      curso: "2º Bachillerato",
      nivel: "bachillerato",
      familia: "Prieto Núñez",
      nota_previa: "EvAU en junio — prioridad Selectividad",
    },
    historial: ["Integrales por partes", "Equilibrio químico", "Comentario filosófico — Nietzsche"],
    racha: 18,
  },
  {
    id: "s08",
    hora: "19:30",
    duracion: 60,
    alumno: {
      id: "a-nico",
      nombre: "Nico Vega",
      iniciales: "NV",
      curso: "1º ESO",
      nivel: "eso",
      familia: "Vega Marín",
    },
    historial: ["Números enteros — operaciones", "Sujeto y predicado", "Vocabulary — daily routines"],
    racha: 1,
  },
];

// Temas frecuentes globales para autocomplete (vendría de la tabla sesiones)
const TEMAS_FRECUENTES = [
  "Repaso examen",
  "Deberes del cole",
  "Comprensión lectora",
  "Problemas de aplicación",
  "Análisis sintáctico",
  "Reading comprehension",
  "Writing — formal email",
  "Ecuaciones",
  "Geometría — áreas y volúmenes",
  "Verbos irregulares",
];

// ─── Horario semanal ────────────────────────────────────────────
// Franjas de 30 min de 15:30 a 20:30. Cada celda lleva alumnos por día.
const FRANJAS = [
  "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// Cada alumno con nivel — sirve para colorear el chip
// nivel: primaria | eso | bachillerato
const HORARIO_SEMANAL = {
  // hora → { dia: [{ nombre, nivel, duracion (en franjas de 30min) }] }
  "15:30": {
    Lunes: [],
    Martes: [{ nombre: "Lola Vidal", nivel: "primaria" }],
    Miércoles: [],
    Jueves: [{ nombre: "Lola Vidal", nivel: "primaria" }],
    Viernes: [],
  },
  "16:00": {
    Lunes: [
      { nombre: "Martina Cebrián", nivel: "primaria" },
      { nombre: "Pablo Ruiz", nivel: "eso" },
    ],
    Martes: [
      { nombre: "Adrián Soto", nivel: "primaria" },
      { nombre: "Lola Vidal", nivel: "primaria", continuation: true },
    ],
    Miércoles: [
      { nombre: "Martina Cebrián", nivel: "primaria" },
      { nombre: "Pablo Ruiz", nivel: "eso" },
    ],
    Jueves: [
      { nombre: "Adrián Soto", nivel: "primaria" },
      { nombre: "Lola Vidal", nivel: "primaria", continuation: true },
    ],
    Viernes: [
      { nombre: "Martina Cebrián", nivel: "primaria" },
    ],
  },
  "16:30": {
    Lunes: [{ nombre: "Martina Cebrián", nivel: "primaria", continuation: true }, { nombre: "Pablo Ruiz", nivel: "eso", continuation: true }],
    Martes: [{ nombre: "Adrián Soto", nivel: "primaria", continuation: true }],
    Miércoles: [{ nombre: "Martina Cebrián", nivel: "primaria", continuation: true }, { nombre: "Pablo Ruiz", nivel: "eso", continuation: true }],
    Jueves: [{ nombre: "Adrián Soto", nivel: "primaria", continuation: true }],
    Viernes: [{ nombre: "Martina Cebrián", nivel: "primaria", continuation: true }],
  },
  "17:00": {
    Lunes: [
      { nombre: "Lucía Hernández", nivel: "bachillerato" },
      { nombre: "Diego Moreno", nivel: "primaria" },
    ],
    Martes: [
      { nombre: "Sofía Ortega", nivel: "eso" },
    ],
    Miércoles: [
      { nombre: "Lucía Hernández", nivel: "bachillerato" },
      { nombre: "Diego Moreno", nivel: "primaria" },
    ],
    Jueves: [
      { nombre: "Sofía Ortega", nivel: "eso" },
      { nombre: "Hugo Lara", nivel: "eso" },
    ],
    Viernes: [],
  },
  "17:30": {
    Lunes: [{ nombre: "Lucía Hernández", nivel: "bachillerato", continuation: true }, { nombre: "Diego Moreno", nivel: "primaria", continuation: true }],
    Martes: [{ nombre: "Sofía Ortega", nivel: "eso", continuation: true }],
    Miércoles: [{ nombre: "Lucía Hernández", nivel: "bachillerato", continuation: true }, { nombre: "Diego Moreno", nivel: "primaria", continuation: true }],
    Jueves: [{ nombre: "Sofía Ortega", nivel: "eso", continuation: true }, { nombre: "Hugo Lara", nivel: "eso", continuation: true }],
    Viernes: [],
  },
  "18:00": {
    Lunes: [
      { nombre: "Claudia Sáez", nivel: "eso" },
      { nombre: "Mateo Galván", nivel: "eso" },
    ],
    Martes: [
      { nombre: "Iván Bravo", nivel: "bachillerato" },
    ],
    Miércoles: [
      { nombre: "Claudia Sáez", nivel: "eso" },
      { nombre: "Mateo Galván", nivel: "eso" },
    ],
    Jueves: [
      { nombre: "Iván Bravo", nivel: "bachillerato" },
      { nombre: "Carla Domínguez", nivel: "eso" },
    ],
    Viernes: [
      { nombre: "Claudia Sáez", nivel: "eso" },
    ],
  },
  "18:30": {
    Lunes: [{ nombre: "Claudia Sáez", nivel: "eso", continuation: true }, { nombre: "Mateo Galván", nivel: "eso", continuation: true }],
    Martes: [{ nombre: "Iván Bravo", nivel: "bachillerato", continuation: true }],
    Miércoles: [{ nombre: "Claudia Sáez", nivel: "eso", continuation: true }, { nombre: "Mateo Galván", nivel: "eso", continuation: true }],
    Jueves: [{ nombre: "Iván Bravo", nivel: "bachillerato", continuation: true }, { nombre: "Carla Domínguez", nivel: "eso", continuation: true }],
    Viernes: [{ nombre: "Claudia Sáez", nivel: "eso", continuation: true }],
  },
  "19:00": {
    Lunes: [
      { nombre: "Claudia Sáez", nivel: "eso", continuation: true },
      { nombre: "Mateo Galván", nivel: "eso", continuation: true },
      { nombre: "Elena Prieto", nivel: "bachillerato" },
    ],
    Martes: [
      { nombre: "Marcos Ferrer", nivel: "bachillerato" },
    ],
    Miércoles: [
      { nombre: "Elena Prieto", nivel: "bachillerato" },
    ],
    Jueves: [
      { nombre: "Marcos Ferrer", nivel: "bachillerato" },
    ],
    Viernes: [
      { nombre: "Claudia Sáez", nivel: "eso", continuation: true },
    ],
  },
  "19:30": {
    Lunes: [
      { nombre: "Elena Prieto", nivel: "bachillerato", continuation: true },
      { nombre: "Nico Vega", nivel: "eso" },
    ],
    Martes: [{ nombre: "Marcos Ferrer", nivel: "bachillerato", continuation: true }],
    Miércoles: [{ nombre: "Elena Prieto", nivel: "bachillerato", continuation: true }],
    Jueves: [{ nombre: "Marcos Ferrer", nivel: "bachillerato", continuation: true }],
    Viernes: [],
  },
  "20:00": {
    Lunes: [{ nombre: "Nico Vega", nivel: "eso", continuation: true }],
    Martes: [],
    Miércoles: [],
    Jueves: [],
    Viernes: [],
  },
  "20:30": { Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [] },
};

// ─── Tarifas ────────────────────────────────────────────────────
const TARIFAS_INICIALES = {
  primaria:     { "1h": 40, "2h": 70,  "3h": 100, "4h": 125, "5h": 150 },
  eso:          { "1h": 45, "2h": 75,  "3h": 110, "4h": 140, "5h": 165 },
  bachillerato: { "1h": 50, "2h": 85,  "3h": 115, "4h": 150, "5h": 180 },
};
const TARIFA_FILAS = ["1h", "2h", "3h", "4h", "5h"];
const TARIFA_NIVELES = [
  { id: "primaria", label: "Primaria", sub: "1.º — 6.º" },
  { id: "eso", label: "ESO", sub: "1.º — 4.º" },
  { id: "bachillerato", label: "Bachillerato", sub: "1.º — 2.º" },
];

Object.assign(window, {
  HOY, FECHA_ISO, SESIONES_HOY, ASIGNATURAS_POR_NIVEL, TEMAS_FRECUENTES,
  FRANJAS, DIAS, HORARIO_SEMANAL,
  TARIFAS_INICIALES, TARIFA_FILAS, TARIFA_NIVELES,
});
