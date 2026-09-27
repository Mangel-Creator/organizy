import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

import type { EstadoPermiso } from '@/services/permisos';

import { falloDesdeCodigo, limpiarDictado, type FalloDictado } from './textos';
import type { Escucha } from './tipos';

// Dictado por voz en el móvil (fase 9): pasa a texto lo que dices, en español de
// España, con el reconocimiento del propio sistema (el de Siri en el iPhone y el de
// Google en Android), usando expo-speech-recognition. En la web: index.web.ts.
//
// Solo funciona en la app propia: Expo Go no trae este módulo. Por eso no se importa
// la librería directamente (al importarla fallaría) sino con
// requireOptionalNativeModule, que en Expo Go devuelve null y el micro no se enseña.

export type { FalloDictado } from './textos';
export { mensajeFallo } from './textos';
export type { Escucha } from './tipos';

type Modulo = typeof ExpoSpeechRecognitionModule;

let modulo: Modulo | null | undefined;

function moduloDictado(): Modulo | null {
  if (modulo === undefined) {
    try {
      modulo = requireOptionalNativeModule<Modulo>('ExpoSpeechRecognition');
    } catch {
      modulo = null;
    }
  }
  return modulo;
}

export function dictadoDisponible(): boolean {
  const m = moduloDictado();
  if (!m) return false;
  try {
    return m.isRecognitionAvailable();
  } catch {
    return false;
  }
}

type Respuesta = { granted: boolean; status: string; canAskAgain: boolean };

function traducir(respuesta: Respuesta): EstadoPermiso {
  if (respuesta.granted) return 'concedido';
  if (respuesta.status === 'undetermined') return 'sin-preguntar';
  return respuesta.canAskAgain ? 'denegado' : 'bloqueado';
}

// Micrófono y reconocimiento de voz van juntos (en el iPhone son dos permisos).
export async function consultarPermisoDictado(): Promise<EstadoPermiso> {
  const m = moduloDictado();
  if (!m) return 'no-disponible';
  try {
    return traducir(await m.getPermissionsAsync());
  } catch {
    return 'no-disponible';
  }
}

export async function pedirPermisoDictado(): Promise<EstadoPermiso> {
  const m = moduloDictado();
  if (!m) return 'no-disponible';
  try {
    return traducir(await m.requestPermissionsAsync());
  } catch {
    return 'no-disponible';
  }
}

// Solo se escucha una vez a la vez: empezar otra corta la anterior.
let cortarAnterior: (() => void) | null = null;

// Empieza a escuchar. Devuelve una función para terminar: lo oído hasta entonces
// se da por bueno (alTerminar). Para cortar sin usar nada, cancelarDictado().
export function empezarDictado(escucha: Escucha): () => void {
  const m = moduloDictado();
  if (!m) {
    escucha.alFallar('no-disponible');
    return () => {};
  }
  cortarAnterior?.();

  let oido = '';
  let fallo: FalloDictado | null = null;
  let terminado = false;

  const acabar = () => {
    if (terminado) return;
    terminado = true;
    for (const s of suscripciones) s.remove();
    if (cortarAnterior === cortar) cortarAnterior = null;
    if (oido) escucha.alTerminar(oido);
    else escucha.alFallar(fallo ?? 'sin-voz');
  };

  const suscripciones = [
    m.addListener('result', (evento) => {
      const texto = limpiarDictado(evento.results[0]?.transcript ?? '');
      if (!texto) return;
      oido = texto;
      escucha.alOir(texto);
    }),
    m.addListener('error', (evento) => {
      fallo = falloDesdeCodigo(evento.error);
      acabar();
    }),
    m.addListener('end', acabar),
  ];

  const cortar = () => {
    oido = '';
    fallo = 'parado';
    try {
      m.abort();
    } catch {
      // ya estaba parado
    }
    acabar();
  };
  cortarAnterior = cortar;

  try {
    m.start({
      lang: 'es-ES',
      interimResults: true,
      // Una frase y listo: termina solo cuando dejas de hablar.
      continuous: false,
      addsPunctuation: false,
    });
  } catch {
    fallo = 'otro';
    acabar();
  }

  return () => {
    if (terminado) return;
    try {
      m.stop();
    } catch {
      acabar();
    }
  };
}

export function cancelarDictado(): void {
  cortarAnterior?.();
}
