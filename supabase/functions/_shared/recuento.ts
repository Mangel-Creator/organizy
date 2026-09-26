// Recuento de votos de un plan (fase 8). Funciones puras, sin nada de Deno ni de la
// app: las usan la función "votar" (para el aviso "Laura ha votado…") y la app
// (src/services/planes/votos.ts, con pruebas). Así el aviso y la pantalla dicen lo mismo.

export type HoraVotable = { id: string; dia: string; hora: string }; // dia "AAAA-MM-DD", hora "HH:MM"
export type VotoInvitado = { nombre: string; horas: string[] }; // ids de las horas que le van bien
export type FilaRecuento = { hora: HoraVotable; votos: number; nombres: string[] };

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

// Ordena por día y hora.
export function ordenarHoras<T extends HoraVotable>(horas: T[]): T[] {
  return [...horas].sort((a, b) => (a.dia + a.hora).localeCompare(b.dia + b.hora));
}

// Votos de cada hora, en el orden de las horas (por día y hora).
export function contarVotos(horas: HoraVotable[], votos: VotoInvitado[]): FilaRecuento[] {
  return ordenarHoras(horas).map((hora) => {
    const nombres = votos.filter((v) => v.horas.includes(hora.id)).map((v) => v.nombre);
    return { hora, votos: nombres.length, nombres };
  });
}

// La hora o las horas con más votos (vacío si nadie ha votado).
export function ganadoras(filas: FilaRecuento[]): FilaRecuento[] {
  const maximo = Math.max(0, ...filas.map((f) => f.votos));
  if (maximo === 0) return [];
  return filas.filter((f) => f.votos === maximo);
}

// "2026-10-03" -> "vie 3"
export function diaCorto(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  return `${DIAS_CORTOS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d}`;
}

// "las 21:00", "la 01:30"; con "variosDias", "las 21:00 del vie 3".
export function etiquetaHora(hora: HoraVotable, variosDias: boolean): string {
  const articulo = hora.hora.startsWith('01:') ? 'la' : 'las';
  return `${articulo} ${hora.hora}${variosDias ? ` del ${diaCorto(hora.dia)}` : ''}`;
}

function unirConY(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

// "Ganan las 21:00 con 3 de 3." / "Empatan las 20:30 y las 21:00 con 2 de 3."
// "de N" son las personas invitadas o, si han votado más, las que han votado.
// null si todavía no ha votado nadie.
export function textoGanan(horas: HoraVotable[], votos: VotoInvitado[], personas: number): string | null {
  const filas = contarVotos(horas, votos);
  const primeras = ganadoras(filas);
  if (primeras.length === 0) return null;
  const variosDias = new Set(horas.map((h) => h.dia)).size > 1;
  const total = Math.max(personas, votos.length);
  const cuantos = `con ${primeras[0].votos} de ${total}`;
  if (primeras.length === 1) {
    const etiqueta = etiquetaHora(primeras[0].hora, variosDias);
    return `${etiqueta.startsWith('la ') ? 'Gana' : 'Ganan'} ${etiqueta} ${cuantos}.`;
  }
  return `Empatan ${unirConY(primeras.map((f) => etiquetaHora(f.hora, variosDias)))} ${cuantos}.`;
}

// Aviso al organizador: "Laura ha votado" / "Ganan las 21:00 con 3 de 3. ¿La cerramos?"
export function avisoVotoNuevo(
  nombre: string,
  horas: HoraVotable[],
  votos: VotoInvitado[],
  personas: number,
): { titulo: string; cuerpo: string } {
  const ganan = textoGanan(horas, votos, personas) ?? '';
  const unaSola = ganadoras(contarVotos(horas, votos)).length === 1;
  return { titulo: `${nombre} ha votado`, cuerpo: unaSola ? `${ganan} ¿La cerramos?` : ganan };
}

// Nombre "normalizado" para no contar dos veces a la misma persona:
// "  Laura  Gómez " y "laura gomez" son la misma.
export function claveNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
