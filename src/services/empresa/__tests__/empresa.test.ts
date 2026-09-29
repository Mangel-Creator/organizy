import { describe, expect, it } from '@jest/globals';

import { AVISOS_EMPRESA_POR_DEFECTO, type DatosEmpresa } from '@/data/empresa/tipos';
import type { Evento } from '@/data/eventos/tipos';

import { cruzaMedianoche, duracionTurno, eventosDeEmpresa, leerIdVirtual, paraQuien, todoElDiaDeEmpresa } from '../calendario';
import { bloquesOcupados, buscarHueco, franjasDe, resumenDia } from '../disponibilidad';
import { equiposQueLlevo, gestionoEquipo, papelDe, personasQueLlevo, soyAdmin } from '../roles';
import { enlaceInvitacion, esDominioPublico, leerCodigoInvitacion, leerCorreos } from '../textos';

const PEPE = 'u-pepe';
const LAURA = 'u-laura';
const JAVI = 'u-javi';

function datos(yo: string, cambios: Partial<DatosEmpresa> = {}): DatosEmpresa {
  return {
    yo,
    empresa: { id: 'e1', nombre: 'Bar Pepe', dominio: null, aprobarSolo: false },
    miembros: [
      { usuario: PEPE, nombre: 'Pepe', email: 'pepe@bar.es', rol: 'admin', estado: 'activo', via: 'creador', comparteOcupado: false, alta: '' },
      { usuario: LAURA, nombre: 'Laura', email: 'laura@bar.es', rol: 'empleado', estado: 'activo', via: 'dominio', comparteOcupado: false, alta: '' },
      { usuario: JAVI, nombre: '', email: 'javi@gmail.com', rol: 'empleado', estado: 'activo', via: 'lista', comparteOcupado: true, alta: '' },
    ],
    equipos: [
      { id: 'cocina', nombre: 'Cocina' },
      { id: 'sala', nombre: 'Sala' },
    ],
    enEquipos: [
      { equipoId: 'cocina', usuario: LAURA, responsable: true },
      { equipoId: 'cocina', usuario: JAVI, responsable: false },
    ],
    invitaciones: [],
    enlaces: [],
    eventos: [],
    respuestas: [],
    turnos: [],
    cambios: [],
    tareas: [],
    ocupados: [],
    avisos: AVISOS_EMPRESA_POR_DEFECTO,
    ...cambios,
  };
}

const HOY = '2026-10-05'; // lunes

describe('papeles', () => {
  it('sabe quién es administrador, responsable o empleado', () => {
    const d = datos(LAURA);
    expect(papelDe(d, PEPE)).toBe('admin');
    expect(papelDe(d, LAURA)).toBe('responsable');
    expect(papelDe(d, JAVI)).toBe('empleado');
    expect(soyAdmin(d)).toBe(false);
  });

  it('la responsable solo gestiona su equipo; el administrador, todo', () => {
    expect(equiposQueLlevo(datos(LAURA)).map((e) => e.id)).toEqual(['cocina']);
    expect(gestionoEquipo(datos(LAURA), 'sala')).toBe(false);
    expect(gestionoEquipo(datos(LAURA), null)).toBe(false);
    expect(gestionoEquipo(datos(PEPE), 'sala')).toBe(true);
    expect(personasQueLlevo(datos(LAURA)).map((m) => m.usuario).sort()).toEqual([JAVI, LAURA].sort());
    expect(equiposQueLlevo(datos(JAVI))).toEqual([]);
  });
});

