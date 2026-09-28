import { describe, expect, it } from '@jest/globals';

// Reglas de los correos (sin IA): las usan el servidor y el ayudante de Gmail.
import * as reglas from '../reglasCorreo.js';

// Domingo 27 de septiembre de 2026, 10:00.
const RECIBIDO = new Date(2026, 8, 27, 10, 0);
const HOY = '2026-09-27';

describe('fechaLimiteEn', () => {
  it('encuentra fechas escritas junto a una palabra de plazo', () => {
    expect(reglas.fechaLimiteEn('El plazo para presentar la documentación acaba el 5 de octubre.', HOY)).toBe('2026-10-05');
    expect(reglas.fechaLimiteEn('Fecha límite: 05/10/2026', HOY)).toBe('2026-10-05');
    expect(reglas.fechaLimiteEn('Recuerda pagar antes del 15/10', HOY)).toBe('2026-10-15');
    expect(reglas.fechaLimiteEn('La factura vence el 3 oct.', HOY)).toBe('2026-10-03');
    expect(reglas.fechaLimiteEn('Tienes hasta el 1 de noviembre de 2026 para renovarlo', HOY)).toBe('2026-11-01');
    expect(reglas.fechaLimiteEn('El 12 de octubre vence el recibo', HOY)).toBe('2026-10-12');
  });

  it('entiende mañana y los días de la semana si la palabra es clara', () => {
    expect(reglas.fechaLimiteEn('Tienes que entregarlo mañana sin falta', HOY)).toBe('2026-09-28');
    expect(reglas.fechaLimiteEn('La fecha límite es el viernes', HOY)).toBe('2026-10-02');
    expect(reglas.fechaLimiteEn('El plazo termina a final de mes', HOY)).toBe('2026-09-30');
  });

  it('no confunde despedidas, horas, rangos ni fechas pasadas', () => {
    expect(reglas.fechaLimiteEn('Hasta el lunes, que vaya bien', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('Nos vemos el 5 de octubre en la cena', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('Hay que entregar 3-4 copias', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('Entrega a las 10.30', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('El plazo acabó el 3 de septiembre', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('Pásate por la mañana antes de nada', HOY)).toBeNull();
    expect(reglas.fechaLimiteEn('El plazo es largo. El 5 de octubre hay cena', HOY)).toBeNull();
  });

  it('en diciembre, "5 de enero" es del año que viene', () => {
    expect(reglas.fechaLimiteEn('Plazo hasta el 5 de enero', '2026-12-20')).toBe('2027-01-05');
  });

  it('se queda con la primera si hay varias', () => {
    expect(reglas.fechaLimiteEn('Plazo: 20/10. Entrega del borrador antes del 10/10.', HOY)).toBe('2026-10-10');
  });
});

describe('limpiar y resumir', () => {
  it('limpia el asunto y el remitente', () => {
    expect(reglas.limpiarAsunto('RE: RV: [EXTERNO] Factura de octubre')).toBe('Factura de octubre');
    expect(reglas.limpiarAsunto('   ')).toBe('(Sin asunto)');
    expect(reglas.nombreRemitente('"Gestoría López" <info@gl.es>')).toBe('Gestoría López');
    expect(reglas.nombreRemitente('<info@gl.es>')).toBe('info@gl.es');
    expect(reglas.nombreRemitente('info@gl.es')).toBe('info@gl.es');
  });

  it('quita saludo, despedida, citas y enlaces', () => {
    const cuerpo = [
      'Hola Miguel,',
      '',
      'Te mando el presupuesto de la reforma. Incluye la cocina y el baño (https://ejemplo.com/p.pdf).',
      'Dime algo cuando puedas.',
      '',
      'Un saludo,',
      'Laura',
      '',
      'El vie, 25 sept 2026 a las 9:00, Miguel <m@x.es> escribió:',
      '> ¿Me pasas el presupuesto?',
    ].join('\n');
    expect(reglas.resumir(cuerpo)).toBe(
      'Te mando el presupuesto de la reforma. Incluye la cocina y el baño. Dime algo cuando puedas.',
    );
  });

  it('no se come la frase si el saludo no termina en coma', () => {
    expect(reglas.resumir('Hola te escribo para quedar el jueves')).toBe('Hola te escribo para quedar el jueves');
  });

  it('en un reenvío, resume lo reenviado', () => {
    const cuerpo = [
      '---------- Forwarded message ---------',
      'De: Banco <avisos@banco.es>',
      'Date: vie, 25 sept 2026',
      'Subject: Tu tarjeta caduca',
      'To: <yo@icloud.com>',
      '',
      'Tu tarjeta caduca pronto. Te enviaremos una nueva a casa.',
    ].join('\n');
    expect(reglas.resumir(cuerpo)).toBe('Tu tarjeta caduca pronto. Te enviaremos una nueva a casa.');
  });

  it('recorta los correos largos en una frase', () => {
    const largo = 'Primera frase con cosas importantes que contar. '.repeat(10);
    const resumen = reglas.resumir(largo);
    expect(resumen.length).toBeLessThanOrEqual(240);
    expect(resumen.endsWith('.')).toBe(true);
  });
});

describe('analizarCorreo y avisos', () => {
  it('un correo con plazo lleva fecha y tarea', () => {
    const a = reglas.analizarCorreo({
      asunto: 'RE: Declaración trimestral',
      de: 'Gestoría <g@g.es>',
      cuerpo: 'Buenos días,\nNecesito las facturas antes del 10 de octubre para presentar el IVA.\nGracias',
      recibido: RECIBIDO,
    });
    expect(a).toEqual({
      titulo: 'Declaración trimestral',
      resumen: 'Necesito las facturas antes del 10 de octubre para presentar el IVA.',
      fechaLimite: '2026-10-10',
      tarea: 'Declaración trimestral',
      via: 'reglas',
    });
  });

  it('un correo normal es solo un resumen', () => {
    const a = reglas.analizarCorreo({ asunto: 'Fotos del finde', de: 'Ana', cuerpo: '¡Mira qué bien salimos!', recibido: RECIBIDO });
    expect(a.fechaLimite).toBeNull();
    expect(a.tarea).toBeNull();
  });

  it('un aviso por plazo y uno solo para muchos correos normales', () => {
    const normal = (i) => ({ titulo: `Correo ${i}`, de: 'Ana', resumen: 'Algo', fechaLimite: null, tarea: null });
    const avisos = reglas.avisosDeCorreos(
      [
        { titulo: 'IVA', de: 'Gestoría', resumen: '', fechaLimite: '2026-10-05', tarea: 'Mandar facturas' },
        normal(1),
        normal(2),
        normal(3),
        normal(4),
      ],
      RECIBIDO,
    );
    expect(avisos).toHaveLength(2);
    expect(avisos[0].titulo).toBe('Vence el lun 5 oct: Mandar facturas');
    expect(avisos[1].titulo).toBe('4 correos nuevos');
    expect(reglas.avisosDeCorreos([normal(1)], RECIBIDO)).toEqual([{ titulo: 'Correo 1', cuerpo: 'Ana · Algo' }]);
    expect(
      reglas.avisosDeCorreos([{ titulo: 'X', de: 'Y', resumen: '', fechaLimite: '2026-09-28', tarea: 'X' }], RECIBIDO)[0].titulo,
    ).toBe('Vence mañana: X');
  });
});
