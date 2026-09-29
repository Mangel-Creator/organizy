import {
  AVISOS_EMPRESA_POR_DEFECTO,
  type Anuncio,
  type AvisosEmpresa,
  type BloqueOcupado,
  type CanalChat,
  type MensajeChat,
  type CambioTurno,
  type DatosEmpresa,
  type EventoEmpresa,
  type Respuesta,
  type Situacion,
  type TareaEmpresa,
  type Turno,
} from '@/data/empresa/tipos';
import { normalizarCuadrante } from '@/data/eventos/tipos';
import type { Coordenadas } from '@/data/perfil';
import { claveDia, sumarDias } from '@/services/fechas';

import { baseSupabase, type Base, type Fila } from './base';
import { basePrueba, modoPruebaEmpresa } from './prueba';

// Lo que la app pide al servidor de la empresa (tablas con RLS y funciones empresa_*).
// Nada personal: solo lo de la empresa.

export function base(): Base {
  return modoPruebaEmpresa() ? basePrueba : baseSupabase;
}

// Lo que se trae: turnos y eventos desde hace 5 semanas (y lo que venga).
const SEMANAS_ATRAS = 5;

const texto = (v: unknown) => (typeof v === 'string' ? v : '');
const textoONulo = (v: unknown) => (typeof v === 'string' && v !== '' ? v : null);
const hora = (v: unknown) => (typeof v === 'string' ? v.slice(0, 5) : null);
const dia = (v: unknown) => (typeof v === 'string' ? v.slice(0, 10) : '');

function coordenadas(f: Fila): Coordenadas | null {
  return typeof f.latitud === 'number' && typeof f.longitud === 'number' ? { latitud: f.latitud, longitud: f.longitud } : null;
}

function aEvento(f: Fila): EventoEmpresa {
  return {
    id: texto(f.id),
    equipoId: textoONulo(f.equipo_id),
    titulo: texto(f.titulo),
    clase: (['reunion', 'festivo', 'cierre', 'formacion', 'otro'].includes(texto(f.clase)) ? f.clase : 'otro') as EventoEmpresa['clase'],
    fecha: dia(f.fecha),
    inicio: hora(f.inicio),
    fin: hora(f.fin),
    lugar: texto(f.lugar),
    coordenadas: coordenadas(f),
    notas: texto(f.notas),
    pideRespuesta: f.pide_respuesta === true,
    creadoPor: textoONulo(f.creado_por),
  };
}

function aTurno(f: Fila): Turno {
  return {
    id: texto(f.id),
    equipoId: textoONulo(f.equipo_id),
    usuario: texto(f.usuario),
    fecha: dia(f.fecha),
    entrada: hora(f.entrada) ?? '09:00',
    salida: hora(f.salida) ?? '17:00',
    sitio: texto(f.sitio),
    coordenadas: coordenadas(f),
    notas: texto(f.notas),
  };
}

function aCambio(f: Fila): CambioTurno {
  return {
    id: texto(f.id),
    turnoId: texto(f.turno_id),
    usuario: texto(f.usuario),
    fecha: f.fecha ? dia(f.fecha) : null,
    entrada: hora(f.entrada),
    salida: hora(f.salida),
    cubre: textoONulo(f.cubre),
    motivo: texto(f.motivo),
    estado: (['pendiente', 'aprobado', 'rechazado'].includes(texto(f.estado)) ? f.estado : 'pendiente') as CambioTurno['estado'],
    creado: texto(f.creado),
  };
}

function aTarea(f: Fila): TareaEmpresa {
  return {
    id: texto(f.id),
    equipoId: textoONulo(f.equipo_id),
    usuario: textoONulo(f.usuario),
    titulo: texto(f.titulo),
    notas: texto(f.notas),
    fechaLimite: dia(f.fecha_limite),
    cuadrante: normalizarCuadrante(f.cuadrante),
    duracionMin: typeof f.duracion_min === 'number' ? f.duracion_min : 30,
    hecha: f.hecha === true,
    hechaPor: textoONulo(f.hecha_por),
    hechaEl: textoONulo(f.hecha_el),
    creadoPor: textoONulo(f.creado_por),
  };
}

function aBloques(v: unknown): BloqueOcupado[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (b): b is BloqueOcupado =>
      !!b && typeof b === 'object' && typeof b.d === 'string' && typeof b.i === 'number' && typeof b.f === 'number',
  );
}

