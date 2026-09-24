import { AppState } from 'react-native';

import { leerAjustesAvisos, suscribirseAjustesAvisos } from '@/data/avisos';
import { leerEventos, moverTareas, suscribirseEventos } from '@/data/eventos';
import { cargarPerfil, suscribirsePerfil } from '@/data/perfil';
import { tareasPendientes } from '@/services/agenda';
import { sumarDias } from '@/services/fechas';
import { consultarPermiso } from '@/services/permisos';

import { avisoDeHoy, planificarAvisos } from './planificar';
// En el móvil carga programar.ts (expo-notifications) y en la web programar.web.ts.
import {
  avisosDisponibles,
  enviarAvisoDePrueba,
  escucharRespuestas,
  prepararAvisos,
  programarAvisos,
} from './programar';
import type { RespuestaAviso } from './programar';

// Avisos (notificaciones locales, fase 4). Sin servidor: todo se programa en el móvil.
//
//   - iniciarAvisos(): en el arranque. Programa los avisos de los próximos días y
//     los vuelve a programar al abrir la app y al cambiar eventos, perfil o ajustes.
//   - escucharRespuestas() + atenderRespuesta(): qué hacer al tocar un aviso.

export { avisosDisponibles, escucharRespuestas };
export { contarAvisosProgramados, enviarAvisoDePrueba } from './programar';

// Envía en 5 segundos el resumen de la mañana o el cierre del día de hoy, tal
// cual (con sus botones), para probarlos sin esperar a su hora.
export async function probarAvisoDeHoy(tipo: 'resumen-manana' | 'cierre-dia'): Promise<void> {
  const { perfil } = await cargarPerfil();
  if (!perfil) return;
  const [eventos, ajustes] = await Promise.all([leerEventos(), leerAjustesAvisos()]);
  await enviarAvisoDePrueba(avisoDeHoy(tipo, { ahora: new Date(), eventos, perfil, ajustes }));
}
export type { RespuestaAviso } from './programar';
export { horaCierre, textoAntelacion } from './planificar';

let cola: Promise<unknown> = Promise.resolve();

// Borra los avisos programados y los vuelve a calcular con los datos actuales.
// Si se llama varias veces seguidas, se hacen una detrás de otra.
export function reprogramarAvisos(): Promise<void> {
  const tarea = cola.then(async () => {
    if (!avisosDisponibles) return;
    if ((await consultarPermiso('notificaciones')) !== 'concedido') return;
    const { perfil, bienvenidaCompletada } = await cargarPerfil();
    if (!perfil || !bienvenidaCompletada) return;
    const [eventos, ajustes] = await Promise.all([leerEventos(), leerAjustesAvisos()]);
    await programarAvisos(planificarAvisos({ ahora: new Date(), eventos, perfil, ajustes }));
  });
  cola = tarea.catch(() => {});
  return tarea;
}

let espera: ReturnType<typeof setTimeout> | null = null;

// Espera un momento por si llegan varios cambios seguidos (por ejemplo, al
// pasar varias tareas a mañana) y reprograma una sola vez.
function reprogramarEnUnMomento() {
  if (espera) clearTimeout(espera);
  espera = setTimeout(() => {
    espera = null;
    reprogramarAvisos().catch(() => {});
  }, 500);
}

// Se llama una vez al arrancar la app. Devuelve la función para pararlo.
export function iniciarAvisos(): () => void {
  if (!avisosDisponibles) return () => {};
  prepararAvisos();
  reprogramarEnUnMomento();
  const quitar = [
    suscribirseEventos(reprogramarEnUnMomento),
    suscribirsePerfil(reprogramarEnUnMomento),
    suscribirseAjustesAvisos(reprogramarEnUnMomento),
  ];
  // Cada vez que se vuelve a abrir la app: así siempre hay avisos para los próximos días.
  const app = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') reprogramarEnUnMomento();
  });
  return () => {
    quitar.forEach((q) => q());
    app.remove();
  };
}

export type DestinoApp = { pantalla: 'hoy'; movidas?: number } | { pantalla: 'evento'; id: string };

// Hace lo que pide la respuesta y dice a qué pantalla ir.
// "Sí, a mañana" pasa a mañana las tareas que sigan pendientes ese día.
export async function atenderRespuesta({ accion, datos }: RespuestaAviso): Promise<DestinoApp> {
  if (accion === 'a-manana' && datos.tipo === 'cierre-dia') {
    const pendientes = tareasPendientes(await leerEventos(), datos.dia, datos.dia);
    await moverTareas(
      pendientes.map((t) => t.id),
      sumarDias(datos.dia, 1),
    );
    return { pantalla: 'hoy', movidas: pendientes.length };
  }
  return datos.destino;
}
