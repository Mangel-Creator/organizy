import type { Hora, Lugar } from '@/data/perfil';
import type { ClaveDia } from '@/services/fechas';

// Qué es un evento en Organizy. Lo usan el guardado (SQLite o navegador),
// las pantallas y la lógica de services/agenda.

export type TipoEvento = 'cliente' | 'amigos' | 'yo';
export type Repeticion = 'nunca' | 'diaria' | 'semanal' | 'mensual';

// Lugar de un evento: uno de los sitios habituales del perfil (con su nombre)
// o una dirección nueva (nombre null).
export type LugarEvento = Lugar & { nombre: string | null };

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
