import { asegurarSesion, obtenerSupabase } from '@/data/supabase';
import type { HoraPlan, TipoPlan, VotoPlan } from '@/data/planes';
import { claveDia, fechaDesdeClave, sumarDias, type ClaveDia } from '@/services/fechas';

import { ordenarHoras } from './votos';

// Lo que hace el organizador con sus planes en el servidor (Supabase). Las tablas
// tienen Row Level Security: cada usuario (anónimo, uno por dispositivo) solo ve y
// cambia sus planes. Los invitados no pasan por aquí (ver votacion.ts).

export type Fallo = 'sin-servidor' | 'sin-conexion';
export type Resultado<T> = { ok: true; datos: T } | { ok: false; motivo: Fallo };

// El plan se borra del servidor 7 días después del último día que importa.
export function fechaDeBorrado(dias: ClaveDia[]): string {
  const ultimo = [...dias].sort().at(-1) ?? claveDia(new Date());
  return fechaDesdeClave(sumarDias(ultimo, 8)).toISOString();
}

async function conSesion() {
  const supabase = obtenerSupabase();
  if (!supabase) return null;
  await asegurarSesion(supabase);
  return supabase;
}

export type NuevoPlanServidor = {
  titulo: string;
  tipo: TipoPlan;
  organizador: string;
  personas: number;
  duracionMin: number;
  horas: { dia: ClaveDia; hora: string }[];
  avisoToken: string | null;
};

export async function crearEnServidor(
  nuevo: NuevoPlanServidor,
): Promise<Resultado<{ id: string; codigo: string; horas: HoraPlan[] }>> {
  try {
    const supabase = await conSesion();
    if (!supabase) return { ok: false, motivo: 'sin-servidor' };
    const plan = await supabase
      .from('planes')
      .insert({
        titulo: nuevo.titulo,
        tipo: nuevo.tipo,
        organizador: nuevo.organizador,
        personas: nuevo.personas,
        duracion_min: nuevo.duracionMin,
        aviso_token: nuevo.avisoToken,
        borrar_el: fechaDeBorrado(nuevo.horas.map((h) => h.dia)),
      })
      .select('id, codigo')
      .single();
    if (plan.error) throw plan.error;
    const { id, codigo } = plan.data as { id: string; codigo: string };
    const horas = await supabase
      .from('horas')
      .insert(nuevo.horas.map((h) => ({ plan_id: id, dia: h.dia, hora: h.hora })))
      .select('id, dia, hora');
    if (horas.error) {
      await supabase.from('planes').delete().eq('id', id);
      throw horas.error;
    }
    return { ok: true, datos: { id, codigo, horas: ordenarHoras(horas.data as HoraPlan[]) } };
  } catch (error) {
    console.warn('No se pudo crear el plan en el servidor', error);
    return { ok: false, motivo: 'sin-conexion' };
  }
}

export type EstadoServidor = { estado: 'abierto' | 'cerrado'; horaElegida: string | null; votos: VotoPlan[] };

type FilaPlan = {
  id: string;
  estado: 'abierto' | 'cerrado';
  hora_elegida: string | null;
  invitados: { nombre: string; votado_el: string; votos: { hora_id: string }[] }[];
};

// Votos de varios planes. Los que no vuelven es que el servidor ya los borró.
export async function traerDelServidor(ids: string[]): Promise<Resultado<Map<string, EstadoServidor>>> {
  try {
    const supabase = await conSesion();
    if (!supabase) return { ok: false, motivo: 'sin-servidor' };
    const { data, error } = await supabase
      .from('planes')
      .select('id, estado, hora_elegida, invitados(nombre, votado_el, votos(hora_id))')
      .in('id', ids);
    if (error) throw error;
    const mapa = new Map<string, EstadoServidor>();
    for (const fila of data as FilaPlan[]) {
      const invitados = [...fila.invitados].sort((a, b) => a.votado_el.localeCompare(b.votado_el));
      mapa.set(fila.id, {
        estado: fila.estado,
        horaElegida: fila.hora_elegida,
        votos: invitados.map((i) => ({ nombre: i.nombre, horas: i.votos.map((v) => v.hora_id) })),
      });
    }
    return { ok: true, datos: mapa };
  } catch (error) {
    console.warn('No se pudieron traer los votos', error);
    return { ok: false, motivo: 'sin-conexion' };
  }
}

export async function cerrarEnServidor(id: string, hora: HoraPlan): Promise<Resultado<null>> {
  try {
    const supabase = await conSesion();
    if (!supabase) return { ok: false, motivo: 'sin-servidor' };
    const { error } = await supabase
      .from('planes')
      .update({ estado: 'cerrado', hora_elegida: hora.id, borrar_el: fechaDeBorrado([hora.dia]) })
      .eq('id', id);
    if (error) throw error;
    return { ok: true, datos: null };
  } catch (error) {
    console.warn('No se pudo cerrar el plan en el servidor', error);
    return { ok: false, motivo: 'sin-conexion' };
  }
}

export async function borrarEnServidor(id: string): Promise<Resultado<null>> {
  try {
    const supabase = await conSesion();
    if (!supabase) return { ok: false, motivo: 'sin-servidor' };
    const { error } = await supabase.from('planes').delete().eq('id', id);
    if (error) throw error;
    return { ok: true, datos: null };
  } catch (error) {
    console.warn('No se pudo borrar el plan del servidor', error);
    return { ok: false, motivo: 'sin-conexion' };
  }
}
