import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Conexión con el servidor propio de Organizy (Supabase). Solo se usa para lo que
// necesita claves secretas (la IA de la captura rápida y, más adelante, las
// fases 6 y 8). Los datos del usuario siguen guardados solo en su dispositivo.
//
// La dirección del proyecto y la clave PÚBLICA ("publishable") vienen de las
// variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY:
//   - en el ordenador, del archivo .env (no se sube a git);
//   - en la web publicada, de las variables del repositorio en GitHub.
// Esa clave pública puede ir en la app: solo deja entrar como usuario anónimo.
// Las claves secretas (Anthropic...) viven en los secretos de Supabase, nunca aquí.
//
// Cada dispositivo entra como usuario anónimo (sin registrarse): así el servidor
// sabe que la petición viene de la app y puede limitar los usos por persona y día.

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const CLAVE_PUBLICA = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const supabaseConfigurado = URL.startsWith('https://') && CLAVE_PUBLICA.length > 0;

let cliente: SupabaseClient | null = null;

// Se crea la primera vez que hace falta (no al arrancar), así la web se compila
// igual aunque no haya navegador.
export function obtenerSupabase(): SupabaseClient | null {
  if (!supabaseConfigurado) return null;
  if (!cliente) {
    cliente = createClient(URL, CLAVE_PUBLICA, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        // La sesión se renueva sola al pedir algo (getSession), sin temporizadores
        // en segundo plano.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cliente;
}

// Se asegura de que este dispositivo tiene sesión (anónima). La primera vez la crea.
export async function asegurarSesion(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