describe('calendario de la empresa', () => {
  const d = datos(JAVI, {
    turnos: [
      { id: 't1', equipoId: 'cocina', usuario: JAVI, fecha: HOY, entrada: '09:00', salida: '17:00', sitio: '', coordenadas: null, notas: '' },
      { id: 't2', equipoId: 'cocina', usuario: JAVI, fecha: '2026-10-06', entrada: '19:00', salida: '01:00', sitio: 'Calle Mayor 3', coordenadas: null, notas: '' },
      { id: 't3', equipoId: 'cocina', usuario: LAURA, fecha: HOY, entrada: '09:00', salida: '17:00', sitio: '', coordenadas: null, notas: '' },
    ],
    eventos: [
      { id: 'ev1', equipoId: null, titulo: 'Reunión', clase: 'reunion', fecha: HOY, inicio: '18:00', fin: '19:00', lugar: '', coordenadas: null, notas: '', pideRespuesta: true, creadoPor: PEPE },
      { id: 'ev2', equipoId: null, titulo: 'Formación', clase: 'formacion', fecha: HOY, inicio: '20:00', fin: '21:00', lugar: '', coordenadas: null, notas: '', pideRespuesta: true, creadoPor: PEPE },
      { id: 'ev3', equipoId: null, titulo: 'Fiesta local', clase: 'festivo', fecha: HOY, inicio: null, fin: null, lugar: '', coordenadas: null, notas: '', pideRespuesta: false, creadoPor: PEPE },
    ],
    respuestas: [{ eventoId: 'ev2', usuario: JAVI, respuesta: 'no-voy' }],
    tareas: [
      { id: 'ta1', equipoId: 'cocina', usuario: JAVI, titulo: 'Inventario', notas: '', fechaLimite: '2026-10-09', cuadrante: 'hazlo', duracionMin: 30, hecha: false, hechaPor: null, hechaEl: null, creadoPor: LAURA },
      { id: 'ta2', equipoId: 'cocina', usuario: null, titulo: 'Limpiar cámara', notas: '', fechaLimite: '2026-10-01', cuadrante: null, duracionMin: 60, hecha: false, hechaPor: null, hechaEl: null, creadoPor: LAURA },
      { id: 'ta3', equipoId: 'sala', usuario: null, titulo: 'De Sala', notas: '', fechaLimite: HOY, cuadrante: null, duracionMin: 30, hecha: false, hechaPor: null, hechaEl: null, creadoPor: PEPE },
    ],
  });
  const eventos = eventosDeEmpresa(d, HOY, 'sitio-trabajo');
  const porId = (id: string) => eventos.find((e) => e.id === id) as Evento;

  it('mis turnos van al calendario (los de otros no), marcados como de empresa', () => {
    const turno = porId('emp-turno:t1');
    expect(turno).toMatchObject({ titulo: 'Turno en Cocina', horaInicio: '09:00', horaFin: '17:00', fecha: HOY, empresa: { clase: 'turno', id: 't1' } });
    // Sin sitio: en su sitio "Trabajo" (así cuenta para la hora de salida y las alarmas).
    expect(turno.lugar).toEqual({ tipo: 'sitio', sitioId: 'sitio-trabajo' });
    expect(eventos.some((e) => e.id === 'emp-turno:t3')).toBe(false);
  });

  it('un turno que acaba al día siguiente va en dos trozos', () => {
    expect(porId('emp-turno:t2')).toMatchObject({ fecha: '2026-10-06', horaInicio: '19:00', horaFin: '23:59' });
    expect(porId('emp-turno:t2').lugar).toEqual({ tipo: 'otro', direccion: 'Calle Mayor 3', coordenadas: null });
    expect(porId('emp-turno:t2:2')).toMatchObject({ fecha: '2026-10-07', horaInicio: '00:00', horaFin: '01:00', avisoMin: 0 });
    expect(cruzaMedianoche({ entrada: '19:00', salida: '01:00' })).toBe(true);
    expect(duracionTurno({ entrada: '19:00', salida: '01:00' })).toBe(360);
  });

  it('los eventos de empresa cuentan, salvo si he dicho "No voy"; los de todo el día van aparte', () => {
    expect(porId('emp-evento:ev1')).toMatchObject({ titulo: 'Reunión', horaInicio: '18:00' });
    expect(eventos.some((e) => e.id === 'emp-evento:ev2')).toBe(false);
    expect(eventos.some((e) => e.id === 'emp-evento:ev3')).toBe(false);
    expect(todoElDiaDeEmpresa(d, HOY).map((e) => e.titulo)).toEqual(['Fiesta local']);
  });

  it('mis tareas asignadas salen hoy como tareas; las atrasadas, con su fecha', () => {
    expect(porId('emp-tarea:ta1')).toMatchObject({ flexible: true, fecha: HOY, cuadrante: 'hazlo', duracionMin: 30 });
    expect(porId('emp-tarea:ta2')).toMatchObject({ flexible: true, fecha: '2026-10-01' });
    expect(eventos.some((e) => e.id === 'emp-tarea:ta3')).toBe(false);
    expect(eventosDeEmpresa(d, HOY, null, { tareas: false }).some((e) => e.flexible)).toBe(false);
    expect(paraQuien(d, d.tareas[0])).toBe('Para ti');
    expect(paraQuien(d, d.tareas[1])).toBe('Para Cocina');
  });

  it('lee sus ids', () => {
    expect(leerIdVirtual('emp-turno:t2:2')).toEqual({ clase: 'turno', id: 't2' });
    expect(leerIdVirtual('epoca-bloque:x')).toBeNull();
  });
});

describe('Ocupado compartido', () => {
  it('solo día y horas de mis eventos con hora, juntando los que se pisan', () => {
    const evento = (id: string, horaInicio: string, horaFin: string, extra: Partial<Evento> = {}): Evento => ({
      id, titulo: 'Médico', fecha: HOY, horaInicio, horaFin, tipo: 'yo', lugar: { tipo: 'casa' }, notas: 'privado',
      repeticion: 'nunca', flexible: false, duracionMin: null, hecha: false, foco: false, avisoMin: null, ejemplo: false, ...extra,
    });
    const bloques = bloquesOcupados(
      [
        evento('a', '10:00', '11:00'),
        evento('b', '10:30', '12:00'),
        evento('c', '18:00', '19:00', { empresa: { clase: 'evento', id: 'x' } }),
        evento('d', '09:00', '09:30', { flexible: true }),
      ],
      HOY,
      2,
    );
    expect(bloques).toEqual([{ d: HOY, i: 600, f: 720 }]);
    expect(Object.keys(bloques[0])).toEqual(['d', 'i', 'f']);
  });
});

