import * as WebBrowser from 'expo-web-browser';

import { obtenerSupabaseEmpresa } from '@/data/supabaseEmpresa';

import { motivoEntrada, opcionesProveedor, type ProveedorEmpresa, type ResultadoEntrar } from './proveedores';

// Entrar con Google o Microsoft en el móvil (también en Expo Go): se abre la ventana de
// inicio de sesión del sistema, que se cierra sola al volver a esta dirección (no hace
// falta que la app la reconozca). Supabase da un código que se canjea por la sesión.

const VUELTA = 'organizy://empresa-entrada';

export async function entrarConProveedor(proveedor: ProveedorEmpresa): Promise<ResultadoEntrar> {
  const supabase = obtenerSupabaseEmpresa();
  if (!supabase) return { ok: false, motivo: 'sin-servidor' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: { ...opcionesProveedor(proveedor), redirectTo: VUELTA, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, motivo: 'error' };
  const resultado = await WebBrowser.openAuthSessionAsync(data.url, VUELTA);
  if (resultado.type !== 'success') return { ok: false, motivo: 'cancelado' };
  const vuelta = new URL(resultado.url);
  const codigo = vuelta.searchParams.get('code');
  if (!codigo) return { ok: false, motivo: motivoEntrada(vuelta.searchParams.get('error_description') ?? vuelta.searchParams.get('error')) };
  const canje = await supabase.auth.exchangeCodeForSession(codigo);
  return canje.error ? { ok: false, motivo: 'error' } : { ok: true };
}

// Solo en la web se vuelve a la página con el código.
export async function terminarEntradaWeb(): Promise<ResultadoEntrar | null> {
  return null;
}
