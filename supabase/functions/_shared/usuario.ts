import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Cliente con la clave secreta del proyecto (solo existe aquí, en el servidor):
// sirve para comprobar quién llama y para apuntar los usos en la base de datos.
// Supabase pone estas variables solo en cada función.
function claveSecreta(): string {
  try {
    const claves = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    if (claves.default) return claves.default;
  } catch {
    // Formato antiguo: se usa la de abajo.
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

let admin: SupabaseClient | null = null;

export function clienteAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', claveSecreta(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

// Devuelve el id del usuario (anónimo o no) que hace la petición, o null si el
// token no es válido. Así solo la app, con su sesión, puede usar las funciones.
export async function usuarioDeLaPeticion(req: Request): Promise<string | null> {
  const cabecera = req.headers.get('Authorization') ?? '';
  const token = cabecera.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await clienteAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