describe('disponibilidad y "Buscar hueco"', () => {
  const d = datos(PEPE, {
    turnos: [
      { id: 't1', equipoId: 'cocina', usuario: LAURA, fecha: HOY, entrada: '09:00', salida: '15:00', sitio: '', coordenadas: null, notas: '' },
      { id: 't2', equipoId: 'cocina', usuario: JAVI, fecha: HOY, entrada: '11:00', salida: '17:00', sitio: '', coordenadas: null, notas: '' },
      { id: 't3', equipoId: 'cocina', usuario: JAVI, fecha: '2026-10-04', entrada: '20:00', salida: '02:00', sitio: '', coordenadas: null, notas: '' },
    ],
    eventos: [
      { id: 'ev1', equipoId: 'cocina', titulo: 'Proveedor', clase: 'reunion', fecha: HOY, inicio: '12:00', fin: '13:00', lugar: '', coordenadas: null, notas: '', pideRespuesta: false, creadoPor: PEPE },
      { id: 'ev2', equipoId: null, titulo: 'Cerrado', clase: 'cierre', fecha: '2026-10-06', inicio: null, fin: null, lugar: '', coordenadas: null, notas: '', pideRespuesta: false, creadoPor: PEPE },
    ],
    ocupados: [{ usuario: JAVI, bloques: [{ d: HOY, i: 13 * 60, f: 14 * 60 }], actualizado: '' }],
  });

  it('sabe cuándo está de turno u ocupado cada uno', () => {
    expect(franjasDe(d, JAVI, HOY)).toEqual([
      { inicio: 0, fin: 120, que: 'turno' }, // lo que queda del turno de anoche
      { inicio: 660, fin: 1020, que: 'turno' },
      { inicio: 720, fin: 780, que: 'ocupado' },
      { inicio: 780, fin: 840, que: 'ocupado' },
    ]);
    expect(resumenDia(d, PEPE, HOY)).toBe('libre');
    expect(resumenDia(d, LAURA, HOY)).toBe('turno');
  });

  const busqueda = {
    datos: d,
    personas: [LAURA, JAVI],
    desde: HOY,
    dias: 3,
    franja: { inicio: 9 * 60, fin: 19 * 60 },
    duracion: 60,
    diasSemana: [0, 1, 2, 3, 4],
    ahora: new Date(2026, 9, 5, 8, 0),
  };

  it('propone horas en las que nadie está ocupado, y se salta los días cerrados', () => {
    const huecos = buscarHueco({ ...busqueda, cuando: 'horario' });
    expect(huecos[0]).toEqual({ dia: HOY, inicio: 540, fin: 600 });
    expect(huecos.every((h) => h.dia !== '2026-10-06')).toBe(true);
    expect(huecos.some((h) => h.dia === HOY && h.inicio < 840 && h.fin > 720)).toBe(false);
  });

  it('con "cuando están todos de turno", solo cuando coinciden los dos', () => {
    const huecos = buscarHueco({ ...busqueda, cuando: 'turno' });
    expect(huecos.filter((h) => h.dia === HOY)).toEqual([
      { dia: HOY, inicio: 660, fin: 720 },
      { dia: HOY, inicio: 840, fin: 900 },
    ]);
  });

  it('hoy, solo desde ahora', () => {
    const huecos = buscarHueco({ ...busqueda, cuando: 'horario', ahora: new Date(2026, 9, 5, 15, 10) });
    expect(huecos[0].dia === HOY ? huecos[0].inicio : 9999).toBeGreaterThanOrEqual(930);
  });
});

describe('textos', () => {
  it('lee la lista de correos que pega el jefe', () => {
    expect(leerCorreos('Laura <Laura@Bar.es>, javi@gmail.com; javi@gmail.com\nhola@ ana@correo.com.')).toEqual({
      correos: ['laura@bar.es', 'javi@gmail.com', 'ana@correo.com'],
      malos: ['hola@'],
    });
  });

  it('no deja usar dominios gratuitos', () => {
    expect(esDominioPublico('Gmail.com')).toBe(true);
    expect(esDominioPublico('barpepe.es')).toBe(false);
  });

  it('lee el código del enlace o el código solo', () => {
    const codigo = '0123456789abcdef0123456789abcdef';
    expect(leerCodigoInvitacion(enlaceInvitacion(codigo))).toBe(codigo);
    expect(leerCodigoInvitacion(` ${codigo.toUpperCase()} `)).toBe(codigo);
    expect(leerCodigoInvitacion('https://mangel-creator.github.io/organizy/empresa')).toBeNull();
  });
});
