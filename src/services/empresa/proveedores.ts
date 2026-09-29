import { datosPublicosSupabase } from '@/data/supabase';

// Entrar con la cuenta de Google o Microsoft del trabajo (Supabase Auth, proveedores
// "google" y "azure"). Los activa el dueño una vez en el panel de Supabase (guía "Fase 15
// - Organizy grupal.md"); hasta entonces los botones dicen "Aún no está activado".

export type ProveedorEmpresa = 'google' | 'azure';

export type ResultadoEntrar =
  | { ok: true }
  | { ok: 'redirigiendo' } // en la web: la página se va a Google o Microsoft
  | { ok: false; motivo: 'sin-servidor' | 'cancelado' | 'aprobacion-admin' | 'error' };

// Solo nombre y correo: nada de leer el correo ni los archivos. "select_account" deja
// elegir la cuenta del trabajo aunque el navegador tenga abierta la personal.
export function opcionesProveedor(proveedor: ProveedorEmpresa) {
  return proveedor === 'azure'
    ? { scopes: 'email', queryParams: { prompt: 'select_account' } }
    : { queryParams: { prompt: 'select_account' } };
}

// Microsoft devuelve AADSTS65001 / AADSTS90094 cuando la empresa no deja aceptar apps
// sin permiso del administrador.
export function motivoEntrada(error: string | null): 'cancelado' | 'aprobacion-admin' | 'error' {
  if (!error) return 'error';
  if (/AADSTS(65001|90094|90095)|admin(istrator)? (approval|consent)|consent_required/i.test(error)) return 'aprobacion-admin';
  if (/access_denied|cancel/i.test(error)) return 'cancelado';
  return 'error';
}

export type ProveedoresActivos = { google: boolean; microsoft: boolean };

// Qué proveedores ha activado el dueño en Supabase (lo dice el propio servidor, sin sesión).
export async function proveedoresActivos(): Promise<ProveedoresActivos | null> {
  if (!datosPublicosSupabase) return null;
  try {
    const r = await fetch(`${datosPublicosSupabase.url}/auth/v1/settings`, {
      headers: { apikey: datosPublicosSupabase.clave },
    });
    if (!r.ok) return null;
    const ajustes = (await r.json()) as { external?: Record<string, boolean> };
    return { google: ajustes.external?.google === true, microsoft: ajustes.external?.azure === true };
  } catch {
    return null;
  }
}
