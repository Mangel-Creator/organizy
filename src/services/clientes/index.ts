import type { DatosCliente, Evento } from '@/data/eventos/tipos';
import type { Perfil } from '@/data/perfil';
import { intervaloDe, ocurreEnDia, resolverLugar } from '@/services/agenda';
import {
  claveDia,
  fechaDesdeClave,
  formatearDiaCorto,
  formatearFechaLarga,
  formatearHora,
  minutosDelDia,
  sumarDias,
  type ClaveDia,
} from '@/services/fechas';
import { enlaceWhatsapp } from '@/services/rutas/textos';

// Recordatorios a clientes por WhatsApp (fase 10, parte A). Funciones puras, con
// pruebas en __tests__. Nada sale del dispositivo: la app abre WhatsApp en el chat del
// cliente con el mensaje escrito y lo envía la persona.

// Prefijo que se pone a los móviles españoles escritos sin prefijo (612 34 56 78).
export const PREFIJO_ESPANA = '34';

// Pasa un teléfono escrito a mano al formato de WhatsApp: solo cifras y con el prefijo
// del país. "612 34 56 78" -> "34612345678"; "+351 912 345 678" -> "351912345678".
// Devuelve null si no parece un teléfono.
export function telefonoWhatsapp(texto: string): string | null {
  const limpio = texto.trim().replace(/[\s.\-()/]/g, '');
  if (!limpio) return null;
  let cifras: string;
  if (limpio.startsWith('+')) cifras = limpio.slice(1);
  else if (limpio.startsWith('00')) cifras = limpio.slice(2);
  else if (/^[6789]\d{8}$/.test(limpio)) cifras = PREFIJO_ESPANA + limpio;
  else cifras = limpio;
  if (!/^\d{8,15}$/.test(cifras)) return null;
  // Sin prefijo solo se aceptan los números españoles de 9 cifras (arriba).
  if (!limpio.startsWith('+') && !limpio.startsWith('00') && cifras.length < 11) return null;
  return cifras;
}

export const ERROR_TELEFONO = 'Revisa el teléfono: por ejemplo 612 34 56 78 o +351 912 345 678.';
export const ERROR_SIN_TELEFONO = 'Pon su teléfono para poder recordárselo.';

// Una cita a la que se le puede mandar el recordatorio: de Clientes, con hora, con el
// cliente de acuerdo y un teléfono válido. Sin la casilla marcada no se manda nada.
export function puedeRecordar(evento: Evento): boolean {
  const cliente = evento.cliente;
  return (
    evento.tipo === 'cliente' &&
    !evento.flexible &&
    !!evento.horaInicio &&
    !!cliente?.acepta &&
    telefonoWhatsapp(cliente.telefono) !== null
  );
}

// Clave de un envío: la misma cita repetida tiene un recordatorio por cada día.
export function claveEnvio(eventoId: string, dia: ClaveDia): string {
  return `${eventoId}:${dia}`;
}

// El próximo día en que la cita aún no ha empezado (hoy incluido), mirando como mucho
// un año. null si ya pasó (o si es una serie que ya no vuelve a caer).
export function proximaCita(evento: Evento, ahora: Date, diasMax = 366): ClaveDia | null {
  if (evento.flexible || !evento.horaInicio) return null;
  const hoy = claveDia(ahora);
  const inicio = intervaloDe(evento).inicio;
  const desde = evento.fecha > hoy ? evento.fecha : hoy;
  for (let n = 0; n <= diasMax; n++) {
    const dia = sumarDias(desde, n);
    if (!ocurreEnDia(evento, dia)) continue;
    if (dia === hoy && inicio <= minutosDelDia(ahora)) continue;
    return dia;
  }
  return null;
}

// Dónde es la cita, como se lo diríamos al cliente: la dirección (el cliente no sabe qué
// es "Oficina" en tu perfil) o, si no hay, el nombre del sitio.
export function lugarParaCliente(evento: Evento, perfil: Perfil | null): string | null {
  const lugar = resolverLugar(evento.lugar, perfil);
  if (!lugar) return null;
  return lugar.direccion.trim() || lugar.nombre;
}

