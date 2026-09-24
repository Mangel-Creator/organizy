// Tema de Organizy: todos los colores, letras y medidas salen de aquí.
// Si quieres cambiar un color, cámbialo en este archivo y se actualiza en toda la app.

export const colores = {
  fondo: '#F4F1EA',
  tarjeta: '#FFFFFF',
  texto: '#1A1C24',
  textoSecundario: '#5E5A52',
  borde: '#DDD6C8',

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
} as const;

// Color de cada tipo de evento (Cliente, Amigos, Yo)
export const colorTipo = {
  cliente: colores.clientes,
  amigos: colores.amigos,
  yo: colores.yo,
} as const;

export const fuentes = {
  titulo: 'Fraunces_600SemiBold',
  tituloFuerte: 'Fraunces_700Bold',
  texto: 'DMSans_400Regular',
  textoMedio: 'DMSans_500Medium',
  textoFuerte: 'DMSans_700Bold',
} as const;

export const tamanos = {
  pequeno: 13,
  normal: 16,
  grande: 18,
  titulo: 26,
  tituloGrande: 34,
} as const;

export const espacio = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radio = {
  pequeno: 14,
  normal: 16,
  grande: 18,
  chip: 999,
} as const;

// Altura mínima de cualquier cosa que se pueda pulsar
export const alturaTactil = 44;

export const tema = { colores, colorTipo, fuentes, tamanos, espacio, radio, alturaTactil };
