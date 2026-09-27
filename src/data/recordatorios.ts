import { useEffect, useSyncExternalStore } from 'react';

import type { Hora } from '@/data/perfil';
import type { EnvioRecordatorio } from '@/services/clientes';

import { guardarAjuste, leerAjuste } from './ajustes';

// Recordatorios a clientes por WhatsApp (fase 10). Todo en AsyncStorage, solo en el
// dispositivo:
//   - "organizy:recordatoriosClientes": el interruptor general y la hora del aviso
//     (Perfil > Recordatorios a clientes).
//   - "organizy:recordatoriosEnviados": el estado de cada envío, por "<evento>:<día>".
//
//   - En pantallas: const { ajustes, envios } = useRecordatorios();
//   - Fuera de pantallas: await leerRecordatorios();
//   - Para cambiar: cambiarAjustesRecordatorios, apuntarEnvio, olvidarEnvio.

export type AjustesRecordatorios = {
  activo: boolean; // aviso el día antes para mandar el recordatorio
  hora: Hora; // a qué hora llega ese aviso
};

export const AJUSTES_RECORDATORIOS_POR_DEFECTO: AjustesRecordatorios = { activo: true, hora: '10:00' };

export type Envios = Record<string, EnvioRecordatorio>;

type Estado = { cargado: boolean; ajustes: AjustesRecordatorios; envios: Envios };

const CLAVE_AJUSTES = 'recordatoriosClientes';
const CLAVE_ENVIOS = 'recordatoriosEnviados';
// Los envíos de hace más de 60 días se olvidan (ya no se enseñan en ninguna ficha).
const DIAS_GUARDADOS = 60;

let estado: Estado = { cargado: false, ajustes: AJUSTES_RECORDATORIOS_POR_DEFECTO, envios: {} };
let cargando: Promise<Estado> | null = null;
const oyentes = new Set<() => void>();

function cambiar(cambios: Partial<Estado>) {
  estado = { ...estado, ...cambios };
  oyentes.forEach((avisar) => avisar());
}

export function leerRecordatorios(): Promise<Estado> {
  if (!cargando) {
    cargando = Promise.all([
      leerAjuste<Partial<AjustesRecordatorios>>(CLAVE_AJUSTES, {}),
      leerAjuste<Envios>(CLAVE_ENVIOS, {}),
    ]).then(([ajustes, envios]) => {
      cambiar({ cargado: true, ajustes: { ...AJUSTES_RECORDATORIOS_POR_DEFECTO, ...ajustes }, envios: envios ?? {} });
      return estado;
    });
  }
  return cargando.then(() => estado);
}

export async function cambiarAjustesRecordatorios(cambios: Partial<AjustesRecordatorios>): Promise<void> {
  await leerRecordatorios();
  cambiar({ ajustes: { ...estado.ajustes, ...cambios } });
  await guardarAjuste(CLAVE_AJUSTES, estado.ajustes);
}

function recientes(envios: Envios, ahora: Date): Envios {
  const limite = ahora.getTime() - DIAS_GUARDADOS * 86400000;
  return Object.fromEntries(Object.entries(envios).filter(([, e]) => new Date(e.el).getTime() >= limite));
}

// Apunta cómo fue el envío del recordatorio de una cita (clave "<evento>:<día>").
export async function apuntarEnvio(clave: string, envio: EnvioRecordatorio): Promise<void> {
  await leerRecordatorios();
  cambiar({ envios: recientes({ ...estado.envios, [clave]: envio }, new Date()) });
  await guardarAjuste(CLAVE_ENVIOS, estado.envios);
}

// "No llegué a enviarlo": vuelve a quedar pendiente (y vuelve el aviso si aún toca).
export async function olvidarEnvio(clave: string): Promise<void> {
  await leerRecordatorios();
  const resto = { ...estado.envios };
  delete resto[clave];
  cambiar({ envios: resto });
  await guardarAjuste(CLAVE_ENVIOS, estado.envios);
}

export function suscribirseRecordatorios(avisar: () => void): () => void {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

function leerEstado() {
  return estado;
}

export function useRecordatorios(): Estado {
  useEffect(() => {
    leerRecordatorios();
  }, []);
  return useSyncExternalStore(suscribirseRecordatorios, leerEstado, leerEstado);
}
