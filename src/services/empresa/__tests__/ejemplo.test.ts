import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { DatosEmpresa } from '@/data/empresa/tipos';
import { anunciosSinLeer, totalSinLeer } from '../chat';
import { datosDeEjemplo, PERSONAS_PRUEBA } from '../ejemplo';
import { basePrueba, esEjemplo, modoPruebaEmpresa, ponerEjemplo, quitarEjemplo } from '../prueba';
import { soyAdmin } from '../roles';
import { traerSituacion } from '../servidor';

// La empresa de ejemplo pasa por el servidor de prueba (en memoria en las pruebas): lo
// mismo que ve el dueño en Expo Go.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/data/supabaseEmpresa', () => ({ obtenerSupabaseEmpresa: () => null }));

const [PEPE, LAURA, JAVI] = PERSONAS_PRUEBA;
const AHORA = new Date(2026, 8, 30, 11, 0); // miércoles

async function comoPersona(persona: (typeof PERSONAS_PRUEBA)[number]): Promise<DatosEmpresa> {
  basePrueba.entrarComo(persona);
  const s = await traerSituacion(AHORA);
  if (s.fase !== 'dentro') throw new Error(`fuera: ${s.fase}`);
  return s.datos;
}

describe('empresa de ejemplo', () => {
  beforeEach(() => {
    ponerEjemplo(AHORA);
  });

  it('se enciende y se apaga', () => {
    expect(esEjemplo()).toBe(true);
    expect(modoPruebaEmpresa()).toBe(true);
    quitarEjemplo();
    expect(esEjemplo()).toBe(false);
  });

  it('Pepe (el jefe) lo ve todo y le quedan cosas por mirar', async () => {
    const d = await comoPersona(PEPE);
    expect(d.ejemplo).toBe(true);
    expect(d.empresa.nombre).toBe('Bar Pepe');
    expect(soyAdmin(d)).toBe(true);
    expect(d.miembros.filter((m) => m.estado === 'pendiente').map((m) => m.nombre)).toEqual(['Ana']);
    expect(d.canales).toHaveLength(4);
    expect(totalSinLeer(d)).toBe(3);
    // Los suyos no cuentan: le queda el de Laura a Cocina.
    expect(anunciosSinLeer(d).map((a) => a.titulo)).toEqual(['Nuevo proveedor de pescado']);
    expect(d.cambios.filter((c) => c.estado === 'pendiente')).toHaveLength(1);
    expect(d.turnos.filter((t) => t.usuario === PEPE.id)).toHaveLength(10);
  });

  it('Javi (empleado) no ve el chat privado de Pepe y Laura ni lo de Cocina', async () => {
    const d = await comoPersona(JAVI);
    expect(soyAdmin(d)).toBe(false);
    expect(d.canales.map((c) => c.tipo).sort()).toEqual(['equipo', 'general']);
    expect(d.anuncios.map((a) => a.titulo)).not.toContain('Nuevo proveedor de pescado');
    expect(anunciosSinLeer(d).map((a) => a.titulo)).toEqual(['Inspección de sanidad el jueves']);
    expect(d.miembros.some((m) => m.estado === 'pendiente')).toBe(false);
  });

  it('Laura (responsable de Cocina) ve su chat con Pepe', async () => {
    const d = await comoPersona(LAURA);
    expect(d.canales.some((c) => c.tipo === 'privado')).toBe(true);
    expect(d.enEquipos.find((e) => e.usuario === LAURA.id)?.responsable).toBe(true);
  });

  it('los turnos son de esta semana y la siguiente, y el cambio pedido es de un turno de Javi', () => {
    const t = datosDeEjemplo(AHORA);
    const fechas = t.turnos.map((x) => x.fecha as string).sort();
    expect(fechas[0]).toBe('2026-09-28');
    expect(fechas[fechas.length - 1]).toBe('2026-10-11');
    const cambio = t.cambios_turno[0];
    expect(t.turnos.find((x) => x.id === cambio.turno_id)?.usuario).toBe(JAVI.id);
  });
});
