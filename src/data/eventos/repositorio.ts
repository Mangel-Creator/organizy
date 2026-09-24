import { obtenerBD } from '@/data/db';

import type { Evento, LugarEvento, RepositorioEventos } from './tipos';

// Guardado de eventos en el móvil (Android e iOS) con SQLite.
// En la web se usa repositorio.web.ts, que tiene las mismas funciones.

type Fila = {
  id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  tipo: Evento['tipo'];
  lugar_tipo: 'casa' | 'sitio' | 'otro' | null;
  lugar_sitio_id: string | null;
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
  aviso_min: number | null; // migración 3
};

function lugarDesdeFila(f: Fila): LugarEvento | null {
  if (f.lugar_tipo === 'casa') return { tipo: 'casa' };
  if (f.lugar_tipo === 'sitio' && f.lugar_sitio_id) return { tipo: 'sitio', sitioId: f.lugar_sitio_id };
  if (f.lugar_tipo === 'otro' && f.lugar_direccion !== null) {
    return {
      tipo: 'otro',
      direccion: f.lugar_direccion,
      coordenadas:
        f.lugar_latitud === null || f.lugar_longitud === null
          ? null
          : { latitud: f.lugar_latitud, longitud: f.lugar_longitud },
    };
  }
  return null;
}

function eventoDesdeFila(f: Fila): Evento {
  return {
    id: f.id,
    titulo: f.titulo,
    fecha: f.fecha,
    horaInicio: f.hora_inicio,
    horaFin: f.hora_fin,
    tipo: f.tipo,
    lugar: lugarDesdeFila(f),
    notas: f.notas,
    repeticion: f.repeticion,
    flexible: f.flexible === 1,
    duracionMin: f.duracion_min,
    hecha: f.hecha === 1,
    foco: f.foco === 1,
    avisoMin: f.aviso_min,
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
    const otro = e.lugar?.tipo === 'otro' ? e.lugar : null;
    await bd.runAsync(
      `INSERT OR REPLACE INTO eventos (
        id, titulo, fecha, hora_inicio, hora_fin, tipo,
        lugar_tipo, lugar_sitio_id, lugar_direccion, lugar_latitud, lugar_longitud,
        notas, repeticion, flexible, duracion_min, hecha, foco, ejemplo, aviso_min
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      e.id,
      e.titulo,
      e.fecha,
      e.horaInicio,
      e.horaFin,
      e.tipo,
      e.lugar?.tipo ?? null,
      e.lugar?.tipo === 'sitio' ? e.lugar.sitioId : null,
      otro?.direccion ?? null,
      otro?.coordenadas?.latitud ?? null,
      otro?.coordenadas?.longitud ?? null,
      e.notas,
      e.repeticion,
      e.flexible ? 1 : 0,
      e.duracionMin,
      e.hecha ? 1 : 0,
      e.foco ? 1 : 0,
      e.ejemplo ? 1 : 0,
      e.avisoMin,
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
