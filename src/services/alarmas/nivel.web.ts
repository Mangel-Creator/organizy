// Versión web de nivel.ts: el navegador no puede sonar con la web cerrada.

export type NivelAlarmas = 'nativo' | 'avisos' | 'web';

export type ModuloAlarmas = never;

export function moduloAlarmas(): null {
  return null;
}

export function nivelPosible(): NivelAlarmas {
  return 'web';
}
