import type { DatosEmpresa, Equipo, Miembro } from '@/data/empresa/tipos';

// Quién puede hacer qué en la empresa (lo mismo que comprueba el servidor; aquí solo
// sirve para enseñar u ocultar botones).
//   - Administrador: todo.
//   - Responsable: turnos, tareas y eventos de los equipos que lleva.
//   - Empleado: ve lo suyo y lo de sus equipos, marca tareas y responde a eventos.

export type Papel = 'admin' | 'responsable' | 'empleado';

export const NOMBRE_PAPEL: Record<Papel, string> = {
  admin: 'Administrador',
  responsable: 'Responsable',
  empleado: 'Empleado',
};

export function miembro(datos: DatosEmpresa, usuario: string): Miembro | null {
  return datos.miembros.find((m) => m.usuario === usuario) ?? null;
}

export function soyAdmin(datos: DatosEmpresa): boolean {
  return miembro(datos, datos.yo)?.rol === 'admin';
}

export function papelDe(datos: DatosEmpresa, usuario: string): Papel {
  if (miembro(datos, usuario)?.rol === 'admin') return 'admin';
  return datos.enEquipos.some((e) => e.usuario === usuario && e.responsable) ? 'responsable' : 'empleado';
}

export function equiposDe(datos: DatosEmpresa, usuario: string): Equipo[] {
  const ids = new Set(datos.enEquipos.filter((e) => e.usuario === usuario).map((e) => e.equipoId));
  return datos.equipos.filter((e) => ids.has(e.id));
}

// Los equipos que puedo gestionar (todos si soy administrador).
export function equiposQueLlevo(datos: DatosEmpresa): Equipo[] {
  if (soyAdmin(datos)) return datos.equipos;
  const ids = new Set(datos.enEquipos.filter((e) => e.usuario === datos.yo && e.responsable).map((e) => e.equipoId));
  return datos.equipos.filter((e) => ids.has(e.id));
}

export function gestionoEquipo(datos: DatosEmpresa, equipoId: string | null): boolean {
  if (soyAdmin(datos)) return true;
  return equipoId !== null && equiposQueLlevo(datos).some((e) => e.id === equipoId);
}

// ¿Gestiono algo? (administrador o responsable de algún equipo): turnos, tareas...
export function gestionoAlgo(datos: DatosEmpresa): boolean {
  return soyAdmin(datos) || equiposQueLlevo(datos).length > 0;
}

// Personas activas de un equipo (o de toda la empresa con null), por nombre.
export function personasDe(datos: DatosEmpresa, equipoId: string | null): Miembro[] {
  const activos = datos.miembros.filter((m) => m.estado === 'activo');
  const lista =
    equipoId === null
      ? activos
      : activos.filter((m) => datos.enEquipos.some((e) => e.equipoId === equipoId && e.usuario === m.usuario));
  return [...lista].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es'));
}

// Las personas que llevo: las de mis equipos (o todas si soy administrador).
export function personasQueLlevo(datos: DatosEmpresa): Miembro[] {
  if (soyAdmin(datos)) return personasDe(datos, null);
  const ids = new Set(equiposQueLlevo(datos).map((e) => e.id));
  return personasDe(datos, null).filter((m) =>
    datos.enEquipos.some((e) => ids.has(e.equipoId) && e.usuario === m.usuario),
  );
}

// "Laura" o, si no puso nombre, lo de antes de la @ de su correo.
export function nombreDe(m: Pick<Miembro, 'nombre' | 'email'> | null | undefined): string {
  if (!m) return 'Alguien';
  return m.nombre.trim() || m.email.split('@')[0] || 'Alguien';
}

export function nombreDeUsuario(datos: DatosEmpresa, usuario: string | null): string {
  if (!usuario) return 'Alguien';
  if (usuario === datos.yo) return 'Tú';
  return nombreDe(miembro(datos, usuario));
}

export function nombreEquipo(datos: DatosEmpresa, equipoId: string | null): string {
  if (!equipoId) return 'Toda la empresa';
  return datos.equipos.find((e) => e.id === equipoId)?.nombre ?? 'Equipo';
}
