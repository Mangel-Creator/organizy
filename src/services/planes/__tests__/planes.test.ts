import { describe, expect, it } from '@jest/globals';

import type { AjustesAvisos } from '@/data/avisos';
import type { Evento } from '@/data/eventos/tipos';
import type { Perfil } from '@/data/perfil';
import type { Plan } from '@/data/planes';
import { avisosDePlanes } from '@/services/avisos/planes';
import { planificarAvisos } from '@/services/avisos/planificar';
import { eventoDelPlan, horaFinDe } from '@/services/planes/evento';
import {
  URL_VOTACION,
  enlaceVotacion,
  enlaceWhatsapp,
  textoConfirmacion,
  textoInvitacion,
  textoRecordatorio,
} from '@/services/planes/mensajes';
import { horaParaHueco, huecosParaPlan, sugerirHoras } from '@/services/planes/sugerencias';
import { codigoDeLaDireccion } from '@/services/planes/votacion';
import {
  avisoVotoNuevo,
  claveNombre,
  contarVotos,
  ganadoras,
  situacionPlan,
  textoGanan,
  votosNuevos,
} from '@/services/planes/votos';

const perfil: Perfil = {
  nombre: 'Miguel',
  vivienda: { direccion: 'Zaragoza', coordenadas: null },
  sitios: [],
  transporte: 'coche',
  uso: 'ambos',
  horario: {
    levantarse: '07:30',
    acostarse: '23:30',
    empiezoTrabajo: '09:00',
    terminoTrabajo: '18:00',
    diasTrabajo: [0, 1, 2, 3, 4],
  },
  rindeMas: 'manana',
  antelacionAvisoMin: 30,
};

function evento(parcial: Partial<Evento>): Evento {
  return {
    id: Math.random().toString(36).slice(2),
    titulo: 'Evento',
    fecha: '2026-09-24',
    horaInicio: '10:00',
    horaFin: '11:00',
    tipo: 'yo',
    lugar: null,
    notas: '',
    repeticion: 'nunca',
    flexible: false,
    duracionMin: null,
    hecha: false,
    foco: false,
    avisoMin: null,
    ejemplo: false,
    ...parcial,
  };
}

// Jueves 24 de septiembre de 2026 a las 10:00
const jueves10 = new Date(2026, 8, 24, 10, 0);

describe('sugerirHoras', () => {
  it('con amigos: por la noche entre semana y a comer el fin de semana, un día cada una', () => {
    const horas = sugerirHoras({ eventos: [], perfil, ahora: jueves10, tipo: 'amigos', duracionMin: 120 });
    expect(horas).toEqual([
      { dia: '2026-09-24', hora: '21:00' },
      { dia: '2026-09-25', hora: '21:00' },
      { dia: '2026-09-26', hora: '14:00' },
      { dia: '2026-09-27', hora: '14:00' },
    ]);
  });

  it('no pisa ningún evento', () => {
    const cena = evento({ fecha: '2026-09-24', horaInicio: '19:30', horaFin: '22:30' });
    const horas = sugerirHoras({ eventos: [cena], perfil, ahora: jueves10, tipo: 'amigos', duracionMin: 120 });
    expect(horas[0]).toEqual({ dia: '2026-09-25', hora: '21:00' });
  });

  it('busca otra hora del día si la preferida está ocupada', () => {
    const tarde = evento({ fecha: '2026-09-24', horaInicio: '21:00', horaFin: '22:00' });
    const horas = sugerirHoras({ eventos: [tarde], perfil, ahora: jueves10, tipo: 'amigos', duracionMin: 120 });
    expect(horas[0]).toEqual({ dia: '2026-09-24', hora: '19:00' });
  });

  it('hoy deja margen para votar (2 horas desde ahora)', () => {
    const tarde = new Date(2026, 8, 24, 19, 30);
    const horas = sugerirHoras({ eventos: [], perfil, ahora: tarde, tipo: 'amigos', duracionMin: 120 });
    expect(horas[0].dia).toBe('2026-09-25');
  });

  it('con un cliente: en horario de trabajo y solo los días de trabajo', () => {
    const horas = sugerirHoras({ eventos: [], perfil, ahora: jueves10, tipo: 'cliente', duracionMin: 60 });
    expect(horas).toEqual([
      { dia: '2026-09-24', hora: '12:00' },
      { dia: '2026-09-25', hora: '10:00' },
      { dia: '2026-09-28', hora: '10:00' },
      { dia: '2026-09-29', hora: '10:00' },
    ]);
  });

  it('respeta el máximo', () => {
    const horas = sugerirHoras({ eventos: [], perfil, ahora: jueves10, tipo: 'amigos', duracionMin: 120, maximo: 2 });
    expect(horas).toHaveLength(2);
  });
});

