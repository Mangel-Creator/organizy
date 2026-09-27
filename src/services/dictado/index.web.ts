import type { EstadoPermiso } from '@/services/permisos';

import { falloDesdeCodigo, limpiarDictado, type FalloDictado } from './textos';
import type { Escucha } from './tipos';

// Dictado por voz en la web (fase 9), con el reconocimiento del navegador (Web Speech
// API). Funciona en Safari del iPhone y del Mac y en Chrome; en Firefox no, y
// entonces el micro no se enseña. Safari manda la voz a Apple y Chrome a Google para
// pasarla a texto; nosotros solo recibimos el texto.

export type { FalloDictado } from './textos';
export { mensajeFallo } from './textos';
export type { Escucha } from './tipos';

type ResultadoWeb = { isFinal: boolean; 0?: { transcript: string } };
type EventoResultado = { results: { length: number; [i: number]: ResultadoWeb } };
type EventoError = { error: string };

type ReconocedorWeb = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((evento: EventoResultado) => void) | null;
  onerror: ((evento: EventoError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type ClaseReconocedor = new () => ReconocedorWeb;

function claseReconocedor(): ClaseReconocedor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: ClaseReconocedor; webkitSpeechRecognition?: ClaseReconocedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function dictadoDisponible(): boolean {
  return claseReconocedor() !== null;
}

// El navegador pregunta él solo al empezar a escuchar. Aquí solo se mira si ya ha
// dicho que no (Safari y Chrome lo cuentan; si no se sabe, "sin preguntar").
export async function consultarPermisoDictado(): Promise<EstadoPermiso> {
  if (!dictadoDisponible()) return 'no-disponible';
  try {
    const estado = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (estado.state === 'granted') return 'concedido';
    if (estado.state === 'denied') return 'bloqueado';
  } catch {
    // Este navegador no deja consultarlo.
  }
  return 'sin-preguntar';
}

export async function pedirPermisoDictado(): Promise<EstadoPermiso> {
  // No hay forma de pedirlo aparte: lo pregunta el navegador al empezar a escuchar.
  return dictadoDisponible() ? 'sin-preguntar' : 'no-disponible';
}

// Si el navegador se queda escuchando sin terminar (a Safari le pasa), se corta aquí.
const MAX_ESCUCHA_MS = 20_000;

let cortarAnterior: (() => void) | null = null;

export function empezarDictado(escucha: Escucha): () => void {
  const Clase = claseReconocedor();
  if (!Clase) {
    escucha.alFallar('no-disponible');
    return () => {};
  }
  cortarAnterior?.();

  const reconocedor = new Clase();
  reconocedor.lang = 'es-ES';
  reconocedor.interimResults = true;
  reconocedor.continuous = false;
  reconocedor.maxAlternatives = 1;

  let oido = '';
  let fallo: FalloDictado | null = null;
  let terminado = false;

  const acabar = () => {
    if (terminado) return;
    terminado = true;
    clearTimeout(limite);
    reconocedor.onresult = null;
    reconocedor.onerror = null;
    reconocedor.onend = null;
    if (cortarAnterior === cortar) cortarAnterior = null;
    if (oido) escucha.alTerminar(oido);
    else escucha.alFallar(fallo ?? 'sin-voz');
  };

  reconocedor.onresult = (evento) => {
    let texto = '';
    for (let i = 0; i < evento.results.length; i++) texto += evento.results[i][0]?.transcript ?? '';
    texto = limpiarDictado(texto);
    if (!texto) return;
    oido = texto;
    escucha.alOir(texto);
  };
  reconocedor.onerror = (evento) => {
    fallo = falloDesdeCodigo(evento.error);
  };
  reconocedor.onend = acabar;

  const parar = () => {
    try {
      reconocedor.stop();
    } catch {
      acabar();
    }
  };
  const limite = setTimeout(parar, MAX_ESCUCHA_MS);

  const cortar = () => {
    oido = '';
    fallo = 'parado';
    try {
      reconocedor.abort();
    } catch {
      // ya estaba parado
    }
    acabar();
  };
  cortarAnterior = cortar;

  try {
    reconocedor.start();
  } catch {
    fallo = 'otro';
    acabar();
  }

  return () => {
    if (!terminado) parar();
  };
}

export function cancelarDictado(): void {
  cortarAnterior?.();
}
