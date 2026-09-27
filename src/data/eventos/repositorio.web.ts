import { guardarAjuste, leerAjuste } from '@/data/ajustes';

import { normalizarCuadrante, normalizarLugar, type Evento, type RepositorioEventos } from './tipos';

// Guardado de eventos en la versión web.
//
// SQLite en el navegador necesita unas cabeceras de seguridad que GitHub Pages
// no permite poner, así que en la web los eventos se guardan en el
// almacenamiento del navegador (AsyncStorage, clave "organizy:eventos").
// Tiene las mismas funciones que repositorio.ts: las pantallas no notan la diferencia.

const CLAVE = 'eventos';

async function leer(): Promise<Evento[]> {
  const eventos = await leerAjuste<Evento[]>(CLAVE, []);
  // Convierte los lugares guardados con el formato antiguo (ver normalizarLugar).
  // Los eventos guardados antes de la fase 4 no tienen "avisoMin": usan el del perfil.
  // Los de antes de la fase 10 no tienen "cliente", ni los de antes de la matriz "cuadrante".
  return eventos.map((e) => ({
    ...e,
    lugar: normalizarLugar(e.lugar),
    avisoMin: e.avisoMin ?? null,
    cliente: e.cliente ?? null,
    origen: e.origen ?? null,
    cuadrante: normalizarCuadrante(e.cuadrante),
  }));
}

export const repositorio: RepositorioEventos = {
  leerTodos: leer,

  async guardar(evento) {
    const eventos = await leer();
    await guardarAjuste(CLAVE, [...eventos.filter((e) => e.id !== evento.id), evento]);
  },

  async borrar(id) {
    const eventos = await leer();
    await guardarAjuste(CLAVE, eventos.filter((e) => e.id !== id));
  },

  async borrarEjemplos() {
    const eventos = await leer();
    await guardarAjuste(CLAVE, eventos.filter((e) => !e.ejemplo));
  },

  async reemplazarTodos(eventos) {
    await guardarAjuste(CLAVE, eventos);
  },

  async cambiarVarios(guardar, borrar) {
    const quitar = new Set([...borrar, ...guardar.map((e) => e.id)]);
    const eventos = await leer();
    await guardarAjuste(CLAVE, [...eventos.filter((e) => !quitar.has(e.id)), ...guardar]);
  },
};
