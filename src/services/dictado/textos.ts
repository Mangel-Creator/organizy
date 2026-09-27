// Textos y cuentas del dictado por voz (fase 9), sin nada del móvil ni del navegador,
// para poder probarlos.

// Por qué no se ha podido dictar, ya traducido desde los códigos del móvil o del navegador.
export type FalloDictado =
  | 'sin-permiso' // el usuario ha dicho que no al micrófono
  | 'sin-voz' // no se ha oído nada
  | 'sin-conexion' // el reconocimiento necesita internet y no hay
  | 'no-disponible' // este móvil o navegador no sabe reconocer voz en español
  | 'ocupado' // el micrófono lo está usando otra cosa (una llamada, Siri...)
  | 'parado' // lo ha parado el propio usuario antes de decir nada
  | 'otro';

// Códigos de expo-speech-recognition y de la Web Speech API (son casi los mismos).
export function falloDesdeCodigo(codigo: string): FalloDictado {
  switch (codigo) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'sin-permiso';
    case 'no-speech':
    case 'speech-timeout':
      return 'sin-voz';
    case 'network':
      return 'sin-conexion';
    case 'language-not-supported':
    case 'bad-grammar':
      return 'no-disponible';
    case 'audio-capture':
    case 'interrupted':
    case 'busy':
      return 'ocupado';
    case 'aborted':
      return 'parado';
    default:
      return 'otro';
  }
}

// Frase corta para enseñar debajo del campo. null: no hace falta decir nada.
export function mensajeFallo(fallo: FalloDictado, web: boolean): string | null {
  switch (fallo) {
    case 'sin-permiso':
      return web
        ? 'El navegador no me deja usar el micro. En el iPhone: Ajustes > Apps > Safari > Micrófono.'
        : 'No tengo permiso para usar el micro.';
    case 'sin-voz':
      return 'No te he oído. Toca el micro y prueba otra vez.';
    case 'sin-conexion':
      return 'Para entenderte necesito internet. Mejor escríbelo.';
    case 'no-disponible':
      return 'Aquí no puedo entenderte por voz. Mejor escríbelo.';
    case 'ocupado':
      return 'El micro está ocupado. Prueba en un momento.';
    case 'parado':
      return null;
    default:
      return 'No he podido escucharte. Prueba otra vez o escríbelo.';
  }
}

// Lo que llega del reconocimiento, listo para el campo: sin espacios de más.
export function limpiarDictado(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}
