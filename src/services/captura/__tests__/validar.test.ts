import { describe, expect, it } from '@jest/globals';

import { normalizarHora, validarPropuesta } from '@/services/captura/validar';

const contexto = { hoy: '2026-09-24', sitiosIds: ['s-gimnasio', 's-trabajo'] };

// Respuesta típica de la IA para «pádel con Javi el jueves a las 8».
const buena = {
  titulo: 'pádel con Javi',
  fecha: '2026-10-01',
  horaInicio: '20:00',
  horaFin: '21:00',
  tipo: 'amigos',
  sitioId: null,
  flexible: false,
  duracionMin: null,
  confianza: 'alta',
};

describe('validarPropuesta', () => {
  it('acepta una respuesta correcta y pone el título con mayúscula', () => {
    expect(validarPropuesta(buena, contexto)).toEqual({
      titulo: 'Pádel con Javi',
      fecha: '2026-10-01',
      horaInicio: '20:00',
      horaFin: '21:00',
      tipo: 'amigos',
      lugar: null,
      flexible: false,
      duracionMin: null,
      confianza: 'alta',
    });
  });

  it('descarta lo que no es un objeto', () => {
    expect(validarPropuesta(null, contexto)).toBeNull();
    expect(validarPropuesta('pádel', contexto)).toBeNull();
    expect(validarPropuesta([buena], contexto)).toBeNull();
  });

  it('descarta un título vacío o que no es texto', () => {
    expect(validarPropuesta({ ...buena, titulo: '   ' }, contexto)).toBeNull();
    expect(validarPropuesta({ ...buena, titulo: 42 }, contexto)).toBeNull();
  });

  it('recorta los títulos muy largos y los espacios de más', () => {
    const p = validarPropuesta({ ...buena, titulo: '  cena   con   Ana ' + 'x'.repeat(200) }, contexto);
    expect(p?.titulo.startsWith('Cena con Ana')).toBe(true);
    expect(p?.titulo.length).toBeLessThanOrEqual(100);
  });

  it('descarta fechas mal escritas, que no existen o demasiado lejos', () => {
    expect(validarPropuesta({ ...buena, fecha: '1/10/2026' }, contexto)).toBeNull();
    expect(validarPropuesta({ ...buena, fecha: '2026-02-30' }, contexto)).toBeNull();
    expect(validarPropuesta({ ...buena, fecha: '2025-01-01' }, contexto)).toBeNull();
    expect(validarPropuesta({ ...buena, fecha: '2031-01-01' }, contexto)).toBeNull();
  });

  it('pone 1 hora de fin si falta o si es antes del inicio', () => {
    expect(validarPropuesta({ ...buena, horaFin: null }, contexto)?.horaFin).toBe('21:00');
    expect(validarPropuesta({ ...buena, horaFin: '19:00' }, contexto)?.horaFin).toBe('21:00');
    expect(validarPropuesta({ ...buena, horaFin: 'mañana' }, contexto)?.horaFin).toBe('21:00');
  });

  it('no cruza la medianoche', () => {
    const p = validarPropuesta({ ...buena, horaInicio: '23:30', horaFin: null }, contexto);
    expect(p?.horaFin).toBe('23:59');
    expect(validarPropuesta({ ...buena, horaInicio: '23:59', horaFin: null }, contexto)).toBeNull();
  });

  it('acepta horas con una sola cifra y descarta las imposibles', () => {
    expect(validarPropuesta({ ...buena, horaInicio: '8:30', horaFin: '9:15' }, contexto)).toMatchObject({
      horaInicio: '08:30',
      horaFin: '09:15',
    });
    expect(normalizarHora('25:00')).toBeNull();
    expect(normalizarHora('10:75')).toBeNull();
    expect(normalizarHora('20h')).toBeNull();
  });

  it('sin hora de inicio lo convierte en tarea flexible', () => {
    const p = validarPropuesta({ ...buena, horaInicio: null, horaFin: null, duracionMin: null }, contexto);
    expect(p).toMatchObject({ flexible: true, horaInicio: null, horaFin: null, duracionMin: 30 });
  });

  it('en tareas flexibles quita las horas y ajusta la duración a 15, 30, 60 o 120 min', () => {
    const p = validarPropuesta({ ...buena, flexible: true, duracionMin: 45 }, contexto);
    expect(p).toMatchObject({ flexible: true, horaInicio: null, horaFin: null });
    expect([30, 60]).toContain(p?.duracionMin);
    expect(validarPropuesta({ ...buena, flexible: true, duracionMin: 500 }, contexto)?.duracionMin).toBe(120);
    expect(validarPropuesta({ ...buena, flexible: true, duracionMin: 'mucho' }, contexto)?.duracionMin).toBe(30);
  });

  it('si el tipo no es válido, lo pone como "yo"', () => {
    expect(validarPropuesta({ ...buena, tipo: 'familia' }, contexto)?.tipo).toBe('yo');
    expect(validarPropuesta({ ...buena, tipo: 'cliente' }, contexto)?.tipo).toBe('cliente');
  });

  it('solo acepta Casa o sitios habituales que existen, como referencia', () => {
    expect(validarPropuesta({ ...buena, sitioId: 'casa' }, contexto)?.lugar).toEqual({ tipo: 'casa' });
    expect(validarPropuesta({ ...buena, sitioId: 's-gimnasio' }, contexto)?.lugar).toEqual({
      tipo: 'sitio',
      sitioId: 's-gimnasio',
    });
    expect(validarPropuesta({ ...buena, sitioId: 's-inventado' }, contexto)?.lugar).toBeNull();
  });

  it('si la confianza no es válida, la toma como baja', () => {
    expect(validarPropuesta({ ...buena, confianza: 'muy alta' }, contexto)?.confianza).toBe('baja');
    expect(validarPropuesta({ ...buena, confianza: 'media' }, contexto)?.confianza).toBe('media');
  });
});
