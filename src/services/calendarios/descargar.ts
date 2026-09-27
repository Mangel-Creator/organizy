// Descarga el calendario (.ics) en el móvil: directamente, sin pasar por ningún
// servidor (una app no tiene las limitaciones de un navegador). En la web se usa
// descargar.web.ts, que pasa por la función "calendario" de Supabase.

export type Descarga = { ok: true; texto: string } | { ok: false; motivo: MotivoFallo };
export type MotivoFallo = 'sin-conexion' | 'no-encontrado' | 'no-es-calendario' | 'limite' | 'sin-servidor';

const ESPERA_MAX_MS = 20_000;

export async function descargarCalendario(enlace: string): Promise<Descarga> {
  // AbortSignal.timeout no está en todos los motores de React Native: a mano.
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAX_MS);
  try {
    const respuesta = await fetch(enlace, { headers: { Accept: 'text/calendar' }, signal: control.signal });
    if (!respuesta.ok) return { ok: false, motivo: 'no-encontrado' };
    const texto = await respuesta.text();
    if (!texto.trimStart().startsWith('BEGIN:VCALENDAR')) return { ok: false, motivo: 'no-es-calendario' };
    return { ok: true, texto };
  } catch {
    return { ok: false, motivo: 'sin-conexion' };
  } finally {
    clearTimeout(reloj);
  }
}
