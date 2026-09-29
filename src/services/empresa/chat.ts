import type { Anuncio, CanalChat, DatosEmpresa, MensajeChat, Miembro } from '@/data/empresa/tipos';
import { claveDia, fechaDesdeClave, formatearDiaCorto, sumarDias } from '@/services/fechas';

import { nombreDe, nombreEquipo, personasDe } from './roles';

// Chat de empresa y avisos de los superiores (fase 15b). Funciones puras, con pruebas.

export function otraPersona(datos: DatosEmpresa, canal: CanalChat): string | null {
  if (!canal.personas) return null;
  return canal.personas[0] === datos.yo ? canal.personas[1] : canal.personas[0];
}

// "General", "Cocina" o, en un privado, el nombre de la otra persona.
export function nombreCanal(datos: DatosEmpresa, canal: CanalChat): string {
  if (canal.tipo === 'general') return 'General';
  if (canal.tipo === 'equipo') return nombreEquipo(datos, canal.equipoId);
  const otra = otraPersona(datos, canal);
  const m = datos.miembros.find((x) => x.usuario === otra);
  return m ? nombreDe(m) : 'Alguien que ya no está';
}

// Primero General, luego los equipos (por nombre); los privados, los últimos arriba.
export function canalesDeGrupo(datos: DatosEmpresa): CanalChat[] {
  const general = datos.canales.filter((c) => c.tipo === 'general');
  const equipos = datos.canales
    .filter((c) => c.tipo === 'equipo')
    .sort((a, b) => nombreCanal(datos, a).localeCompare(nombreCanal(datos, b), 'es'));
  return [...general, ...equipos];
}

export function chatsPrivados(datos: DatosEmpresa): CanalChat[] {
  return datos.canales
    .filter((c) => c.tipo === 'privado')
    // Solo los que tienen algo, o con alguien que sigue en la empresa.
    .filter((c) => c.ultimo || datos.miembros.some((m) => m.usuario === otraPersona(datos, c)))
    .sort((a, b) => (b.ultimo?.el ?? '').localeCompare(a.ultimo?.el ?? ''));
}

export function totalSinLeer(datos: DatosEmpresa): number {
  return datos.canales.reduce((t, c) => t + c.sinLeer, 0);
}

// "Laura: nos vemos a las 9" / "Tú: vale"
export function vistaPrevia(datos: DatosEmpresa, canal: CanalChat): string {
  if (!canal.ultimo) return 'Aún no hay mensajes.';
  const quien = canal.ultimo.autor === datos.yo ? 'Tú' : nombreAutor(datos, canal.ultimo.autor);
  return canal.tipo === 'privado' && canal.ultimo.autor !== datos.yo ? canal.ultimo.texto : `${quien}: ${canal.ultimo.texto}`;
}

export function nombreAutor(datos: DatosEmpresa, autor: string | null): string {
  if (!autor) return 'Alguien que ya no está';
  const m = datos.miembros.find((x) => x.usuario === autor);
  return m ? nombreDe(m) : 'Alguien que ya no está';
}

// "Hoy", "Ayer" o "lun 5 oct"
export function textoDia(dia: string, hoy: string): string {
  if (dia === hoy) return 'Hoy';
  if (dia === sumarDias(hoy, -1)) return 'Ayer';
  return formatearDiaCorto(fechaDesdeClave(dia));
}

export type Burbuja = { mensaje: MensajeChat; primeroDelGrupo: boolean };
export type TramoDia = { dia: string; burbujas: Burbuja[] };

// Mensajes por días y, dentro, los seguidos de la misma persona (menos de 5 min) juntos:
// solo el primero lleva el nombre, como en Teams.
export function agruparMensajes(mensajes: MensajeChat[]): TramoDia[] {
  const tramos: TramoDia[] = [];
  let anterior: MensajeChat | null = null;
  for (const m of mensajes) {
    const dia = claveDia(new Date(m.creado));
    let tramo = tramos[tramos.length - 1];
    if (!tramo || tramo.dia !== dia) {
      tramo = { dia, burbujas: [] };
      tramos.push(tramo);
      anterior = null;
    }
    const seguido =
      anterior !== null &&
      anterior.autor === m.autor &&
      new Date(m.creado).getTime() - new Date(anterior.creado).getTime() < 5 * 60000;
    tramo.burbujas.push({ mensaje: m, primeroDelGrupo: !seguido });
    anterior = m;
  }
  return tramos;
}

// --- Avisos ---

export function heLeido(datos: DatosEmpresa, anuncio: Anuncio): boolean {
  return anuncio.autor === datos.yo || datos.anunciosLeidos.some((l) => l.anuncioId === anuncio.id && l.usuario === datos.yo);
}

export function anunciosSinLeer(datos: DatosEmpresa): Anuncio[] {
  return datos.anuncios.filter((a) => !heLeido(datos, a));
}

// Los importantes sin leer primero; luego, del más nuevo al más viejo.
export function ordenarAnuncios(datos: DatosEmpresa): Anuncio[] {
  return [...datos.anuncios].sort((a, b) => {
    const pa = a.importante && !heLeido(datos, a) ? 0 : 1;
    const pb = b.importante && !heLeido(datos, b) ? 0 : 1;
    return pa - pb || b.creado.localeCompare(a.creado);
  });
}

// A quién va y quién lo ha leído (sin contar a quien lo publicó).
export function lecturas(datos: DatosEmpresa, anuncio: Anuncio): { leido: Miembro[]; falta: Miembro[] } {
  const para = personasDe(datos, anuncio.equipoId).filter((m) => m.usuario !== anuncio.autor);
  const leyeron = new Set(datos.anunciosLeidos.filter((l) => l.anuncioId === anuncio.id).map((l) => l.usuario));
  return { leido: para.filter((m) => leyeron.has(m.usuario)), falta: para.filter((m) => !leyeron.has(m.usuario)) };
}
