import { describe, expect, it } from '@jest/globals';

import type { Evento } from '@/data/eventos/tipos';
import type { Perfil } from '@/data/perfil';
import type { AjustesRecordatorios } from '@/data/recordatorios';
import { avisosDeClientes } from '@/services/avisos/clientes';
import { planificarAvisos } from '@/services/avisos/planificar';
import {
  claveEnvio,
  cuandoEsLaCita,
  cuandoFue,
  proximaCita,
  puedeRecordar,
  recordatorioDe,
  telefonoWhatsapp,
  textoEstadoEnvio,
  textoRecordatorioCliente,
} from '@/services/clientes';
import { enlaceWhatsapp } from '@/services/rutas/textos';

const perfil: Perfil = {
  nombre: 'Ana',
  vivienda: { direccion: 'Calle del Sol 2, Zaragoza', coordenadas: null },
  sitios: [{ id: 's1', nombre: 'Oficina', direccion: 'Calle Mayor 1, Huesca', coordenadas: null }],
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

function cita(parcial: Partial<Evento> = {}): Evento {
  return {
    id: 'c1',
    titulo: 'Revisión del proyecto',
    fecha: '2026-09-25', // viernes
    horaInicio: '10:30',
    horaFin: '11:30',
    tipo: 'cliente',
    lugar: { tipo: 'sitio', sitioId: 's1' },
    notas: '',
    repeticion: 'nunca',
    flexible: false,
    duracionMin: null,
    hecha: false,
    foco: false,
    avisoMin: null,
    ejemplo: false,
    cliente: { nombre: 'Laura', telefono: '612 34 56 78', acepta: true },
    ...parcial,
  };
}

// Jueves 24 de septiembre de 2026 a las 06:00
const ahora = new Date(2026, 8, 24, 6, 0);
const AJUSTES: AjustesRecordatorios = { activo: true, hora: '10:00' };

describe('telefonoWhatsapp', () => {
  it('pone el prefijo de España a los móviles de 9 cifras', () => {
    expect(telefonoWhatsapp('612 34 56 78')).toBe('34612345678');
    expect(telefonoWhatsapp('612-345-678')).toBe('34612345678');
  });

  it('respeta el prefijo escrito con + o 00', () => {
    expect(telefonoWhatsapp('+34 612 34 56 78')).toBe('34612345678');
    expect(telefonoWhatsapp('0034612345678')).toBe('34612345678');
    expect(telefonoWhatsapp('+351 912 345 678')).toBe('351912345678');
    expect(telefonoWhatsapp('34612345678')).toBe('34612345678');
  });

  it('rechaza lo que no es un teléfono', () => {
    expect(telefonoWhatsapp('')).toBeNull();
    expect(telefonoWhatsapp('12345')).toBeNull();
    expect(telefonoWhatsapp('llámame')).toBeNull();
    expect(telefonoWhatsapp('512345678')).toBeNull(); // 9 cifras que no son de España
  });
});

describe('puedeRecordar', () => {
  it('solo con la casilla de consentimiento marcada', () => {
    expect(puedeRecordar(cita())).toBe(true);
    expect(puedeRecordar(cita({ cliente: { nombre: 'Laura', telefono: '612345678', acepta: false } }))).toBe(false);
  });

  it('sin teléfono válido, sin cliente o si no es de Clientes, nada', () => {
    expect(puedeRecordar(cita({ cliente: { nombre: 'Laura', telefono: '123', acepta: true } }))).toBe(false);
    expect(puedeRecordar(cita({ cliente: null }))).toBe(false);
    expect(puedeRecordar(cita({ cliente: undefined }))).toBe(false);
    expect(puedeRecordar(cita({ tipo: 'amigos' }))).toBe(false);
    expect(puedeRecordar(cita({ flexible: true, horaInicio: null, horaFin: null }))).toBe(false);
  });
});

describe('mensaje', () => {
  it('como la plantilla: nombre, día, hora y dirección', () => {
    expect(
      textoRecordatorioCliente({ nombre: 'Laura', dia: '2026-09-25', hora: '10:30', lugar: 'Calle Mayor 1, Huesca', desde: '2026-09-24' }),
    ).toBe(
      'Hola Laura, te recuerdo nuestra cita mañana viernes 25 de septiembre a las 10:30 en Calle Mayor 1, Huesca. Si no puedes venir, respóndeme a este mensaje.',
    );
  });

  it('sin nombre ni lugar', () => {
    expect(textoRecordatorioCliente({ nombre: ' ', dia: '2026-09-24', hora: '18:00', lugar: null, desde: '2026-09-24' })).toBe(
      'Hola, te recuerdo nuestra cita hoy a las 18:00. Si no puedes venir, respóndeme a este mensaje.',
    );
  });

  it('dice "el" si falta más de un día', () => {
    expect(cuandoEsLaCita('2026-09-28', '2026-09-24')).toBe('el lunes 28 de septiembre');
  });

  it('usa la dirección del sitio (el cliente no sabe qué es "Oficina") y abre su chat', () => {
    const r = recordatorioDe(cita(), cita().cliente!, '2026-09-25', perfil, ahora);
    expect(r?.texto).toContain('en Calle Mayor 1, Huesca.');
    expect(r?.telefono).toBe('34612345678');
    expect(r?.enlace).toBe(enlaceWhatsapp(r!.texto, '34612345678'));
    expect(r?.enlace.startsWith('https://wa.me/34612345678?text=Hola%20Laura')).toBe(true);
  });

  it('el enlace sin teléfono sigue como antes (Planes y "Avisar de retraso")', () => {
    expect(enlaceWhatsapp('Hola')).toBe('https://wa.me/?text=Hola');
  });
});

describe('proximaCita', () => {
  it('la fecha de la cita si aún no ha empezado', () => {
    expect(proximaCita(cita(), ahora)).toBe('2026-09-25');
    expect(proximaCita(cita({ fecha: '2026-09-24' }), ahora)).toBe('2026-09-24');
  });

  it('null si ya pasó', () => {
    expect(proximaCita(cita({ fecha: '2026-09-24', horaInicio: '05:00', horaFin: '05:30' }), ahora)).toBeNull();
    expect(proximaCita(cita({ fecha: '2026-09-20' }), ahora)).toBeNull();
  });

  it('en una serie, la próxima repetición', () => {
    // Semanal desde el lunes 21: la próxima es el lunes 28.
    expect(proximaCita(cita({ fecha: '2026-09-21', repeticion: 'semanal' }), ahora)).toBe('2026-09-28');
  });
});

describe('estado del envío', () => {
  it('"Recordatorio enviado ayer a las 11:02"', () => {
    const envio = { estado: 'enviado' as const, el: new Date(2026, 8, 23, 11, 2).toISOString(), via: 'whatsapp' as const };
    expect(textoEstadoEnvio(envio, ahora)).toBe('Recordatorio enviado ayer a las 11:02');
  });

  it('con el motivo si falló', () => {
    const envio = {
      estado: 'fallido' as const,
      el: new Date(2026, 8, 24, 5, 30).toISOString(),
      via: 'whatsapp' as const,
      error: 'no se pudo abrir WhatsApp.',
    };
    expect(textoEstadoEnvio(envio, ahora)).toBe('No se pudo enviar hoy a las 05:30: no se pudo abrir WhatsApp.');
  });

  it('otros días con la fecha', () => {
    expect(cuandoFue(new Date(2026, 8, 21, 9, 0), ahora)).toBe('el lunes 21 sept a las 09:00');
  });
});

describe('aviso del día antes', () => {
  it('a la hora elegida, con el mensaje y el teléfono', () => {
    const [aviso] = avisosDeClientes({ ajustes: AJUSTES, envios: {} }, [cita()], perfil, '2026-09-24');
    expect(aviso.cuando).toEqual(new Date(2026, 8, 24, 10, 0));
    expect(aviso.tipo).toBe('recordatorio-cliente');
    expect(aviso.dia).toBe('2026-09-25');
    expect(aviso.titulo).toBe('Recuérdale la cita a Laura');
    expect(aviso.telefono).toBe('34612345678');
    expect(aviso.mensaje).toContain('mañana viernes 25 de septiembre a las 10:30');
    expect(aviso.destino).toEqual({ pantalla: 'evento', id: 'c1' });
    expect(aviso.categoria).toBe('cliente');
  });

  it('sin la casilla de consentimiento no hay aviso', () => {
    const sinPermiso = cita({ cliente: { nombre: 'Laura', telefono: '612345678', acepta: false } });
    expect(avisosDeClientes({ ajustes: AJUSTES, envios: {} }, [sinPermiso], perfil, '2026-09-24')).toEqual([]);
  });

  it('con el interruptor general apagado, nada', () => {
    expect(avisosDeClientes({ ajustes: { ...AJUSTES, activo: false }, envios: {} }, [cita()], perfil, '2026-09-24')).toEqual([]);
  });

  it('nunca dos veces: si ya se envió, no vuelve a avisar', () => {
    const envios = { [claveEnvio('c1', '2026-09-25')]: { estado: 'enviado' as const, el: ahora.toISOString(), via: 'whatsapp' as const } };
    expect(avisosDeClientes({ ajustes: AJUSTES, envios }, [cita()], perfil, '2026-09-24')).toEqual([]);
  });

  it('si falló, vuelve a avisar', () => {
    const envios = {
      [claveEnvio('c1', '2026-09-25')]: { estado: 'fallido' as const, el: ahora.toISOString(), via: 'whatsapp' as const },
    };
    expect(avisosDeClientes({ ajustes: AJUSTES, envios }, [cita()], perfil, '2026-09-24')).toHaveLength(1);
  });

  it('entra en la planificación de los avisos', () => {
    const avisos = planificarAvisos({
      ahora,
      eventos: [cita()],
      perfil,
      ajustes: { eventos: false, resumenManana: false, cierreDia: false, cierreSinPendientes: 'nada', salida: false, plazosCorreo: false },
      recordatorios: { ajustes: AJUSTES, envios: {} },
    });
    expect(avisos.map((a) => a.id)).toEqual(['cliente:c1:2026-09-25']);
  });
});
