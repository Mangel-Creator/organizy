import { describe, expect, it } from '@jest/globals';

import type { Epoca, RegistroBloque } from '@/data/epocas/tipos';
import type { Evento } from '@/data/eventos/tipos';
import {
  copiaAntigua,
  cuandoFueLaCopia,
  FORMATO_COPIA,
  leerCopia,
  montarCopia,
  nombreArchivoCopia,
  resumenCopia,
  viajaEnLaCopia,
} from '@/services/copia/formato';

const evento = (id: string, cambios: Partial<Evento> = {}): Evento => ({
  id,
  titulo: 'Reunión',
  fecha: '2026-09-28',
  horaInicio: '10:00',
  horaFin: '11:00',
  tipo: 'cliente',
  lugar: null,
  notas: '',
  repeticion: 'nunca',
  flexible: false,
  duracionMin: null,
  hecha: false,
  foco: false,
  avisoMin: null,
  ejemplo: false,
  cliente: { nombre: 'Laura', telefono: '612345678', acepta: true },
  ...cambios,
});

const epoca = (id: string, ejemplo = false) =>
  ({
    id,
    nombre: 'Exámenes',
    tipo: 'examenes',
    inicio: '2026-10-01',
    fin: '2026-10-31',
    ritmo: {},
    avisos: {},
    hitos: [],
    ejemplo,
    resumenVisto: false,
  }) as unknown as Epoca;

const bloque = (id: string, epocaId: string): RegistroBloque => ({
  id,
  epocaId,
  hitoId: 'h1',
  dia: '2026-10-02',
  inicio: 600,
  fin: 650,
  estado: 'hecho',
});

const ahora = new Date(2026, 8, 27, 18, 5);

const datos = {
  eventos: [evento('a'), evento('b', { ejemplo: true })],
  epocas: [epoca('e1'), epoca('e2', true)],
  registroBloques: [bloque('r1', 'e1'), bloque('r2', 'e2')],
  ajustes: {
    perfil: { nombre: 'Miguel' },
    alarmas: { alarmas: [{ id: 'x' }, { id: 'y' }], ajustes: {} },
    planes: [{ id: 'p1', estado: 'abierto' }, { id: 'p2', estado: 'cerrado' }],
    'energia:2026-09-27': 'a-tope',
    salidas: { a: {} },
    alarmasNativas: { programadas: {} },
    ultimaCopia: '2026-09-01T10:00:00.000Z',
    eventos: [],
  },
};

describe('montarCopia', () => {
  const copia = montarCopia(datos, ahora);

  it('lleva los datos de la persona, sin ejemplos', () => {
    expect(copia.app).toBe('organizy');
    expect(copia.formato).toBe(FORMATO_COPIA);
    expect(copia.creadaEl).toBe(ahora.toISOString());
    expect(copia.eventos.map((e) => e.id)).toEqual(['a']);
    expect(copia.epocas.map((e) => e.id)).toEqual(['e1']);
    expect(copia.registroBloques.map((r) => r.id)).toEqual(['r1']);
  });

  it('no lleva lo calculado ni lo de este dispositivo', () => {
    expect(Object.keys(copia.ajustes).sort()).toEqual(['alarmas', 'energia:2026-09-27', 'perfil', 'planes']);
    expect(viajaEnLaCopia('perfil')).toBe(true);
    expect(viajaEnLaCopia('una-clave-nueva')).toBe(true);
    expect(viajaEnLaCopia('alarmasNativas')).toBe(false);
  });
});