describe('huecos de Semana para proponer plan', () => {
  it('solo los de 2 h o más, desde ahora', () => {
    const ocupados = [{ inicio: 600, fin: 660 }]; // 10:00-11:00
    const ventana = { inicio: 450, fin: 1410 }; // 07:30-23:30
    const nueve = new Date(2026, 8, 24, 9, 0);
    expect(huecosParaPlan(ocupados, ventana, '2026-09-24', nueve)).toEqual([{ inicio: 660, fin: 1410 }]);
    expect(huecosParaPlan(ocupados, ventana, '2026-09-23', nueve)).toEqual([]);
  });

  it('propone una hora habitual dentro del hueco o, si no, su principio', () => {
    expect(horaParaHueco({ inicio: 1080, fin: 1380 }, '2026-09-24', perfil, 120)).toBe('21:00');
    expect(horaParaHueco({ inicio: 960, fin: 1110 }, '2026-09-24', perfil, 120)).toBe('16:00');
    expect(horaParaHueco({ inicio: 910, fin: 1080 }, '2026-09-24', perfil, 120)).toBe('15:30');
  });
});

// Viernes 2 y sábado 3 de octubre
const h1 = { id: 'h1', dia: '2026-10-02', hora: '20:30' };
const h2 = { id: 'h2', dia: '2026-10-02', hora: '21:00' };
const h3 = { id: 'h3', dia: '2026-10-03', hora: '21:00' };

describe('recuento de votos', () => {
  const votos = [
    { nombre: 'Laura', horas: ['h2'] },
    { nombre: 'Javi', horas: ['h1', 'h2'] },
    { nombre: 'Ana', horas: ['h2'] },
  ];

  it('cuenta los votos de cada hora con sus nombres', () => {
    const filas = contarVotos([h2, h1], votos);
    expect(filas.map((f) => [f.hora.id, f.votos, f.nombres])).toEqual([
      ['h1', 1, ['Javi']],
      ['h2', 3, ['Laura', 'Javi', 'Ana']],
    ]);
    expect(ganadoras(filas).map((f) => f.hora.id)).toEqual(['h2']);
  });

  it('dice qué hora gana', () => {
    expect(textoGanan([h1, h2], votos, 3)).toBe('Ganan las 21:00 con 3 de 3.');
    // Si invita a 4 y han votado 3, "de 4".
    expect(textoGanan([h1, h2], votos, 4)).toBe('Ganan las 21:00 con 3 de 4.');
  });

  it('con horas en días distintos, dice el día', () => {
    const v = [
      { nombre: 'Laura', horas: ['h3'] },
      { nombre: 'Javi', horas: ['h1', 'h3'] },
    ];
    expect(textoGanan([h1, h3], v, 0)).toBe('Ganan las 21:00 del sáb 3 con 2 de 2.');
  });

  it('empate y sin votos', () => {
    const v = [
      { nombre: 'Laura', horas: ['h1'] },
      { nombre: 'Javi', horas: ['h2'] },
    ];
    expect(textoGanan([h1, h2], v, 4)).toBe('Empatan las 20:30 y las 21:00 con 1 de 4.');
    expect(textoGanan([h1, h2], [], 4)).toBeNull();
    expect(ganadoras(contarVotos([h1, h2], []))).toEqual([]);
  });

  it('la 1 de la madrugada va en singular', () => {
    const h = { id: 'x', dia: '2026-10-03', hora: '01:00' };
    expect(textoGanan([h], [{ nombre: 'Laura', horas: ['x'] }], 1)).toBe('Gana la 01:00 con 1 de 1.');
  });

  it('aviso al organizador cuando alguien vota', () => {
    expect(avisoVotoNuevo('Laura', [h1, h2], votos, 3)).toEqual({
      titulo: 'Laura ha votado',
      cuerpo: 'Ganan las 21:00 con 3 de 3. ¿La cerramos?',
    });
    // Con empate no pregunta si se cierra.
    const empate = [
      { nombre: 'Laura', horas: ['h1'] },
      { nombre: 'Javi', horas: ['h2'] },
    ];
    expect(avisoVotoNuevo('Javi', [h1, h2], empate, 2).cuerpo).toBe('Empatan las 20:30 y las 21:00 con 1 de 2.');
  });

  it('el mismo nombre escrito de otra forma es la misma persona', () => {
    expect(claveNombre('  Laura   Gómez ')).toBe(claveNombre('laura gomez'));
    expect(claveNombre('Javi')).not.toBe(claveNombre('Javier'));
  });
});

