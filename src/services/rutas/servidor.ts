import { asegurarSesion, obtenerSupabase } from '@/data/supabase';

// Habla con la función "rutas" del servidor (Supabase Edge Function), que es la que
// pregunta a TomTom con la clave guardada en sus secretos. La clave nunca está en la app.

export type RespuestaServidor<T> =
  | { estado: 'ok'; datos: T }
  | { estado: 'sin-servidor' }
  | { estado: 'error'; mensaje: string };

const ESPERA_MAXIMA_MS = 20000;

export const MENSAJE_SIN_CONEXION = 'No se ha podido calcular la ruta. Comprueba la conexión y prueba otra vez.';

// El servidor explica los errores con { error: "texto" }.
async function mensajeDeError(error: unknown): Promise<string> {
  const contexto = (error as { context?: unknown })?.context;
  if (contexto instanceof Response) {
    try {
      const cuerpo = (await contexto.json()) as { error?: string };
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // Sin cuerpo legible: mensaje general.
    }
  }
  return MENSAJE_SIN_CONEXION;
}

export async function pedirAlServidor<T>(cuerpo: Record<string, unknown>): Promise<RespuestaServidor<T>> {
  const supabase = obtenerSupabase();
  if (!supabase) return { estado: 'sin-servidor' };
  try {
    await asegurarSesion(supabase);
    const { data, error } = await supabase.functions.invoke('rutas', { body: cuerpo, timeout: ESPERA_MAXIMA_MS });
    if (error) return { estado: 'error', mensaje: await mensajeDeError(error) };
    return { estado: 'ok', datos: data as T };
  } catch {
    return { estado: 'error', mensaje: MENSAJE_SIN_CONEXION };
  }
}
