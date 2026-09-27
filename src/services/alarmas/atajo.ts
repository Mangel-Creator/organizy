import { Platform } from 'react-native';

// En la web no hay alarmas: cada una se puede crear en el Reloj del iPhone con un
// Atajo (app Atajos) que la persona crea una vez. La web lo lanza con el enlace
// oficial de Apple "shortcuts://run-shortcut?name=...&input=text&text=...", pasándole
// "07:30|Despertador". El Atajo parte el texto por "|" y crea la alarma.
// Los días de repetición no se pueden pasar: se ponen luego en el Reloj.

export const NOMBRE_ATAJO = 'Organizy alarma';

export function textoParaAtajo(hora: string, etiqueta: string): string {
  // "|" separa hora y etiqueta: si la etiqueta lo lleva, se cambia por un guion.
  return `${hora}|${(etiqueta.trim() || 'Alarma').replace(/\|/g, '-')}`;
}

export function enlaceAtajo(hora: string, etiqueta: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(NOMBRE_ATAJO)}&input=text&text=${encodeURIComponent(
    textoParaAtajo(hora, etiqueta),
  )}`;
}

// La web abierta en un iPhone o iPad (donde existe la app Atajos).
export function esWebDeIphone(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

// Cómo crear el Atajo, una sola vez.
export const PASOS_ATAJO = [
  'Abre la app Atajos y toca el "+" de arriba a la derecha.',
  `Toca el nombre de arriba y llámalo exactamente: ${NOMBRE_ATAJO}`,
  'Busca la acción "Dividir texto". Donde pone texto, elige "Entrada del atajo"; en separador, "Personalizado" y escribe |',
  'Añade "Obtener elemento de la lista" con "Primer elemento" (es la hora).',
  'Añade otra vez "Obtener elemento de la lista", ahora con "Último elemento" y la lista de "Dividir texto" (es el nombre).',
  'Añade "Crear alarma". En la hora elige el primer elemento y en la etiqueta, el último.',
  'Toca "OK". Ya está: desde aquí, "Crear en el Reloj" te abre Atajos y crea la alarma.',
] as const;
