import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import type { Punto } from './tipos';

// Navegación con el móvil bloqueado (solo en la app propia, no en Expo Go ni en la web).
// El sistema sigue mandando la ubicación a esta tarea aunque la pantalla esté apagada,
// y el motor sigue hablando (el audio en segundo plano está activado en app.json).
//
// Expo Go no deja usar la ubicación en segundo plano: allí la navegación funciona con
// la pantalla encendida (la app la mantiene encendida mientras navegas).

const TAREA = 'organizy-navegacion';

export const fondoDisponible = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let receptor: ((p: Punto) => void) | null = null;

// Se define al cargar el módulo (se importa desde _layout.tsx), como pide expo-task-manager.
if (fondoDisponible) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TAREA, async ({ data, error }) => {
    if (error || !data?.locations?.length || !receptor) return;
    const ultima = data.locations[data.locations.length - 1];
    receptor([ultima.coords.latitude, ultima.coords.longitude]);
  });
}

// Empieza a recibir la ubicación también en segundo plano. Devuelve false si no se
// puede (Expo Go o permiso denegado): entonces se usa solo la de primer plano.
export async function iniciarFondo(alRecibir: (p: Punto) => void): Promise<boolean> {
  if (!fondoDisponible) return false;
  receptor = alRecibir;
  const opciones: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.AutomotiveNavigation,
    distanceInterval: 5,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Organizy te está guiando',
      notificationBody: 'Indicaciones por voz hasta tu destino.',
    },
  };
  try {
    await Location.startLocationUpdatesAsync(TAREA, opciones);
    return true;
  } catch {
    // Puede que haga falta el permiso "Siempre": se pide una vez y se reintenta.
    try {
      const { granted } = await Location.requestBackgroundPermissionsAsync();
      if (!granted) return false;
      await Location.startLocationUpdatesAsync(TAREA, opciones);
      return true;
    } catch {
      receptor = null;
      return false;
    }
  }
}

export async function pararFondo(): Promise<void> {
  receptor = null;
  if (!fondoDisponible) return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TAREA)) await Location.stopLocationUpdatesAsync(TAREA);
  } catch {
    // Ya estaba parada.
  }
}
