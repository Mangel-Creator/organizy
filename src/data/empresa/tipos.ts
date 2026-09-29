import type { Cuadrante } from '@/data/eventos/tipos';
import type { Coordenadas, Hora } from '@/data/perfil';
import type { ClaveDia } from '@/services/fechas';

// Organizy grupal (fase 15): lo de la empresa tal como lo guarda el servidor
// (supabase/migrations/20260929010000_empresa.sql) y la copia del móvil. Nada personal.

export type Rol = 'admin' | 'empleado';
export type EstadoMiembro = 'pendiente' | 'activo';
export type ViaAlta = 'creador' | 'dominio' | 'lista' | 'enlace';

export type Empresa = {
  id: string;
  nombre: string;
  dominio: string | null; // "suempresa.com": entra quien tenga un correo de ahí
  aprobarSolo: boolean;
};

export type Miembro = {
  usuario: string;
  nombre: string;
  email: string;
  rol: Rol;
  estado: EstadoMiembro;
  via: ViaAlta;
  comparteOcupado: boolean;
  alta: string; // ISO
};

export type Equipo = { id: string; nombre: string };
export type EnEquipo = { equipoId: string; usuario: string; responsable: boolean };

export type InvitacionCorreo = { email: string; creada: string };
export type EnlaceInvitacion = { codigo: string; caduca: string; anulada: boolean; creada: string };

export type ClaseEvento = 'reunion' | 'festivo' | 'cierre' | 'formacion' | 'otro';

export type EventoEmpresa = {
  id: string;
  equipoId: string | null; // null = toda la empresa
  titulo: string;
  clase: ClaseEvento;
  fecha: ClaveDia;
  inicio: Hora | null; // sin horas = todo el día
  fin: Hora | null;
  lugar: string;
  coordenadas: Coordenadas | null;
  notas: string;
  pideRespuesta: boolean; // "¿Vienes?"
  creadoPor: string | null;
};

export type Respuesta = 'voy' | 'no-voy';
export type RespuestaEvento = { eventoId: string; usuario: string; respuesta: Respuesta };

export type Turno = {
  id: string;
  equipoId: string | null;
  usuario: string;
  fecha: ClaveDia;
  entrada: Hora;
  salida: Hora; // antes que la entrada = acaba al día siguiente
  sitio: string; // vacío = su sitio "Trabajo" del perfil
  coordenadas: Coordenadas | null;
  notas: string;
};

export type EstadoCambio = 'pendiente' | 'aprobado' | 'rechazado';

export type CambioTurno = {
  id: string;
  turnoId: string;
  usuario: string;
  fecha: ClaveDia | null; // null = el mismo día
  entrada: Hora | null;
  salida: Hora | null;
  cubre: string | null; // otra persona que lo haga
  motivo: string;
  estado: EstadoCambio;
  creado: string;
};

export type TareaEmpresa = {
  id: string;
  equipoId: string | null;
  usuario: string | null; // null = para todo el equipo
  titulo: string;
  notas: string;
  fechaLimite: ClaveDia;
  cuadrante: Cuadrante | null;
  duracionMin: number;
  hecha: boolean;
  hechaPor: string | null;
  hechaEl: string | null;
  creadoPor: string | null;
};

// Un rato ocupado: día y minutos desde medianoche. Sin título, sin lugar y sin tipo.
export type BloqueOcupado = { d: ClaveDia; i: number; f: number };
export type OcupadoDe = { usuario: string; bloques: BloqueOcupado[]; actualizado: string };

export type AvisosEmpresa = { turnos: boolean; tareas: boolean; eventos: boolean; cambios: boolean; altas: boolean };

export const AVISOS_EMPRESA_POR_DEFECTO: AvisosEmpresa = {
  turnos: true,
  tareas: true,
  eventos: true,
  cambios: true,
  altas: true,
};

// Todo lo de la empresa que ve esta persona (lo que dejan las reglas del servidor).
export type DatosEmpresa = {
  yo: string; // mi usuario de empresa
  empresa: Empresa;
  miembros: Miembro[];
  equipos: Equipo[];
  enEquipos: EnEquipo[];
  invitaciones: InvitacionCorreo[]; // solo el administrador
  enlaces: EnlaceInvitacion[]; // solo el administrador
  eventos: EventoEmpresa[];
  respuestas: RespuestaEvento[];
  turnos: Turno[];
  cambios: CambioTurno[];
  tareas: TareaEmpresa[];
  ocupados: OcupadoDe[]; // solo quien lleva a esas personas
  avisos: AvisosEmpresa;
};

// En qué punto está esta persona.
export type Situacion =
  | { fase: 'sin-sesion' }
  | { fase: 'sin-empresa'; correo: string }
  | { fase: 'pendiente'; correo: string; empresa: string }
  | { fase: 'dentro'; correo: string; datos: DatosEmpresa };

export type EstadoEmpresa = {
  cargado: boolean;
  modo: boolean; // "Organizy grupal" activado en Perfil
  situacion: Situacion;
  traidoEl: string | null; // última vez que se trajo del servidor (ISO)
};

// Lo que tiene que saber hacer la copia del móvil (SQLite) o de la web (AsyncStorage).
export type RepositorioEmpresa = {
  leer(): Promise<string | null>;
  guardar(texto: string): Promise<void>;
  borrar(): Promise<void>;
};
