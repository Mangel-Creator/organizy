import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { claveDia } from '@/services/fechas';

import { ACCION_A_MANANA, ACCION_ABRIR, type AvisoPlanificado, type DatosAviso } from './tipos';

// Notificaciones locales en el móvil (Android e iOS) con expo-notifications.
// En la web se usa programar.web.ts, que no hace nada: el navegador no puede
// programar avisos con la web cerrada.

export const avisosDisponibles = true;

const CANAL = 'avisos'; // Android: todas las notificaciones van en un canal
const PREFIJO_PRUEBA = 'prueba:';

let preparado: Promise<void> | null = null;

// Se llama una vez al arrancar: cómo se muestran los avisos con la app abierta,
// el canal de Android y los botones del cierre del día.
export function prepararAvisos(): Promise<void> {
  if (!preparado) {
    preparado = (async () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CANAL, {
          name: 'Avisos',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      // iOS no deja que un botón de la notificación ejecute la app por detrás
      // (y menos en Expo Go), así que "Sí, a mañana" abre la app, pasa las
      // tareas al momento y enseña Hoy con la confirmación.
      await Notifications.setNotificationCategoryAsync('cierre-dia', [
        { identifier: ACCION_A_MANANA, buttonTitle: 'Sí, a mañana', options: { opensAppToForeground: true } },
        { identifier: ACCION_ABRIR, buttonTitle: 'Abrir', options: { opensAppToForeground: true } },
      ]);
    })().catch(() => {});
  }
  return preparado;
}

function contenido(titulo: string, cuerpo: string, datos: DatosAviso, categoria?: string) {
  return {
    title: titulo,
    body: cuerpo,
    data: datos as unknown as Record<string, unknown>,
    sound: 'default' as const,
    ...(categoria ? { categoryIdentifier: categoria } : {}),
  };
}

// Sustituye todos los avisos programados por estos. Devuelve cuántos quedan.
export async function programarAvisos(avisos: AvisoPlanificado[]): Promise<number> {
  await prepararAvisos();
  const programados = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of programados) {
    // El aviso de prueba se deja: llega en unos segundos.
    if (!n.identifier.startsWith(PREFIJO_PRUEBA)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  for (const aviso of avisos) {
    await Notifications.scheduleNotificationAsync({
      identifier: aviso.id,
      content: contenido(
        aviso.titulo,
        aviso.cuerpo,
        { tipo: aviso.tipo, dia: aviso.dia, destino: aviso.destino },
        aviso.categoria,
      ),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: aviso.cuando, channelId: CANAL },
    });
  }
  return avisos.length;
}

export async function contarAvisosProgramados(): Promise<number> {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}

// Para probar desde Perfil que los avisos llegan (en 5 segundos).
export async function enviarAvisoDePrueba(): Promise<void> {
  await prepararAvisos();
  await Notifications.scheduleNotificationAsync({
    identifier: `${PREFIJO_PRUEBA}${Date.now()}`,
    content: contenido('Aviso de prueba', 'Si ves esto, los avisos de Organizy funcionan.', {
      tipo: 'prueba',
      dia: claveDia(new Date()),
      destino: { pantalla: 'hoy' },
    }),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
      channelId: CANAL,
    },
  });
}

export type RespuestaAviso = { accion: 'tocar' | 'a-manana' | 'abrir'; datos: DatosAviso };

function traducir(respuesta: Notifications.NotificationResponse): RespuestaAviso | null {
  const datos = respuesta.notification.request.content.data as unknown as DatosAviso | undefined;
  if (!datos?.destino) return null;
  const accion =
    respuesta.actionIdentifier === ACCION_A_MANANA
      ? 'a-manana'
      : respuesta.actionIdentifier === ACCION_ABRIR
        ? 'abrir'
        : 'tocar';
  return { accion, datos };
}

// Avisa cada vez que el usuario toca un aviso o uno de sus botones, también el
// que abrió la app si estaba cerrada. Devuelve la función para dejar de escuchar.
export function escucharRespuestas(alResponder: (respuesta: RespuestaAviso) => void): () => void {
  const atender = (respuesta: Notifications.NotificationResponse | null) => {
    if (!respuesta) return;
    // Se borra para no atenderla dos veces (por ejemplo, al volver a montar).
    Notifications.clearLastNotificationResponse();
    const traducida = traducir(respuesta);
    if (traducida) alResponder(traducida);
  };
  atender(Notifications.getLastNotificationResponse());
  const suscripcion = Notifications.addNotificationResponseReceivedListener(atender);
  return () => suscripcion.remove();
}
