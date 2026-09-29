import { FunctionsHttpError } from '@supabase/supabase-js';

import { asegurarSesion, obtenerSupabase } from '@/data/supabase';

import { leerEstadoIA, leerLimiteAlcanzado, type EstadoIA, type LimiteAlcanzado } from './limites';

export * from './limites';

// Cuánta IA te queda: pregunta a la función "ia" del servidor (solo lee, no gasta).
// Devuelve null sin servidor configurado o si falla (sin conexión, por ejemplo).
export async function consultarEstadoIA(): Promise<EstadoIA | null> {
  const supabase = obtenerSupabase();
  if (!supabase) return null;
  try {
    await asegurarSesion(supabase);
    const { data, error } = await supabase.functions.invoke('ia', { body: { accion: 'estado' }, timeout: 15000 });
    if (error) return null;
    return leerEstadoIA((data as { estado?: unknown } | null)?.estado);
  } catch {
    return null;
  }
}

// Si un error de una función de IA es porque se ha acabado la IA de las 5 horas o de
// la semana, devuelve el motivo y cuándo se libera.
export async function limiteDelError(error: unknown): Promise<LimiteAlcanzado | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  const respuesta = error.context as Response | undefined;
  if (respuesta?.status !== 429) return null;
  const cuerpo = await respuesta.clone().json().catch(() => null);
  return leerLimiteAlcanzado(cuerpo);
}
