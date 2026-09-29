import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { datosPublicosSupabase } from './supabase';

// Sesión de Organizy grupal (fase 15): la cuenta de Google o Microsoft del trabajo.
//
// Va APARTE de la sesión anónima de la app (data/supabase.ts), con su propio guardado
// ("sb-organizy-empresa", sin el prefijo organizy: para que no viaje en la copia de
// seguridad). Así lo que ya usa el servidor (planes, correo, IA) sigue con la anónima en
// todos los dispositivos, aunque la misma cuenta de Google entre en la web y en el móvil
// (convertir la anónima con linkIdentity solo valdría para el primer dispositivo).
//
// Solo se crea con el modo "Organizy grupal" activado.

let cliente: SupabaseClient | null = null;

export function obtenerSupabaseEmpresa(): SupabaseClient | null {
  if (!datosPublicosSupabase) return null;
  if (!cliente) {
    cliente = createClient(datosPublicosSupabase.url, datosPublicosSupabase.clave, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'sb-organizy-empresa',
        persistSession: true,
        autoRefreshToken: false, // se renueva sola al pedir algo
        detectSessionInUrl: false, // la vuelta de Google o Microsoft la atiende services/empresa
        flowType: 'pkce',
      },
    });
  }
  return cliente;
}
