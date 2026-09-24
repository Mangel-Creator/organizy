import type { AjustesAvisos } from '@/data/avisos';
import type { Evento } from '@/data/eventos/tipos';
import type { Hora, Perfil } from '@/data/perfil';
import {
  calcularHuecos,
  cargaDelDia,
  duracionTarea,
  eventosDelDia,
  fraseResumen,
  intervaloDe,
  minutosDeJornada,
  NOMBRE_CASA,
  resolverLugar,
  tareasPendientes,
  unirConY,
  ventanaDelDia,
} from '@/services/agenda';
import {
  claveDia,
  fechaDesdeClave,
  horaDesdeMinutos,
  minutosDesdeHora,
  saludoSegunHora,
  sumarDias,
  type ClaveDia,
} from '@/services/fechas';

import type { AvisoPlanificado } from './tipos';

// Qué avisos hay que programar en los próximos días. Funciones puras (sin
// expo-notifications), con pruebas en __tests__.
//
// Cómo funciona: para cada día se llama a cada "generador" que esté activado
// en los ajustes; cada uno devuelve sus avisos de ese día. Luego se quitan los
// que ya han pasado, se ordenan por hora y se quedan los primeros MAX_AVISOS.
//
// Para añadir un tipo de aviso nuevo (fase 4b: inicio de bloque, hora de dormir...):
//   1. Añade el tipo en tipos.ts y su interruptor en data/avisos.ts.
//   2. Escribe su generador (ctx, dia) => AvisoPlanificado[] y añádelo a GENERADORES.

// iOS solo guarda 64 notificaciones programadas a la vez: dejamos margen.
export const MAX_AVISOS = 60;
// Días que se programan por adelantado. Se reprograma cada vez que se abre la app.
export const DIAS_A_PROGRAMAR = 7;

export const FRASE_DIA_JUSTO = 'Hoy va justo, mejor no metas nada más.';

export type ContextoAvisos = {
  ahora: Date;
  eventos: Evento[];
  perfil: Perfil;
  ajustes: AjustesAvisos;
};

type Generador = {
  activo: (ajustes: AjustesAvisos) => boolean;
  generar: (ctx: ContextoAvisos, dia: ClaveDia) => AvisoPlanificado[];
};

// Fecha de un día a cierta hora, en minutos desde medianoche. Admite minutos
// negativos o de más de 24 h (pasa al día anterior o al siguiente).
export function momento(dia: ClaveDia, minutos: number): Date {
  const fecha = fechaDesdeClave(dia);
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, minutos);
}

// 10 -> "En 10 min", 60 -> "En 1 hora", 90 -> "En 1 h 30 min"
export function textoAntelacion(minutos: number): string {
  if (minutos === 60) return 'En 1 hora';
  if (minutos % 60 === 0) return `En ${minutos / 60} horas`;
  if (minutos > 60) return `En ${Math.floor(minutos / 60)} h ${minutos % 60} min`;
  return `En ${minutos} min`;
}

// Antelación del aviso de un evento: la suya o la del perfil. 0 = sin aviso.
export function antelacionDe(evento: Evento, perfil: Perfil): number {
  return evento.avisoMin ?? perfil.antelacionAvisoMin;
}

// --- Aviso antes de cada evento ---

// "Oficina", "casa" o la dirección escrita a mano.
function textoLugar(evento: Evento, perfil: Perfil): string | null {
  const lugar = resolverLugar(evento.lugar, perfil);
  if (!lugar) return null;
  if (lugar.nombre === NOMBRE_CASA) return 'casa';
  return lugar.nombre ?? lugar.direccion;
}

function avisosDeEventos({ eventos, perfil }: ContextoAvisos, dia: ClaveDia): AvisoPlanificado[] {
  return eventosDelDia(eventos, dia).flatMap((evento) => {
    const antelacion = antelacionDe(evento, perfil);
    if (antelacion <= 0) return [];
    const lugar = textoLugar(evento, perfil);
    return [
      {
        id: `evento:${evento.id}:${dia}`,
        tipo: 'evento' as const,
        dia,
        cuando: momento(dia, intervaloDe(evento).inicio - antelacion),
        titulo: `${textoAntelacion(antelacion)}: ${evento.titulo}${lugar ? ` en ${lugar}` : ''}`,
        cuerpo: `${evento.horaInicio} – ${evento.horaFin}${evento.foco ? ' · Bloque de foco' : ''}`,
        destino: { pantalla: 'evento' as const, id: evento.id },
      },
    ];
  });
}

// --- Resumen de la mañana ---

// La misma frase que en Hoy, calculada para todo el día (desde que te levantas).
export function fraseDeLaManana(eventos: Evento[], perfil: Perfil, dia: ClaveDia): string {
  const delDia = eventosDelDia(eventos, dia);
  const ocupados = delDia.map(intervaloDe);
  const pendientes = tareasPendientes(eventos, dia, dia);
  const huecos = calcularHuecos(ocupados, ventanaDelDia(perfil));
  const frase = fraseResumen({ eventos: delDia, tareasPendientes: pendientes.length, huecos });
  const minutosTareas = pendientes.reduce((total, t) => total + duracionTarea(t), 0);
  const carga = cargaDelDia(ocupados, minutosTareas, minutosDeJornada(perfil));
  return carga.alta ? `${frase} ${FRASE_DIA_JUSTO}` : frase;
}

