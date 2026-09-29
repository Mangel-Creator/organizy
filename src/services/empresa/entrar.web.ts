import { obtenerSupabaseEmpresa } from '@/data/supabaseEmpresa';

import { motivoEntrada, opcionesProveedor, type ProveedorEmpresa, type ResultadoEntrar } from './proveedores';

// Entrar con Google o Microsoft en la web: la página se va a Google o Microsoft y vuelve
// a /empresa con un código (?code=...), que aquí se canjea por la sesión.

export async function entrarConProveedor(proveedor: ProveedorEmpresa): Promise<ResultadoEntrar> {
  const supabase = obtenerSupabaseEmpresa();
  if (!supabase) return { ok: false, motivo: 'sin-servidor' };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: { ...opcionesProveedor(proveedor), redirectTo: `${window.location.origin}${window.location.pathname}` },
  });
  return error ? { ok: false, motivo: 'error' } : { ok: 'redirigiendo' };
}

// Al volver de Google o Microsoft. null si la página no viene de ahí.
export async function terminarEntradaWeb(): Promise<ResultadoEntrar | null> {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('code');
  const error = params.get('error_description') ?? params.get('error');
  if (!codigo && !error) return null;
  // Que al recargar no se intente otra vez (el enrutador reescribe la dirección al abrir).
  setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 500);
  if (!codigo) return { ok: false, motivo: motivoEntrada(error) };
  const supabase = obtenerSupabaseEmpresa();
  if (!supabase) return { ok: false, motivo: 'sin-servidor' };
  const canje = await supabase.auth.exchangeCodeForSession(codigo);
  return canje.error ? { ok: false, motivo: 'error' } : { ok: true };
}
