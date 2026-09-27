import { describe, expect, it } from '@jest/globals';

import { normalizarCuadrante, type Cuadrante } from '@/data/eventos/tipos';
import {
  CUADRANTES,
  DATOS_CUADRANTE,
  agruparPorCuadrante,
  cuadranteDe,
  ordenarPorPrioridad,
  repartirTareas,
} from '@/services/agenda';

type Tarea = { id: string; cuadrante?: Cuadrante | null };
const t = (id: string, cuadrante?: Cuadrante | null): Tarea => ({ id, cuadrante });
const ids = (tareas: Tarea[]) => tareas.map((x) => x.id);

describe('matriz de Eisenhower', () => {
  it('cuadranteDe coincide con lo que dice cada cuadrante', () => {
    for (const c of CUADRANTES) {
      expect(cuadranteDe(DATOS_CUADRANTE[c].importante, DATOS_CUADRANTE[c].urgente)).toBe(c);
    }
    expect(cuadranteDe(true, true)).toBe('hazlo');
    expect(cuadranteDe(false, false)).toBe('elimina');
  });

  it('ordena lo importante primero y deja las sin clasificar en medio', () => {
    const tareas = [t('a', 'elimina'), t('b'), t('c', 'delega'), t('d', 'hazlo'), t('e', 'planifica'), t('f', null)];
    expect(ids(ordenarPorPrioridad(tareas))).toEqual(['d', 'e', 'b', 'f', 'c', 'a']);
  });

  it('respeta el orden de antes dentro del mismo cuadrante', () => {
    const tareas = [t('atrasada', 'hazlo'), t('otra'), t('hoy', 'hazlo')];
    expect(ids(ordenarPorPrioridad(tareas))).toEqual(['atrasada', 'hoy', 'otra']);
  });

  it('no cambia la lista original', () => {
    const tareas = [t('a', 'elimina'), t('b', 'hazlo')];
    ordenarPorPrioridad(tareas);
    expect(ids(tareas)).toEqual(['a', 'b']);
  });

  it('agrupa por cuadrante', () => {
    const g = agruparPorCuadrante([t('a', 'hazlo'), t('b'), t('c', 'elimina'), t('d', 'hazlo')]);
    expect(ids(g.hazlo)).toEqual(['a', 'd']);
    expect(ids(g.elimina)).toEqual(['c']);
    expect(ids(g.sinClasificar)).toEqual(['b']);
    expect(g.planifica).toEqual([]);
  });

  it('con energía tranqui se quedan hoy las más importantes', () => {
    const tareas = ordenarPorPrioridad([t('a', 'elimina'), t('b', 'delega'), t('c', 'hazlo'), t('d', 'planifica')]);
    const reparto = repartirTareas(tareas, () => 30, [{ inicio: 600, fin: 900 }], 'tranqui', 'manana');
    expect(reparto.colocadas.map((c) => c.tarea.id)).toEqual(['c', 'd']);
    expect(ids(reparto.paraManana)).toEqual(['b', 'a']);
  });

  it('lee como sin clasificar lo que no es un cuadrante', () => {
    expect(normalizarCuadrante('hazlo')).toBe('hazlo');
    expect(normalizarCuadrante(undefined)).toBeNull();
    expect(normalizarCuadrante('urgente')).toBeNull();
    expect(normalizarCuadrante(3)).toBeNull();
  });
});