// "viernes 3 de octubre"
function diaLargo(dia: ClaveDia): string {
  return formatearFechaLarga(fechaDesdeClave(dia)).replace(',', '');
}

// "mañana viernes 3 de octubre", "hoy" o "el viernes 3 de octubre".
export function cuandoEsLaCita(dia: ClaveDia, desde: ClaveDia): string {
  if (dia === desde) return 'hoy';
  if (dia === sumarDias(desde, 1)) return `mañana ${diaLargo(dia)}`;
  return `el ${diaLargo(dia)}`;
}

type DatosMensaje = {
  nombre: string;
  dia: ClaveDia;
  hora: string;
  lugar: string | null;
  desde: ClaveDia; // día en que se manda el mensaje
};

// "Hola Laura, te recuerdo nuestra cita mañana viernes 3 de octubre a las 10:30 en Calle
// Mayor 3, Huesca. Si no puedes venir, respóndeme a este mensaje."
// Es el mismo texto que la plantilla de WhatsApp Business de la parte B.
export function textoRecordatorioCliente({ nombre, dia, hora, lugar, desde }: DatosMensaje): string {
  const saludo = nombre.trim() ? `Hola ${nombre.trim()}` : 'Hola';
  const donde = lugar ? ` en ${lugar}` : '';
  return `${saludo}, te recuerdo nuestra cita ${cuandoEsLaCita(dia, desde)} a las ${hora}${donde}. Si no puedes venir, respóndeme a este mensaje.`;
}

// El recordatorio de una cita en un día concreto, con el enlace que abre el chat.
export function recordatorioDe(
  evento: Evento,
  cliente: DatosCliente,
  dia: ClaveDia,
  perfil: Perfil | null,
  ahora: Date,
): { texto: string; telefono: string; enlace: string } | null {
  const telefono = telefonoWhatsapp(cliente.telefono);
  if (!telefono || !evento.horaInicio) return null;
  const texto = textoRecordatorioCliente({
    nombre: cliente.nombre,
    dia,
    hora: evento.horaInicio,
    lugar: lugarParaCliente(evento, perfil),
    desde: claveDia(ahora),
  });
  return { texto, telefono, enlace: enlaceWhatsapp(texto, telefono) };
}

// --- Estado de cada envío (data/recordatorios.ts) ---

export type EstadoEnvio = 'pendiente' | 'enviado' | 'fallido';

export type EnvioRecordatorio = {
  estado: EstadoEnvio;
  el: string; // ISO: cuándo se envió o falló
  via: 'whatsapp' | 'automatico'; // "whatsapp": desde tu móvil (parte A); "automatico": parte B
  error?: string;
};

// "hoy a las 11:02", "ayer a las 11:02" o "el Jueves 24 sept a las 11:02".
export function cuandoFue(fecha: Date, ahora: Date): string {
  const dia = claveDia(fecha);
  const hoy = claveDia(ahora);
  const hora = formatearHora(fecha);
  if (dia === hoy) return `hoy a las ${hora}`;
  if (dia === sumarDias(hoy, -1)) return `ayer a las ${hora}`;
  return `el ${formatearDiaCorto(fecha).toLocaleLowerCase('es-ES')} a las ${hora}`;
}

// "Recordatorio enviado ayer a las 11:02" o, si falló, el motivo.
export function textoEstadoEnvio(envio: EnvioRecordatorio, ahora: Date): string {
  const cuando = cuandoFue(new Date(envio.el), ahora);
  if (envio.estado === 'enviado') return `Recordatorio enviado ${cuando}`;
  if (envio.estado === 'fallido') return `No se pudo enviar ${cuando}: ${envio.error ?? 'error desconocido.'}`;
  return 'Recordatorio pendiente de enviar';
}
