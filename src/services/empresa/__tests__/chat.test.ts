import { describe, expect, it } from '@jest/globals';

import { AVISOS_EMPRESA_POR_DEFECTO, type DatosEmpresa, type MensajeChat } from '@/data/empresa/tipos';

import {
  agruparMensajes,
  anunciosSinLeer,
  canalesDeGrupo,
  chatsPrivados,
  lecturas,
  nombreCanal,
  ordenarAnuncios,
  textoDia,
  totalSinLeer,
  vistaPrevia,
} from '../chat';

const PEPE = 'u-pepe';
const LAURA = 'u-laura';
const JAVI = 'u-javi';

function datos(yo: string): DatosEmpresa {
  const m = (usuario: string, nombre: string, rol: 'admin' | 'empleado') => ({
    usuario, nombre, email: `${nombre.toLowerCase()}@bar.es`, rol, estado: 'activo' as const, via: 'lista' as const, comparteOcupado: false, alta: '',
  });
  return {
    yo,
    empresa: { id: 'e1', nombre: 'Bar Pepe', dominio: null, aprobarSolo: false },
    miembros: [m(PEPE, 'Pepe', 'admin'), m(LAURA, 'Laura', 'empleado'), m(JAVI, 'Javi', 'empleado')],
    equipos: [{ id: 'sala', nombre: 'Sala' }, { id: 'cocina', nombre: 'Cocina' }],
    enEquipos: [
      { equipoId: 'cocina', usuario: LAURA, responsable: true },
      { equipoId: 'cocina', usuario: JAVI, responsable: false },
    ],
    invitaciones: [], enlaces: [], eventos: [], respuestas: [], turnos: [], cambios: [], tareas: [], ocupados: [],
    avisos: AVISOS_EMPRESA_POR_DEFECTO,
    canales: [
      { id: 'c-sala', tipo: 'equipo', equipoId: 'sala', personas: null, sinLeer: 0, ultimo: null },
      { id: 'c-privado', tipo: 'privado', equipoId: null, personas: [JAVI, LAURA], sinLeer: 2, ultimo: { texto: '¿Me cambias el turno?', autor: JAVI, el: '2026-10-05T10:00:00Z' } },
      { id: 'c-cocina', tipo: 'equipo', equipoId: 'cocina', personas: null, sinLeer: 1, ultimo: { texto: 'Falta harina', autor: LAURA, el: '2026-10-05T09:00:00Z' } },
      { id: 'c-general', tipo: 'general', equipoId: null, personas: null, sinLeer: 3, ultimo: { texto: 'Buenos días', autor: PEPE, el: '2026-10-04T08:00:00Z' } },
    ],
    anuncios: [
      { id: 'a1', equipoId: null, autor: PEPE, titulo: 'Nuevo horario', texto: '', importante: false, creado: '2026-10-05T08:00:00Z' },
      { id: 'a2', equipoId: null, autor: PEPE, titulo: 'Cerramos el lunes', texto: '', importante: true, creado: '2026-10-01T08:00:00Z' },
      { id: 'a3', equipoId: 'cocina', autor: LAURA, titulo: 'Limpieza de cámara', texto: '', importante: false, creado: '2026-10-03T08:00:00Z' },
    ],
    anunciosLeidos: [{ anuncioId: 'a1', usuario: JAVI, el: '' }],
  };
}

describe('canales', () => {
  it('General primero, luego los equipos por nombre; los privados, aparte', () => {
    const d = datos(LAURA);
    expect(canalesDeGrupo(d).map((c) => nombreCanal(d, c))).toEqual(['General', 'Cocina', 'Sala']);
    expect(chatsPrivados(d).map((c) => nombreCanal(d, c))).toEqual(['Javi']);
    expect(nombreCanal(datos(JAVI), d.canales[1])).toBe('Laura');
    expect(totalSinLeer(d)).toBe(6);
  });

  it('la vista previa dice quién lo escribió (en los privados, solo el texto)', () => {
    const d = datos(LAURA);
    expect(vistaPrevia(d, d.canales[2])).toBe('Tú: Falta harina');
    expect(vistaPrevia(d, d.canales[3])).toBe('Pepe: Buenos días');
    expect(vistaPrevia(d, d.canales[1])).toBe('¿Me cambias el turno?');
    expect(vistaPrevia(d, d.canales[0])).toBe('Aún no hay mensajes.');
  });
});

describe('mensajes', () => {
  const m = (id: string, autor: string, creado: string): MensajeChat => ({ id, canalId: 'c', autor, texto: id, borrado: false, creado });

  it('los junta por días y, seguidos de la misma persona, sin repetir el nombre', () => {
    const tramos = agruparMensajes([
      m('1', PEPE, new Date(2026, 9, 4, 20, 0).toISOString()),
      m('2', PEPE, new Date(2026, 9, 5, 9, 0).toISOString()),
      m('3', PEPE, new Date(2026, 9, 5, 9, 2).toISOString()),
      m('4', LAURA, new Date(2026, 9, 5, 9, 3).toISOString()),
      m('5', LAURA, new Date(2026, 9, 5, 9, 30).toISOString()),
    ]);
    expect(tramos.map((t) => t.dia)).toEqual(['2026-10-04', '2026-10-05']);
    expect(tramos[1].burbujas.map((b) => b.primeroDelGrupo)).toEqual([true, false, true, true]);
    expect(textoDia('2026-10-05', '2026-10-05')).toBe('Hoy');
    expect(textoDia('2026-10-04', '2026-10-05')).toBe('Ayer');
  });
});

describe('avisos', () => {
  it('los importantes sin leer, arriba; lo que publico yo no cuenta como sin leer', () => {
    const d = datos(JAVI);
    expect(ordenarAnuncios(d).map((a) => a.id)).toEqual(['a2', 'a1', 'a3']);
    expect(anunciosSinLeer(d).map((a) => a.id)).toEqual(['a2', 'a3']);
    expect(anunciosSinLeer(datos(PEPE)).map((a) => a.id)).toEqual(['a3']);
  });

  it('quien lo publica ve quién lo ha leído y a quién le falta', () => {
    const d = datos(PEPE);
    const { leido, falta } = lecturas(d, d.anuncios[0]);
    expect(leido.map((x) => x.nombre)).toEqual(['Javi']);
    expect(falta.map((x) => x.nombre)).toEqual(['Laura']);
    // El de Cocina solo va a Cocina (y no cuenta a Laura, que lo publicó).
    expect(lecturas(d, d.anuncios[2]).falta.map((x) => x.nombre)).toEqual(['Javi']);
  });
});