function aAvisos(f: Fila | undefined): AvisosEmpresa {
  if (!f) return AVISOS_EMPRESA_POR_DEFECTO;
  return {
    turnos: f.turnos !== false,
    tareas: f.tareas !== false,
    eventos: f.eventos !== false,
    cambios: f.cambios !== false,
    altas: f.altas !== false,
    chat: f.chat !== false,
    anuncios: f.anuncios !== false,
  };
}

function aCanal(c: Fila, r: Fila | undefined): CanalChat {
  const tipo = (['general', 'equipo', 'privado'].includes(texto(c.tipo)) ? c.tipo : 'general') as CanalChat['tipo'];
  return {
    id: texto(c.id),
    tipo,
    equipoId: textoONulo(c.equipo_id),
    personas: tipo === 'privado' ? [texto(c.persona_a), texto(c.persona_b)] : null,
    sinLeer: typeof r?.sin_leer === 'number' ? r.sin_leer : 0,
    ultimo: r?.ultimo_el ? { texto: texto(r.ultimo_texto), autor: textoONulo(r.ultimo_autor), el: texto(r.ultimo_el) } : null,
  };
}

function aAnuncio(f: Fila): Anuncio {
  return {
    id: texto(f.id),
    equipoId: textoONulo(f.equipo_id),
    autor: textoONulo(f.autor),
    titulo: texto(f.titulo),
    texto: texto(f.texto),
    importante: f.importante === true,
    creado: texto(f.creado),
  };
}

function aMensaje(f: Fila): MensajeChat {
  return {
    id: texto(f.id),
    canalId: texto(f.canal_id),
    autor: textoONulo(f.autor),
    texto: texto(f.texto),
    borrado: f.borrado === true,
    creado: texto(f.creado),
  };
}

