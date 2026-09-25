import { useEpocas, type Epoca, type RegistroBloque } from '@/data/epocas';
import type { Evento } from '@/data/eventos';
import type { Energia } from '@/services/agenda';
import { epocaActiva, planificarEpoca, type PlanEpoca } from '@/services/epoca';
import type { ClaveDia } from '@/services/fechas';

// La época activa hoy y su plan, para Hoy y la sección de la época.
// El plan se calcula al vuelo (es rápido): así siempre está al día con los
// eventos, lo marcado y la energía de hoy.
export type EpocaDelDia = {
  cargado: boolean;
  epocas: Epoca[];
  registro: RegistroBloque[];
  epoca: Epoca | null;
  plan: PlanEpoca | null;
};

export function useEpocaActiva(hoy: ClaveDia, eventos: Evento[], energiaHoy: Energia): EpocaDelDia {
  const { cargado, epocas, registro } = useEpocas();
  const epoca = epocaActiva(epocas, hoy);
  const plan = epoca
    ? planificarEpoca({ epoca, eventos, registro, hoy, energias: { [hoy]: energiaHoy } })
    : null;
  return { cargado, epocas, registro, epoca, plan };
}
