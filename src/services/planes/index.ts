import { AppState } from 'react-native';

import { guardarEvento, nuevoId } from '@/data/eventos';
import {
  borrarPlanLocal,
  cargarPlanes,
  guardarPlan,
  guardarPlanes,
  leerPlanes,
  type Plan,
  type TipoPlan,
} from '@/data/planes';
import { claveDia } from '@/services/fechas';

import { eventoDelPlan } from './evento';
import { escucharVotos, tokenDeAvisos } from './push';
import { borrarEnServidor, cerrarEnServidor, crearEnServidor, traerDelServidor, type Fallo } from './servidor';
import { situacionPlan } from './votos';

// Planes con votación de hora (fase 8): crear, traer los votos, cerrar y borrar.
// Los planes viven en el dispositivo (data/planes.ts); el servidor solo guarda lo
// necesario para votar y lo borra solo a los 7 días.

export * from './evento';
export * from './mensajes';
export * from './sugerencias';
export * from './votos';
export { pushPosible } from './push';

export type BorradorPlan = {
  tipo: TipoPlan;
  titulo: string;
  organizador: string;
  invitados: string[];
  horas: { dia: string; hora: string }[];
  duracionMin: number;
  recordar: boolean;
};

export type ResultadoPlan = { ok: true; plan: Plan } | { ok: false; motivo: Fallo };

export async function crearPlan(borrador: BorradorPlan): Promise<ResultadoPlan> {
  const avisoToken = await tokenDeAvisos();
  const resultado = await crearEnServidor({
    titulo: borrador.titulo.trim(),
    tipo: borrador.tipo,
    organizador: borrador.organizador.trim(),
    personas: borrador.invitados.length,
    duracionMin: borrador.duracionMin,
    horas: borrador.horas,
    avisoToken,
  });
  if (!resultado.ok) return resultado;
  const plan: Plan = {
    id: resultado.datos.id,
    codigo: resultado.datos.codigo,
    titulo: borrador.titulo.trim(),
    tipo: borrador.tipo,
    organizador: borrador.organizador.trim(),
    invitados: borrador.invitados,
    horas: resultado.datos.horas,
    duracionMin: borrador.duracionMin,
    recordar: borrador.recordar,
    estado: 'abierto',
    horaElegida: null,
    eventoId: null,
    creadoEl: new Date().toISOString(),
    votos: [],
    votosVistos: 0,
    actualizadoEl: new Date().toISOString(),
    enServidor: true,
  };
  await guardarPlan(plan);
  return { ok: true, plan };
}

let trayendo: Promise<void> | null = null;

// Trae del servidor los votos de los planes que siguen allí. Si ya se está
// haciendo, espera a que termine en vez de repetirlo.
export function actualizarPlanes(): Promise<void> {
  if (!trayendo) {
    trayendo = (async () => {
      const hoy = claveDia(new Date());
      const planes = (await leerPlanes()).filter((p) => p.enServidor && situacionPlan(p, hoy) !== 'pasado');
      if (planes.length === 0) return;
      const resultado = await traerDelServidor(planes.map((p) => p.id));
      if (!resultado.ok) return;
      const ahora = new Date().toISOString();
      await guardarPlanes(
        planes.map((plan) => {
          const remoto = resultado.datos.get(plan.id);
          if (!remoto) return { ...plan, enServidor: false };
          return {
            ...plan,
            votos: remoto.votos,
            // Si se cerró desde otro sitio (no debería), se respeta lo de este móvil.
            estado: plan.estado === 'cerrado' ? 'cerrado' : remoto.estado,
            horaElegida: plan.horaElegida ?? remoto.horaElegida,
            actualizadoEl: ahora,
          };
        }),
      );
    })().finally(() => {
      trayendo = null;
    });
  }
  return trayendo;
}

// "Cerrar plan": crea el evento en el calendario y avisa al servidor (así la página
// de votación enseña la hora elegida). Sin conexión se cierra igual en el móvil.
export async function cerrarPlan(plan: Plan, horaId: string): Promise<{ plan: Plan; servidorAlDia: boolean }> {
  const hora = plan.horas.find((h) => h.id === horaId);
  if (!hora) throw new Error('Esa hora no es de este plan');
  const evento = eventoDelPlan(plan, hora, plan.eventoId ?? nuevoId());
  await guardarEvento(evento);
  const cerrado: Plan = { ...plan, estado: 'cerrado', horaElegida: hora.id, eventoId: evento.id };
  await guardarPlan(cerrado);
  const servidor = plan.enServidor ? await cerrarEnServidor(plan.id, hora) : { ok: true };
  return { plan: cerrado, servidorAlDia: servidor.ok };
}

export async function cambiarRecordar(plan: Plan, recordar: boolean): Promise<void> {
  await guardarPlan({ ...plan, recordar });
}

// Borra el plan del móvil y del servidor. El evento del calendario, si lo hay, se queda.
export async function borrarPlan(plan: Plan): Promise<void> {
  if (plan.enServidor) await borrarEnServidor(plan.id);
  await borrarPlanLocal(plan.id);
}

// Se llama una vez al arrancar la app: trae los votos al abrirla, al volver a ella
// (también en la web) y, en el móvil, cuando llega un aviso de voto con la app abierta.
export function iniciarPlanes(): () => void {
  cargarPlanes().then(() => actualizarPlanes().catch(() => {}));
  const app = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') actualizarPlanes().catch(() => {});
  });
  const quitarVotos = escucharVotos(() => actualizarPlanes().catch(() => {}));
  return () => {
    app.remove();
    quitarVotos();
  };
}
