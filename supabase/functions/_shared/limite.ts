import { clienteAdmin } from './usuario.ts';

// Límite de usos por día para controlar el gasto: uno por usuario y otro para
// toda la app (por si alguien crea muchos usuarios anónimos). Se cuenta en la
// tabla usos_diarios con la función SQL sumar_uso (ver supabase/migrations).
// Los días cambian a medianoche de Madrid.

export type ResultadoUso =
  | { permitido: true; usosHoy: number }
  | { permitido: false; motivo: 'limite-usuario' | 'limite-global' };

export async function sumarUso(
  usuarioId: string,
  funcion: string,
  limiteUsuario: number,
  limiteGlobal: number,
): Promise<ResultadoUso> {
  const { data, error } = await clienteAdmin().rpc('sumar_uso', {
    p_usuario: usuarioId,
    p_funcion: funcion,
    p_limite_usuario: limiteUsuario,
    p_limite_global: limiteGlobal,
  });
  if (error) throw new Error(`sumar_uso: ${error.message}`);
  const usos = Number(data);
  if (usos === -1) return { permitido: false, motivo: 'limite-usuario' };
  if (usos === -2) return { permitido: false, motivo: 'limite-global' };
  return { permitido: true, usosHoy: usos };
}

// Lee un número de las variables de la función (secretos), con un valor por defecto.
export function numeroDeEntorno(nombre: string, porDefecto: number): number {
  const valor = Number(Deno.env.get(nombre));
  return Number.isFinite(valor) && valor > 0 ? valor : porDefecto;
}
