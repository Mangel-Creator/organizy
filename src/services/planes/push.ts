import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { consultarPermiso } from '@/services/permisos';

// Avisos push de los planes (fase 8): "Laura ha votado. Ganan las 21:00…".
// Los manda la función "votar" del servidor por el servicio de Expo, a la dirección
// de avisos (token) de este móvil, que se guarda con cada plan.
//
// Dónde funcionan:
//   - Expo Go en iPhone: sí.
//   - Expo Go en Android: no (desde el SDK 53 hace falta la app propia).
//   - App propia: sí (en iPhone, con la cuenta de desarrollador de Apple).
//   - Web: no. Al abrir Planes (o volver a la web) se ven los votos nuevos marcados.

export const pushPosible = Platform.OS !== 'web';

// Dirección de avisos de este móvil, o null si no hay permiso o no se puede.
export async function tokenDeAvisos(): Promise<string | null> {
  if (!pushPosible) return null;
  if ((await consultarPermiso('notificaciones')) !== 'concedido') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    // Por ejemplo, Expo Go en Android.
    console.warn('Sin avisos push en este móvil', error);
    return null;
  }
}

// Llama a "alLlegar" cuando llega un aviso de voto con la app abierta (para
// refrescar los votos al momento).
export function escucharVotos(alLlegar: () => void): () => void {
  if (!pushPosible) return () => {};
  const suscripcion = Notifications.addNotificationReceivedListener((aviso) => {
    const datos = aviso.request.content.data as { tipo?: string } | undefined;
    if (datos?.tipo === 'plan-voto') alLlegar();
  });
  return () => suscripcion.remove();
}