describe('leerCopia', () => {
  const texto = JSON.stringify(montarCopia(datos, ahora));

  it('lee lo que escribe montarCopia', () => {
    const lectura = leerCopia(texto);
    expect(lectura.ok).toBe(true);
    if (!lectura.ok) return;
    expect(lectura.copia.eventos[0].cliente?.nombre).toBe('Laura');
    expect(lectura.copia.ajustes.perfil).toEqual({ nombre: 'Miguel' });
  });

  it('arregla eventos antiguos (lugar viejo y campos que faltan)', () => {
    const viejo: Record<string, unknown> = { ...evento('v'), lugar: { nombre: 'Bar', direccion: 'Calle 1' } };
    delete viejo.avisoMin;
    delete viejo.cliente;
    const lectura = leerCopia(JSON.stringify({ ...JSON.parse(texto), eventos: [viejo] }));
    expect(lectura.ok).toBe(true);
    if (!lectura.ok) return;
    expect(lectura.copia.eventos[0]).toMatchObject({
      lugar: { tipo: 'otro', direccion: 'Calle 1', coordenadas: null },
      avisoMin: null,
      cliente: null,
    });
  });

  it('rechaza lo que no es una copia o está dañado', () => {
    expect(leerCopia('hola').ok).toBe(false);
    expect(leerCopia('{"app":"otra","formato":1}').ok).toBe(false);
    expect(leerCopia(texto.slice(0, 50)).ok).toBe(false);
    const sinFecha = { ...JSON.parse(texto), eventos: [{ ...evento('z'), fecha: 'mañana' }] };
    expect(leerCopia(JSON.stringify(sinFecha)).ok).toBe(false);
    const sinAjustes = { ...JSON.parse(texto), ajustes: [] };
    expect(leerCopia(JSON.stringify(sinAjustes)).ok).toBe(false);
  });

  it('avisa si la copia es de una versión más nueva', () => {
    const lectura = leerCopia(JSON.stringify({ ...JSON.parse(texto), formato: FORMATO_COPIA + 1 }));
    expect(lectura).toEqual({ ok: false, error: expect.stringContaining('más nueva') });
  });

  it('no deja colar ajustes de este dispositivo', () => {
    const conNativas = { ...JSON.parse(texto), ajustes: { alarmasNativas: {}, perfil: {} } };
    const lectura = leerCopia(JSON.stringify(conNativas));
    expect(lectura.ok && Object.keys(lectura.copia.ajustes)).toEqual(['perfil']);
  });
});

describe('textos', () => {
  it('resume lo que hay en la copia', () => {
    const resumen = resumenCopia(montarCopia(datos, ahora));
    expect(resumen.nombre).toBe('Miguel');
    expect(resumen.creada).toBe('domingo, 27 de septiembre de 2026 a las 18:05');
    expect(resumen.lineas).toEqual(['1 evento o tarea', '1 época dorada', '2 alarmas', '2 planes']);
    expect(resumen.planesAbiertos).toBe(1);
  });

  it('en el resumen no salen las cosas que no lleva', () => {
    const soloPerfil = montarCopia({ eventos: [], epocas: [], registroBloques: [], ajustes: { perfil: {} } }, ahora);
    expect(resumenCopia(soloPerfil).lineas).toEqual([
      'Tu perfil y tus ajustes (no hay eventos, alarmas ni planes)',
    ]);
    const conEventos = { ...soloPerfil, eventos: [evento('a')] };
    expect(resumenCopia(conEventos).lineas).toEqual(['1 evento o tarea']);
  });

  it('nombre del archivo y cuándo fue', () => {
    expect(nombreArchivoCopia(ahora)).toBe('organizy-copia-2026-09-27.json');
    expect(cuandoFueLaCopia(new Date(2026, 8, 27, 9, 30).toISOString(), ahora)).toBe('Hoy a las 09:30');
    expect(cuandoFueLaCopia(new Date(2026, 8, 26, 23, 0).toISOString(), ahora)).toBe('Ayer a las 23:00');
    expect(cuandoFueLaCopia(new Date(2026, 8, 15, 12, 0).toISOString(), ahora)).toBe('Hace 12 días');
    expect(cuandoFueLaCopia(new Date(2026, 7, 3, 12, 0).toISOString(), ahora)).toBe('El 3 de agosto');
  });

  it('pasado un mes sin copia, toca hacer otra', () => {
    expect(copiaAntigua(null, ahora)).toBe(true);
    expect(copiaAntigua(new Date(2026, 8, 1).toISOString(), ahora)).toBe(false);
    expect(copiaAntigua(new Date(2026, 7, 20).toISOString(), ahora)).toBe(true);
  });
});
