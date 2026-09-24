import { guardarAjuste, leerAjuste } from '@/data/ajustes';

import type { Evento, RepositorioEventos } from './tipos';

// Guardado de eventos en la versión web.
//
// SQLite en el navegador necesita unas cabeceras de seguridad que GitHub Pages
// no permite poner, así que en la web los eventos se guardan en el
// almacenamiento del navegador (AsyncStorage, clave "organizy:eventos").
// Tiene las mismas funciones que repositorio.ts: las pantallas no notan la diferencia.

const CLAVE = 'eventos';

function leer(): Promise<Evento[]> {
  return leerAjuste<Evento[]>(CLAVE, []);
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
};