// Dónde está esta persona y, si está dentro, todo lo que ve de su empresa.
export async function traerSituacion(ahora = new Date()): Promise<Situacion> {
  const b = base();
  const u = await b.usuario();
  if (!u) return { fase: 'sin-sesion' };
  const [yo] = await b.leer('empresa_miembros', [{ columna: 'usuario', es: 'igual', valor: u.id }]);
  if (!yo) return { fase: 'sin-empresa', correo: u.correo };
  const [empresa] = await b.leer('empresas', [{ columna: 'id', es: 'igual', valor: texto(yo.empresa_id) }]);
  if (yo.estado !== 'activo') return { fase: 'pendiente', correo: u.correo, empresa: texto(empresa?.nombre) };

  const desde = sumarDias(claveDia(ahora), -7 * SEMANAS_ATRAS);
  const admin = yo.rol === 'admin';
  const [miembros, equipos, enEquipos, invitaciones, enlaces, eventos, respuestas, turnos, cambios, tareas, ocupados, avisos, canales, resumen, anuncios, leidos] =
    await Promise.all([
      b.leer('empresa_miembros'),
      b.leer('equipos'),
      b.leer('equipo_miembros'),
      admin ? b.leer('invitaciones_correo') : Promise.resolve([]),
      admin ? b.leer('invitaciones_enlace') : Promise.resolve([]),
      b.leer('eventos_empresa', [{ columna: 'fecha', es: 'desde', valor: desde }]),
      b.leer('respuestas_evento'),
      b.leer('turnos', [{ columna: 'fecha', es: 'desde', valor: desde }]),
      b.leer('cambios_turno'),
      b.leer('tareas_empresa'),
      b.leer('ocupado_compartido'),
      b.leer('empresa_avisos', [{ columna: 'usuario', es: 'igual', valor: u.id }]),
      b.leer('chat_canales'),
      b.rpc<Fila[]>('chat_resumen', {}).then((r) => r ?? []),
      b.leer('anuncios'),
      b.leer('anuncios_leidos'),
    ]);
  const datos: DatosEmpresa = {
    yo: u.id,
    empresa: {
      id: texto(empresa?.id),
      nombre: texto(empresa?.nombre),
      dominio: textoONulo(empresa?.dominio),
      aprobarSolo: empresa?.aprobar_solo === true,
    },
    miembros: miembros.map((m) => ({
      usuario: texto(m.usuario),
      nombre: texto(m.nombre),
      email: texto(m.email),
      rol: m.rol === 'admin' ? 'admin' : 'empleado',
      estado: m.estado === 'activo' ? 'activo' : 'pendiente',
      via: (['creador', 'dominio', 'lista', 'enlace'].includes(texto(m.via)) ? m.via : 'enlace') as DatosEmpresa['miembros'][number]['via'],
      comparteOcupado: m.comparte_ocupado === true,
      alta: texto(m.alta),
    })),
    equipos: equipos.map((e) => ({ id: texto(e.id), nombre: texto(e.nombre) })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    enEquipos: enEquipos.map((e) => ({ equipoId: texto(e.equipo_id), usuario: texto(e.usuario), responsable: e.responsable === true })),
    invitaciones: invitaciones.map((i) => ({ email: texto(i.email), creada: texto(i.creada) })),
    enlaces: enlaces.map((e) => ({ codigo: texto(e.codigo), caduca: texto(e.caduca), anulada: e.anulada === true, creada: texto(e.creada) })),
    eventos: eventos.map(aEvento),
    respuestas: respuestas.map((r) => ({
      eventoId: texto(r.evento_id),
      usuario: texto(r.usuario),
      respuesta: r.respuesta === 'no-voy' ? 'no-voy' : 'voy',
    })),
    turnos: turnos.map(aTurno),
    cambios: cambios.map(aCambio),
    tareas: tareas.map(aTarea).filter((t) => !t.hecha || (t.hechaEl ?? '') >= sumarDias(claveDia(ahora), -30)),
    ocupados: ocupados.map((o) => ({ usuario: texto(o.usuario), bloques: aBloques(o.bloques), actualizado: texto(o.actualizado) })),
    avisos: aAvisos(avisos[0]),
    canales: canales.map((c) => aCanal(c, resumen.find((r) => r.canal_id === c.id))),
    anuncios: anuncios.map(aAnuncio).sort((a, b) => b.creado.localeCompare(a.creado)),
    anunciosLeidos: leidos.map((l) => ({ anuncioId: texto(l.anuncio_id), usuario: texto(l.usuario), el: texto(l.el) })),
  };
  return { fase: 'dentro', correo: u.correo, datos };
}

// --- Entrar en una empresa ---

export const crearEmpresa = (nombre: string, miNombre: string) =>
  base().rpc<string>('empresa_crear', { p_nombre: nombre, p_mi_nombre: miNombre });

export const unirme = (codigo: string | null, miNombre: string) =>
  base().rpc<'activo' | 'pendiente'>('empresa_unirme', { p_codigo: codigo, p_mi_nombre: miNombre });

export const salirEnServidor = () => base().rpc('empresa_salir', {});
export const borrarEmpresaEnServidor = () => base().rpc('empresa_borrar', {});

// --- Gente (administrador) ---

export const aprobar = (usuario: string, si: boolean) => base().rpc('empresa_aprobar', { p_usuario: usuario, p_aprobar: si });
export const cambiarRol = (usuario: string, rol: 'admin' | 'empleado') =>
  base().rpc('empresa_cambiar_rol', { p_usuario: usuario, p_rol: rol });
export const quitarDeLaEmpresa = (usuario: string) => base().rpc('empresa_quitar', { p_usuario: usuario });
export const ajustesEmpresa = (nombre: string, dominio: string | null, aprobarSolo: boolean) =>
  base().rpc('empresa_ajustes', { p_nombre: nombre, p_dominio: dominio, p_aprobar_solo: aprobarSolo });
export const misDatos = (nombre: string | null, comparte: boolean | null) =>
  base().rpc('empresa_mis_datos', { p_nombre: nombre, p_comparte: comparte });

export async function invitarCorreos(empresaId: string, correos: string[]) {
  if (correos.length === 0) return;
  for (const email of correos) {
    await base().guardarFila('invitaciones_correo', { empresa_id: empresaId, email }, 'empresa_id,email');
  }
}
export const quitarInvitacion = (empresaId: string, email: string) =>
  base().borrar('invitaciones_correo', { empresa_id: empresaId, email });

export async function crearEnlace(empresaId: string, dias: number): Promise<string> {
  const caduca = new Date(Date.now() + dias * 86400000).toISOString();
  const [fila] = await base().insertar('invitaciones_enlace', [{ empresa_id: empresaId, caduca }]);
  return texto(fila?.codigo);
}
export const anularEnlace = (codigo: string) => base().cambiar('invitaciones_enlace', { codigo }, { anulada: true });

export async function guardarEquipo(empresaId: string, equipo: { id?: string; nombre: string }) {
  if (equipo.id) await base().cambiar('equipos', { id: equipo.id }, { nombre: equipo.nombre });
  else await base().insertar('equipos', [{ empresa_id: empresaId, nombre: equipo.nombre }]);
}
export const borrarEquipo = (id: string) => base().borrar('equipos', { id });

// Meter, sacar o hacer responsable a alguien de un equipo (null = sacarle).
export async function ponerEnEquipo(empresaId: string, equipoId: string, usuario: string, responsable: boolean | null) {
  if (responsable === null) await base().borrar('equipo_miembros', { equipo_id: equipoId, usuario });
  else {
    await base().guardarFila(
      'equipo_miembros',
      { equipo_id: equipoId, empresa_id: empresaId, usuario, responsable },
      'equipo_id,usuario',
    );
  }
}

// --- Calendario de empresa ---

export type EventoNuevo = Omit<EventoEmpresa, 'id' | 'creadoPor'> & { id?: string };

function filaEvento(empresaId: string, e: EventoNuevo): Fila {
  return {
    empresa_id: empresaId,
    equipo_id: e.equipoId,
    titulo: e.titulo,
    clase: e.clase,
    fecha: e.fecha,
    inicio: e.inicio,
    fin: e.fin,
    lugar: e.lugar,
    latitud: e.coordenadas?.latitud ?? null,
    longitud: e.coordenadas?.longitud ?? null,
    notas: e.notas,
    pide_respuesta: e.pideRespuesta,
  };
}

export async function guardarEventoEmpresa(empresaId: string, e: EventoNuevo) {
  if (e.id) await base().cambiar('eventos_empresa', { id: e.id }, filaEvento(empresaId, e));
  else await base().insertar('eventos_empresa', [filaEvento(empresaId, e)]);
}
export const borrarEventoEmpresa = (id: string) => base().borrar('eventos_empresa', { id });

export async function responder(empresaId: string, yo: string, eventoId: string, respuesta: Respuesta | null) {
  if (respuesta === null) await base().borrar('respuestas_evento', { evento_id: eventoId, usuario: yo });
  else {
    await base().guardarFila(
      'respuestas_evento',
      { evento_id: eventoId, empresa_id: empresaId, usuario: yo, respuesta, el: new Date().toISOString() },
      'evento_id,usuario',
    );
  }
}

// --- Turnos ---

export type TurnoNuevo = Omit<Turno, 'id'> & { id?: string };

function filaTurno(empresaId: string, t: TurnoNuevo): Fila {
  return {
    empresa_id: empresaId,
    equipo_id: t.equipoId,
    usuario: t.usuario,
    fecha: t.fecha,
    entrada: t.entrada,
    salida: t.salida,
    sitio: t.sitio,
    latitud: t.coordenadas?.latitud ?? null,
    longitud: t.coordenadas?.longitud ?? null,
    notas: t.notas,
  };
}

// Los nuevos van de una vez (así llega un solo aviso por persona: "5 turnos nuevos").
export async function guardarTurnos(empresaId: string, turnos: TurnoNuevo[]) {
  const nuevos = turnos.filter((t) => !t.id);
  if (nuevos.length > 0) await base().insertar('turnos', nuevos.map((t) => filaTurno(empresaId, t)));
  for (const t of turnos.filter((x) => x.id)) await base().cambiar('turnos', { id: t.id }, filaTurno(empresaId, t));
}
export const borrarTurno = (id: string) => base().borrar('turnos', { id });

export type CambioNuevo = Pick<CambioTurno, 'turnoId' | 'fecha' | 'entrada' | 'salida' | 'cubre' | 'motivo'>;

export async function pedirCambio(empresaId: string, yo: string, c: CambioNuevo) {
  await base().insertar('cambios_turno', [
    {
      empresa_id: empresaId,
      turno_id: c.turnoId,
      usuario: yo,
      fecha: c.fecha,
      entrada: c.entrada,
      salida: c.salida,
      cubre: c.cubre,
      motivo: c.motivo,
      estado: 'pendiente',
    },
  ]);
}
export const retirarCambio = (id: string) => base().borrar('cambios_turno', { id });
export const resolverCambio = (id: string, aprobar: boolean) =>
  base().rpc('empresa_resolver_cambio', { p_id: id, p_aprobar: aprobar });

// --- Tareas ---

export type TareaNueva = Pick<TareaEmpresa, 'equipoId' | 'usuario' | 'titulo' | 'notas' | 'fechaLimite' | 'cuadrante' | 'duracionMin'> & {
  id?: string;
};

function filaTarea(empresaId: string, t: TareaNueva): Fila {
  return {
    empresa_id: empresaId,
    equipo_id: t.equipoId,
    usuario: t.usuario,
    titulo: t.titulo,
    notas: t.notas,
    fecha_limite: t.fechaLimite,
    cuadrante: t.cuadrante,
    duracion_min: t.duracionMin,
  };
}

export async function guardarTarea(empresaId: string, t: TareaNueva) {
  if (t.id) await base().cambiar('tareas_empresa', { id: t.id }, filaTarea(empresaId, t));
  else await base().insertar('tareas_empresa', [filaTarea(empresaId, t)]);
}
export const borrarTarea = (id: string) => base().borrar('tareas_empresa', { id });
export const marcarTarea = (id: string, hecha: boolean) => base().rpc('empresa_marcar_tarea', { p_id: id, p_hecha: hecha });

// --- Lo de cada uno ---

export async function subirOcupado(empresaId: string, yo: string, bloques: BloqueOcupado[]) {
  await base().guardarFila(
    'ocupado_compartido',
    { usuario: yo, empresa_id: empresaId, bloques, actualizado: new Date().toISOString() },
    'usuario',
  );
}

// Qué avisos quiere y la dirección de avisos de este móvil (se guardan las 5 últimas).
export async function guardarAvisos(yo: string, avisos: AvisosEmpresa, token: string | null) {
  const [actual] = await base().leer('empresa_avisos', [{ columna: 'usuario', es: 'igual', valor: yo }]);
  const tokens = Array.isArray(actual?.tokens) ? (actual.tokens as string[]) : [];
  const nuevos = token ? [token, ...tokens.filter((t) => t !== token)].slice(0, 5) : tokens;
  await base().guardarFila('empresa_avisos', { usuario: yo, tokens: nuevos, ...avisos }, 'usuario');
}

// --- Chat (fase 15b) ---

// Los últimos mensajes de un canal, del más antiguo al más nuevo.
export async function leerMensajes(canalId: string, cuantos = 150): Promise<MensajeChat[]> {
  const filas = await base().leer('chat_mensajes', [{ columna: 'canal_id', es: 'igual', valor: canalId }]);
  return filas
    .map(aMensaje)
    .sort((a, b) => a.creado.localeCompare(b.creado))
    .slice(-cuantos);
}

export async function enviarMensaje(empresaId: string, canalId: string, textoMensaje: string) {
  await base().insertar('chat_mensajes', [{ empresa_id: empresaId, canal_id: canalId, texto: textoMensaje }]);
}

export const borrarMensaje = (id: string) => base().rpc('chat_borrar_mensaje', { p_id: id });

export async function marcarCanalLeido(canalId: string, yo: string) {
  await base().guardarFila('chat_leidos', { canal_id: canalId, usuario: yo, leido_hasta: new Date().toISOString() }, 'canal_id,usuario');
}

// El chat privado con alguien (lo crea si no existe). Devuelve el id del canal.
export const abrirPrivado = (persona: string) => base().rpc<string>('chat_privado', { p_persona: persona });

// Avisa cuando llega algo nuevo a ese canal (al momento con Supabase Realtime).
export const escucharCanal = (canalId: string, alLlegar: () => void) => base().escuchar('chat_mensajes', 'canal_id', canalId, alLlegar);

// --- Avisos de los superiores (fase 15b) ---

export type AnuncioNuevo = Pick<Anuncio, 'equipoId' | 'titulo' | 'texto' | 'importante'>;

export async function publicarAnuncio(empresaId: string, a: AnuncioNuevo) {
  await base().insertar('anuncios', [
    { empresa_id: empresaId, equipo_id: a.equipoId, titulo: a.titulo, texto: a.texto, importante: a.importante },
  ]);
}
export const borrarAnuncio = (id: string) => base().borrar('anuncios', { id });

// Una sola vez por aviso (si ya estaba, no pasa nada).
export async function marcarAnuncioLeido(anuncioId: string, yo: string) {
  try {
    await base().insertar('anuncios_leidos', [{ anuncio_id: anuncioId, usuario: yo }]);
  } catch (error) {
    if (!/duplicate|23505|ya/i.test(String((error as Error)?.message ?? ''))) throw error;
  }
}