function plan(parcial: Partial<Plan>): Plan {
  return {
    id: 'p1',
    codigo: '0123456789abcdef0123456789abcdef',
    titulo: 'Cena de viernes',
    tipo: 'amigos',
    organizador: 'Miguel',
    invitados: ['Laura', 'Javi'],
    horas: [h1, h2],
    duracionMin: 120,
    recordar: true,
    estado: 'abierto',
    horaElegida: null,
    eventoId: null,
    creadoEl: '2026-09-24T08:00:00.000Z',
    votos: [],
    votosVistos: 0,
    actualizadoEl: null,
    enServidor: true,
    ...parcial,
  };
}

describe('situación de un plan', () => {
  it('votando, cerrado o pasado', () => {
    expect(situacionPlan(plan({}), '2026-09-24')).toBe('votando');
    expect(situacionPlan(plan({}), '2026-10-03')).toBe('pasado');
    expect(situacionPlan(plan({ estado: 'cerrado', horaElegida: 'h2' }), '2026-10-02')).toBe('cerrado');
    expect(situacionPlan(plan({ estado: 'cerrado', horaElegida: 'h2' }), '2026-10-03')).toBe('pasado');
  });

  it('votos nuevos desde la última vez', () => {
    const votos = [
      { nombre: 'Laura', horas: ['h1'] },
      { nombre: 'Javi', horas: ['h2'] },
    ];
    expect(votosNuevos(plan({ votos, votosVistos: 0 }))).toBe(2);
    expect(votosNuevos(plan({ votos, votosVistos: 2 }))).toBe(0);
  });
});