function avisoResumenManana({ eventos, perfil }: ContextoAvisos, dia: ClaveDia): AvisoPlanificado[] {
  const cuando = momento(dia, minutosDesdeHora(perfil.horario.levantarse));
  const nombre = perfil.nombre.trim();
  return [
    {
      id: `resumen-manana:${dia}`,
      tipo: 'resumen-manana',
      dia,
      cuando,
      titulo: `${saludoSegunHora(cuando)}${nombre ? `, ${nombre}` : ''}`,
      cuerpo: fraseDeLaManana(eventos, perfil, dia),
      destino: { pantalla: 'hoy' },
    },
  ];
}

// --- Cierre del día ---

// Minuto del cierre: una hora antes de acostarse. Si te acuestas después de
// medianoche, cae en la madrugada del día siguiente (más de 24 h).
export function minutoCierre(perfil: Perfil): number {
  const levantarse = minutosDesdeHora(perfil.horario.levantarse);
  let acostarse = minutosDesdeHora(perfil.horario.acostarse);
  if (acostarse <= levantarse) acostarse += 24 * 60;
  return acostarse - 60;
}

export function horaCierre(perfil: Perfil): Hora {
  return horaDesdeMinutos(minutoCierre(perfil));
}

// "Llamar al taller, Comprar pan, Pagar la luz y 2 más"
export function listaTareas(titulos: string[], maximo = 3): string {
  if (titulos.length <= maximo) return unirConY(titulos);
  return `${titulos.slice(0, maximo).join(', ')} y ${titulos.length - maximo} más`;
}

export function textoCierre(titulos: string[]): string {
  if (titulos.length === 1) return `Te quedó 1 cosa: ${titulos[0]}. ¿La paso a mañana?`;
  return `Te quedaron ${titulos.length} cosas: ${listaTareas(titulos)}. ¿Las paso a mañana?`;
}

export const FRASE_BUENAS_NOCHES = 'No te queda nada pendiente. ¡A descansar!';

function avisoCierreDia({ eventos, perfil, ajustes }: ContextoAvisos, dia: ClaveDia): AvisoPlanificado[] {
  const pendientes = tareasPendientes(eventos, dia, dia);
  const base = {
    id: `cierre-dia:${dia}`,
    tipo: 'cierre-dia' as const,
    dia,
    cuando: momento(dia, minutoCierre(perfil)),
    destino: { pantalla: 'hoy' as const },
  };
  if (pendientes.length > 0) {
    return [
      {
        ...base,
        titulo: 'Cierre del día',
        cuerpo: textoCierre(pendientes.map((t) => t.titulo)),
        categoria: 'cierre-dia',
      },
    ];
  }
  if (ajustes.cierreSinPendientes === 'nada') return [];
  const nombre = perfil.nombre.trim();
  return [{ ...base, titulo: `Buenas noches${nombre ? `, ${nombre}` : ''}`, cuerpo: FRASE_BUENAS_NOCHES }];
}

// --- Todos juntos ---

const GENERADORES: Generador[] = [
  { activo: (a) => a.eventos, generar: avisosDeEventos },
  { activo: (a) => a.resumenManana, generar: avisoResumenManana },
  { activo: (a) => a.cierreDia, generar: avisoCierreDia },
];

// Para probar desde Perfil: el resumen o el cierre de hoy tal cual llegarían,
// aunque su hora no sea ahora (y el cierre, aunque no quede nada pendiente).
export function avisoDeHoy(tipo: 'resumen-manana' | 'cierre-dia', ctx: ContextoAvisos): AvisoPlanificado {
  const hoy = claveDia(ctx.ahora);
  if (tipo === 'resumen-manana') return avisoResumenManana(ctx, hoy)[0];
  return avisoCierreDia({ ...ctx, ajustes: { ...ctx.ajustes, cierreSinPendientes: 'buenas-noches' } }, hoy)[0];
}

export function planificarAvisos(ctx: ContextoAvisos, dias = DIAS_A_PROGRAMAR): AvisoPlanificado[] {
  const hoy = claveDia(ctx.ahora);
  const activos = GENERADORES.filter((g) => g.activo(ctx.ajustes));
  const avisos: AvisoPlanificado[] = [];
  // Se empieza por ayer: si te acuestas después de medianoche, el cierre de
  // ayer puede no haber llegado todavía. Lo que ya ha pasado se quita abajo.
  for (let n = -1; n < dias; n++) {
    const dia = sumarDias(hoy, n);
    for (const generador of activos) avisos.push(...generador.generar(ctx, dia));
  }
  return avisos
    .filter((a) => a.cuando.getTime() > ctx.ahora.getTime())
    .sort((a, b) => a.cuando.getTime() - b.cuando.getTime())
    .slice(0, MAX_AVISOS);
}
