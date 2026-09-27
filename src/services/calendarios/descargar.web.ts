import { FunctionsHttpError } from '@supabase/supabase-js';

import { asegurarSesion, obtenerSupabase } from '@/data/supabase';

import type { Descarga } from './descargar';

// En la web el navegador no deja leer el calendario de otra web (Google, iCloud...),
// así que lo trae la función "calendario" de Supabase y lo devuelve tal cual, sin
// guardar nada (lo aprobó el usuario el 27/09/2026).

export type { Descarga, MotivoFallo } from './descargar';

const ESPERA_MAX_MS = 25_000;

export async function descargarCalendario(enlace: string): Promise<Descarga> {
  const supabase = obtenerSupabase();
  if (!supabase) return { ok: false, motivo: 'sin-servidor' };
  try {
    await asegurarSesion(supabase);
    const { data, error } = await supabase.functions.invoke('calendario', {
      body: { enlace },
      timeout: ESPERA_MAX_MS,
    });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const cuerpo = await (error.context as Response).json().catch(() => null);
        const codigo = cuerpo?.error;
        if (codigo === 'limite-usuario' || codigo === 'limite-global') return { ok: false, motivo: 'limite' };
        if (codigo === 'no-es-calendario' || codigo === 'enlace') return { ok: false, motivo: 'no-es-calendario' };
        if (codigo === 'no-encontrado') return { ok: false, motivo: 'no-encontrado' };
      }
      return { ok: false, motivo: 'sin-conexion' };
    }
    const texto = typeof data?.ics === 'string' ? data.ics : '';
    if (!texto.trimStart().startsWith('BEGIN:VCALENDAR')) return { ok: false, motivo: 'no-es-calendario' };
    return { ok: true, texto };
  } catch {
    return { ok: false, motivo: 'sin-conexion' };
  }
}
