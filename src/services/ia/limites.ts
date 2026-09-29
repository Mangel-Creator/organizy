import { claveDia, diaSemanaDesdeLunes, formatearHora, sumarDias } from '@/services/fechas';

// Límites de IA como los de Claude (29/09/2026): una "ventana" de horas (5 por
// defecto) que empieza con el primer uso y se libera entera al acabar, y otra de
// una semana. Lo cuenta el servidor (supabase/functions/_shared/limiteIA.ts) en
// millonésimas de dólar; aquí solo se pasa a porcentajes y frases.

export type LimiteIA = { usado: number; limite: number; libre: string | null };

export type EstadoIA = {
  horas: number;
  ventana: LimiteIA;
  semana: LimiteIA;
  extra: number; // saldo comprado que queda, en millonésimas de dólar
  compra: boolean; // si ya se puede comprar más
};

export type MotivoLimiteIA = 'ventana' | 'semana';
export type LimiteAlcanzado = { motivo: MotivoLimiteIA; libre: string | null; horas: number };

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// De 0 a 100. Se redondea hacia arriba para no decir "0 %" si ya se ha usado algo,
// y no pasa de 100 aunque el extra haga gastar más.
export function porcentaje(l: LimiteIA): number {
  if (l.limite <= 0) return 100;
  if (l.usado <= 0) return 0;
  return Math.min(100, Math.ceil((l.usado / l.limite) * 100));
}

export function agotado(l: LimiteIA): boolean {
  return l.usado >= l.limite;
}

// "a las 18:40", "mañana a las 09:10", "el lunes a las 10:00" o "el 12/10 a las 10:00".
export function cuandoSeLibera(libre: Date, ahora: Date): string {
  const hora = formatearHora(libre);
  const dia = claveDia(libre);
  const hoy = claveDia(ahora);
  if (dia === hoy) return `a las ${hora}`;
  if (dia === sumarDias(hoy, 1)) return `mañana a las ${hora}`;
  if (dia <= sumarDias(hoy, 6)) return `el ${DIAS[diaSemanaDesdeLunes(libre)]} a las ${hora}`;
  const dd = String(libre.getDate()).padStart(2, '0');
  const mm = String(libre.getMonth() + 1).padStart(2, '0');
  return `el ${dd}/${mm} a las ${hora}`;
}

function libreComoFecha(libre: string | null): Date | null {
  if (!libre) return null;
  const fecha = new Date(libre);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// Línea bajo cada barra: "Se libera a las 18:40" o, si aún no ha empezado, qué pasa.
export function lineaLimite(l: LimiteIA, tipo: MotivoLimiteIA, horas: number, ahora: Date): string {
  const libre = libreComoFecha(l.libre);
  if (!libre || libre <= ahora) {
    return tipo === 'ventana'
      ? `Empieza a contar la próxima vez que uses la IA y dura ${horas} horas.`
      : 'Empieza a contar la próxima vez que uses la IA y dura 7 días.';
  }
  return `Se libera ${cuandoSeLibera(libre, ahora)}.`;
}

// El saldo extra, en algo que se entienda: cuántas semanas de uso normal son.
export function textoExtra(extra: number, limiteSemana: number): string | null {
  if (extra <= 0) return null;
  if (limiteSemana <= 0) return 'Tienes IA extra.';
  const semanas = extra / limiteSemana;
  if (semanas < 0.15) return 'Te queda un poco de IA extra.';
  if (semanas < 1) return `Te queda IA extra para ${Math.round(semanas * 7)} días más o menos.`;
  const redondeo = Math.round(semanas);
  if (redondeo === 1) return 'Te queda IA extra para una semana más o menos.';
  return `Te queda IA extra para unas ${redondeo} semanas.`;
}

// Lo que dice la app cuando se acaba: "Has gastado la IA de estas 5 horas. Vuelve a
// tenerla a las 18:40."
export function mensajeLimite(limite: LimiteAlcanzado, ahora: Date): string {
  const inicio =
    limite.motivo === 'semana' ? 'Has gastado la IA de esta semana.' : `Has gastado la IA de estas ${limite.horas} horas.`;
  const libre = libreComoFecha(limite.libre);
  const vuelta = libre && libre > ahora ? ` Vuelve a tenerla ${cuandoSeLibera(libre, ahora)}.` : ' Vuelve en un rato.';
  return `${inicio}${vuelta}`;
}

// Lee la respuesta 429 de las funciones de IA ({ error: 'limite-ia', motivo, libre }).
export function leerLimiteAlcanzado(cuerpo: unknown): LimiteAlcanzado | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const c = cuerpo as { error?: unknown; motivo?: unknown; libre?: unknown; horas?: unknown };
  if (c.error !== 'limite-ia') return null;
  return {
    motivo: c.motivo === 'semana' ? 'semana' : 'ventana',
    libre: typeof c.libre === 'string' ? c.libre : null,
    horas: Number(c.horas) > 0 ? Number(c.horas) : 5,
  };
}

// Comprueba lo que devuelve la función "ia" (acción "estado").
export function leerEstadoIA(datos: unknown): EstadoIA | null {
  if (!datos || typeof datos !== 'object') return null;
  const d = datos as Record<string, unknown>;
  const limite = (v: unknown): LimiteIA | null => {
    if (!v || typeof v !== 'object') return null;
    const l = v as Record<string, unknown>;
    const usado = Number(l.usado);
    const lim = Number(l.limite);
    if (!Number.isFinite(usado) || !Number.isFinite(lim)) return null;
    return { usado, limite: lim, libre: typeof l.libre === 'string' ? l.libre : null };
  };
  const ventana = limite(d.ventana);
  const semana = limite(d.semana);
  const horas = Number(d.horas);
  if (!ventana || !semana || !Number.isFinite(horas) || horas <= 0) return null;
  const extra = Number(d.extra);
  return { horas, ventana, semana, extra: Number.isFinite(extra) ? extra : 0, compra: d.compra === true };
}
