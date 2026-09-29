import { obtenerSupabaseEmpresa } from '@/data/supabaseEmpresa';

// Cómo habla la app con el servidor de la empresa: leer y escribir tablas (con las
// reglas RLS del servidor) y llamar a sus funciones (empresa_crear, empresa_unirme...).
// Hay dos: la de verdad (Supabase) y, solo en desarrollo en la web, una de prueba en el
// navegador (prueba.ts) para probar con dos personas sin cuentas de Google ni Microsoft.

export type Fila = Record<string, unknown>;
export type Filtro = { columna: string; es: 'igual' | 'desde'; valor: string };

export type UsuarioEmpresa = { id: string; correo: string; nombre: string };

// Error con el motivo que da el servidor ("sin-invitacion", "unico-admin"...).
export class FalloEmpresa extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
  }
}

export type Base = {
  usuario(): Promise<UsuarioEmpresa | null>;
  rpc<T = unknown>(nombre: string, argumentos: Fila): Promise<T>;
  leer(tabla: string, filtros?: Filtro[]): Promise<Fila[]>;
  insertar(tabla: string, filas: Fila[]): Promise<Fila[]>;
  cambiar(tabla: string, donde: Fila, cambios: Fila): Promise<void>;
  borrar(tabla: string, donde: Fila): Promise<void>;
  guardarFila(tabla: string, fila: Fila, conflicto: string): Promise<void>;
  // Avisa cuando se añade una fila con columna = valor (el chat al momento). Devuelve cómo parar.
  escuchar(tabla: string, columna: string, valor: string, alLlegar: () => void): () => void;
  cerrarSesion(): Promise<void>;
};

const MOTIVOS = [
  'sin-cuenta', 'sin-correo', 'sin-invitacion', 'enlace-caducado', 'ya-en-empresa', 'empresa-llena',
  'demasiadas', 'dominio-publico', 'dominio-ajeno', 'dominio-en-uso', 'unico-admin', 'sin-admin',
  'no-comparte', 'sin-permiso', 'no-existe', 'usa-salir', 'mensaje-vacio', 'demasiados-mensajes',
];

export function motivoDe(error: unknown): string {
  if (error instanceof FalloEmpresa) return error.motivo;
  const texto = error instanceof Error ? error.message : typeof error === 'object' && error ? String((error as { message?: unknown }).message ?? '') : String(error);
  const conocido = MOTIVOS.find((m) => texto.includes(m));
  if (conocido) return conocido;
  if (/row-level security|permission denied/i.test(texto)) return 'sin-permiso';
  if (/fetch|network|Failed to fetch|NetworkError|timed? ?out/i.test(texto)) return 'sin-conexion';
  if (/JWT|session|sesión/i.test(texto)) return 'sin-sesion';
  return 'error';
}

function comprobar<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw new FalloEmpresa(motivoDe(r.error));
  return r.data;
}

function clienteOFallo() {
  const supabase = obtenerSupabaseEmpresa();
  if (!supabase) throw new FalloEmpresa('sin-servidor');
  return supabase;
}

export const baseSupabase: Base = {
  async usuario() {
    const supabase = obtenerSupabaseEmpresa();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u || u.is_anonymous || !u.email) return null;
    const datos = (u.user_metadata ?? {}) as { full_name?: string; name?: string };
    return { id: u.id, correo: u.email.toLowerCase(), nombre: (datos.full_name ?? datos.name ?? '').trim() };
  },
  async rpc<T>(nombre: string, argumentos: Fila) {
    return comprobar(await clienteOFallo().rpc(nombre, argumentos)) as T;
  },
  async leer(tabla, filtros = []) {
    let consulta = clienteOFallo().from(tabla).select('*');
    for (const f of filtros) consulta = f.es === 'igual' ? consulta.eq(f.columna, f.valor) : consulta.gte(f.columna, f.valor);
    return (comprobar(await consulta.limit(2000)) ?? []) as Fila[];
  },
  async insertar(tabla, filas) {
    return (comprobar(await clienteOFallo().from(tabla).insert(filas).select()) ?? []) as Fila[];
  },
  async cambiar(tabla, donde, cambios) {
    comprobar(await clienteOFallo().from(tabla).update(cambios).match(donde));
  },
  async borrar(tabla, donde) {
    comprobar(await clienteOFallo().from(tabla).delete().match(donde));
  },
  async guardarFila(tabla, fila, conflicto) {
    comprobar(await clienteOFallo().from(tabla).upsert(fila, { onConflict: conflicto }));
  },
  escuchar(tabla, columna, valor, alLlegar) {
    const supabase = obtenerSupabaseEmpresa();
    if (!supabase) return () => {};
    const canal = supabase
      .channel(`${tabla}:${valor}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabla, filter: `${columna}=eq.${valor}` }, () => alLlegar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  },
  async cerrarSesion() {
    // Solo en este dispositivo: la cuenta de empresa ya se borró en el servidor al salir.
    await obtenerSupabaseEmpresa()?.auth.signOut({ scope: 'local' }).catch(() => {});
  },
};
