// Tema de Organizy: todos los colores, letras y medidas salen de aquí.
// Si quieres cambiar un color, cámbialo en este archivo y se actualiza en toda la app.
// El porqué de cada decisión está en BRIEF.md (raíz del repositorio).

export const colores = {
  fondo: '#F4F1EA',
  tarjeta: '#FFFFFF',
  texto: '#1A1C24',
  textoSecundario: '#5E5A52',
  borde: '#DDD6C8', // separadores y cajas; decorativo
  bordeCampo: '#958D81', // borde de los campos de texto: se ve dónde escribir (3,3:1)

  // Tinta: la cabecera oscura de Hoy y lo que va dentro de ella.
  tinta: '#1A1C24',
  tintaSuave: '#2E313C', // tarjeta "Lo siguiente" dentro de la cabecera
  textoSobreTinta: '#FFFFFF',
  textoSecundarioSobreTinta: '#B9BCC8', // 6,8:1 sobre tintaSuave

  // Azul tinta: botones, "+", pestaña activa, interruptores y el día de hoy.
  principal: '#2B4BD8',
  textoSobrePrincipal: '#FFFFFF',

  // Granate: errores, avisos ("pisa tu bloque de foco") y días muy cargados.
  aviso: '#A1172F',

  // Colores por tipo de evento. Cada color significa una sola cosa:
  // el naranja es solo Clientes, el verde solo Amigos y el negro solo Yo.
  clientes: '#C4461E',
  amigos: '#16734F',
  yo: '#1A1C24',

  // Barrita de carga en Semana cuando el día va normal y borde de los huecos libres
  cargaNormal: '#8A8374',

  // Dorado: solo para la Época dorada (franja, bloques de estudio, días con hito).
  // Encima va texto oscuro (colores.texto): el blanco no se lee bien.
  dorado: '#B7892B',
} as const;

// Color de cada tipo de evento (Cliente, Amigos, Yo)
export const colorTipo = {
  cliente: colores.clientes,
  amigos: colores.amigos,
  yo: colores.yo,
} as const;

// Colores del tráfico: la única excepción a "cada color significa una sola cosa", y
// solo dentro del mapa (es el código que todo el mundo reconoce en la carretera).
export const coloresMapa = {
  atasco: '#D0312D', // rojo: tramo con atasco
  denso: '#F2B01E', // amarillo: tráfico denso
  ruta: '#2B4BD8', // la ruta elegida (el azul de "pulsar": se puede tocar)
  rutaAlternativa: '#8A8374', // las otras rutas, en gris
  radar: '#1A1C24', // círculo negro con borde blanco
  bordeRadar: '#FFFFFF',
} as const;

// Los mismos colores, más claros, para cuando van sobre la cabecera oscura
// (los normales no se distinguen sobre tintaSuave).
export const colorTipoSobreTinta = {
  cliente: '#F2956C',
  amigos: '#5CC495',
  yo: '#E4E6EC',
} as const;

// Casillas del panel de Hoy: cuadrado de fondo suave con el icono en el tono oscuro
// del mismo color (contraste de 6,3:1 o más). Mismo significado que colorTipo.
export const colorBaldosa = {
  cliente: { fondo: '#F7D9CC', icono: '#7A2A0A' },
  amigos: { fondo: '#D3EEDF', icono: '#0E5A3C' },
  yo: { fondo: '#E4E6EC', icono: '#1A1C24' },
  estudio: { fondo: '#F3E6C7', icono: '#6B4D0E' }, // Época dorada
  neutro: { fondo: '#F4F1EA', icono: '#1A1C24' }, // tareas, todo el día
} as const;

export const fuentes = {
  titulo: 'IBMPlexSans_600SemiBold',
  tituloFuerte: 'IBMPlexSans_700Bold',
  texto: 'IBMPlexSans_400Regular',
  textoMedio: 'IBMPlexSans_500Medium',
  textoFuerte: 'IBMPlexSans_600SemiBold',
  // Horas: letra de ancho fijo, como un reloj, para que las cifras queden alineadas.
  hora: 'IBMPlexMono_500Medium',
  horaFuerte: 'IBMPlexMono_600SemiBold',
} as const;

export const tamanos = {
  pequeno: 13,
  normal: 16,
  grande: 18,
  titulo: 22,
  tituloGrande: 30,
} as const;

export const espacio = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

// Esquinas más bien rectas: aspecto de agenda, no de burbuja.
export const radio = {
  pequeno: 6,
  normal: 8,
  grande: 10,
  chip: 999, // redondo del todo: interruptores, barras de progreso y de carga
} as const;

// Altura mínima de cualquier cosa que se pueda pulsar
export const alturaTactil = 44;

export const tema = { colores, colorTipo, colorTipoSobreTinta, fuentes, tamanos, espacio, radio, alturaTactil };