describe('mensajes de WhatsApp', () => {
  const codigo = '0123456789abcdef0123456789abcdef';

  it('invitación', () => {
    const enlace = enlaceVotacion(codigo);
    expect(enlace).toBe(`${URL_VOTACION}#${codigo}`);
    expect(textoInvitacion('Miguel', 'Cena de viernes', enlace)).toBe(
      `Miguel te invita a: Cena de viernes. Elige hora, sin descargar nada: ${enlace}`,
    );
    expect(textoInvitacion('  ', 'Cena', 'x')).toBe('Te invitan a: Cena. Elige hora, sin descargar nada: x');
  });

  it('enlace de WhatsApp con el mensaje escrito (nunca se envía solo)', () => {
    const url = enlaceWhatsapp('Cena de viernes: ¿a las 21:00?');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(url.slice('https://wa.me/?text='.length))).toBe('Cena de viernes: ¿a las 21:00?');
  });

  it('confirmación y recordatorio', () => {
    expect(textoConfirmacion('Cena de viernes', h2)).toBe(
      'Cerrado: Cena de viernes, el viernes 2 de octubre a las 21:00. Nos vemos.',
    );
    expect(textoRecordatorio('Cena', h2, new Date(2026, 9, 2, 18, 0))).toBe(
      'Recordatorio: Cena, hoy a las 21:00. Nos vemos.',
    );
    expect(textoRecordatorio('Cena', h2, new Date(2026, 9, 1, 18, 0))).toBe(
      'Recordatorio: Cena, mañana a las 21:00. Nos vemos.',
    );
    expect(textoRecordatorio('Cena', h2, new Date(2026, 8, 28, 18, 0))).toBe(
      'Recordatorio: Cena, el vie 2 a las 21:00. Nos vemos.',
    );
  });

  it('el código se lee de la dirección', () => {
    expect(codigoDeLaDireccion(`#${codigo}`)).toBe(codigo);
    expect(codigoDeLaDireccion(`#${codigo.toUpperCase()}`)).toBe(codigo);
    expect(codigoDeLaDireccion('#corto')).toBeNull();
    expect(codigoDeLaDireccion('')).toBeNull();
  });
});

describe('cerrar el plan', () => {
  it('crea un evento de Amigos o Cliente con la duración del plan', () => {
    const e = eventoDelPlan(plan({}), h2, 'e1');
    expect(e).toMatchObject({
      id: 'e1',
      titulo: 'Cena de viernes',
      fecha: '2026-10-02',
      horaInicio: '21:00',
      horaFin: '23:00',
      tipo: 'amigos',
      notas: 'Con Laura y Javi',
    });
    expect(eventoDelPlan(plan({ tipo: 'cliente', invitados: [] }), h2, 'e2')).toMatchObject({ tipo: 'cliente', notas: '' });
  });

  it('no pasa de medianoche', () => {
    expect(horaFinDe('23:00', 120)).toBe('23:59');
    expect(horaFinDe('20:30', 90)).toBe('22:00');
  });
});

describe('recordatorio 3 h antes', () => {
  const cena = evento({ id: 'e1', titulo: 'Cena de viernes', fecha: '2026-10-02', horaInicio: '21:00', horaFin: '23:00' });
  const cerrado = plan({ estado: 'cerrado', horaElegida: 'h2', eventoId: 'e1' });

  it('a las 18:00 con el mensaje para WhatsApp', () => {
    const [aviso] = avisosDePlanes([cerrado], [cena], '2026-10-02');
    expect(aviso.cuando).toEqual(new Date(2026, 9, 2, 18, 0));
    expect(aviso.categoria).toBe('plan');
    expect(aviso.destino).toEqual({ pantalla: 'plan', id: 'p1' });
    expect(aviso.mensaje).toBe('Recordatorio: Cena de viernes, hoy a las 21:00. Nos vemos.');
  });

  it('nada si está apagado, sin cerrar o sin evento', () => {
    expect(avisosDePlanes([{ ...cerrado, recordar: false }], [cena], '2026-10-02')).toEqual([]);
    expect(avisosDePlanes([plan({})], [cena], '2026-10-02')).toEqual([]);
    expect(avisosDePlanes([cerrado], [], '2026-10-02')).toEqual([]);
  });

  it('entra en la planificación de avisos', () => {
    const ajustes: AjustesAvisos = {
      eventos: false,
      resumenManana: false,
      cierreDia: false,
      cierreSinPendientes: 'nada',
      salida: false,
    };
    const avisos = planificarAvisos({
      ahora: new Date(2026, 9, 1, 12, 0),
      eventos: [cena],
      perfil,
      ajustes,
      planes: [cerrado],
    });
    expect(avisos.map((a) => a.tipo)).toEqual(['plan-recordatorio']);
  });
});
