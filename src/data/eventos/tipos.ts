import type { Coordenadas, Hora } from '@/data/perfil';
import type { ClaveDia } from '@/services/fechas';

// Qué es un evento en Organizy. Lo usan el guardado (SQLite o navegador),
// las pantallas y la lógica de services/agenda.

export type TipoEvento = 'cliente' | 'amigos' | 'yo';
export type Repeticion = 'nunca' | 'diaria' | 'semanal' | 'mensual';

// Lugar de un evento:
// - "casa": la vivienda del perfil.
// - "sitio": un sitio habitual del perfil (Trabajo, Gimnasio...), por su id.
//   Casa y los sitios guardan solo la referencia: si el usuario cambia la
//   dirección en Perfil, sus eventos apuntan solos a la nueva (ver resolverLugar).
// - "otro": una dirección escrita a mano, que sí se guarda tal cual.
export type LugarEvento =
  | { tipo: 'casa' }
  | { tipo: 'sitio'; sitioId: string }
  | { tipo: 'otro'; direccion: string; coordenadas: Coordenadas | null };

// Los eventos guardados antes de este cambio tenían { nombre, direccion,
// coordenadas }: se leen como "otro sitio" con esa dirección.
export function normalizarLugar(lugar: unknown): LugarEvento | null {
  if (!lugar || typeof lugar !== 'object') return null;
  const l = lugar as Record<string, unknown>;
  if (l.tipo === 'casa') return { tipo: 'casa' };
  if (l.tipo === 'sitio' && typeof l.sitioId === 'string') return { tipo: 'sitio', sitioId: l.sitioId };
  if (typeof l.direccion === 'string') {
    return {
      tipo: 'otro',
      direccion: l.direccion,
      coordenadas: (l.coordenadas as Coordenadas | null | undefined) ?? null,
    };
  }
  return null;
}

export type Evento = {
  id: string;
  titulo: string;
  // Día del evento. Si se repite, es el primer día de la serie.
  // En las tareas flexibles, el día para el que están previstas.
  fecha: ClaveDia;
  // Horas "HH:MM". Las tareas flexibles no tienen hora fija: van a null.
  horaInicio: Hora | null;
  horaFin: Hora | null;
  tipo: TipoEvento;
  lugar: LugarEvento | null;
  notas: string;
  repeticion: Repeticion; // las tareas flexibles no se repiten
  flexible: boolean;
  duracionMin: number | null; // solo en tareas flexibles
  hecha: boolean; // solo en tareas flexibles
  foco: boolean; // bloque de foco: tiempo protegido
  ejemplo: boolean; // creado como ejemplo (se puede borrar desde Perfil)
};

// Lo que tiene que saber hacer el guardado, sea SQLite (móvil) o el
// navegador (web). Las pantallas no lo usan directamente: usan data/eventos.
export type RepositorioEventos = {
  leerTodos(): Promise<Evento[]>;
  guardar(evento: Evento): Promise<void>; // crea o sustituye
  borrar(id: string): Promise<void>;
  borrarEjemplos(): Promise<void>;
};
