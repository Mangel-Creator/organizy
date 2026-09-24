import { obtenerBD } from '@/data/db';

import type { Evento, RepositorioEventos } from './tipos';

// Guardado de eventos en el móvil (Android e iOS) con SQLite.
// En la web se usa repositorio.web.ts, que tiene las mismas funciones.

type Fila = {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  tipo: Evento['tipo'];
  lugar_nombre: string | null;
  lugar_direccion: string | null;
  lugar_latitud: number | null;
  lugar_longitud: number | null;
  notas: string;
  repeticion: Evento['repeticion'];
  flexible: number;
  duracion_min: number | null;
  hecha: number;
  foco: number;
  ejemplo: number;
};

function eventoDesdeFila(f: Fila): Evento {
  return {
    id: f.id,
    titulo: f.titulo,
    fecha: f.fecha,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin,
    tipo: f.tipo,
    lugar:
      f.lugar_direccion === null
        ? null
        : {
            nombre: f.lugar_nombre,
            direccion: f.lugar_direccion,
            coordenadas:
              f.lugar_latitud === null || f.lugar_longitud === null
                ? null
                : { latitud: f.lugar_latitud, longitud: f.lugar_longitud },
          },
    notas: f.notas,
    repeticion: f.repeticion,
    flexible: f.flexible === 1,
    duracionMin: f.duracion_min,
    hecha: f.hecha === 1,
    foco: f.foco === 1,
    ejemplo: f.ejemplo === 1,
  };
}

export const repositorio: RepositorioEventos = {
  async leerTodos() {
    const bd = await obtenerBD();
    const filas = await bd.getAllAsync<Fila>('SELECT * FROM eventos ORDER BY fecha, hora_inicio');
    return filas.map(eventoDesdeFila);
  },

  async guardar(e) {
    const bd = await obtenerBD();
    await bd.runAsync(
      `INSERT OR REPLACE INTO eventos (
        id, titulo, fecha, hora_inicio, hora_fin, tipo,
        lugar_nombre, lugar_direccion, lugar_latitud, lugar_longitud,
        notas, repeticion, flexible, duracion_min, hecha, foco, ejemplo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      e.id,
      e.titulo,
      e.fecha,
      e.horaInicio,
      e.horaFin,
      e.tipo,
      e.lugar?.nombre ?? null,
      e.lugar?.direccion ?? null,
      e.lugar?.coordenadas?.latitud ?? null,
      e.lugar?.coordenadas?.longitud ?? null,
      e.notas,
      e.repeticion,
      e.flexible ? 1 : 0,
      e.duracionMin,
      e.hecha ? 1 : 0,
      e.foco ? 1 : 0,
      e.ejemplo ? 1 : 0,
    );
  },

  async borrar(id) {
    const bd = await obtenerBD();
    await bd.runAsync('DELETE FROM eventos WHERE id = ?', id);
  },

  async borrarEjemplos() {
    const bd = await obtenerBD();
    await bd.runAsync('DELETE FROM eventos WHERE ejemplo = 1');
  },
};
