import * as Location from 'expo-location';

import { consultarPermiso } from './permisos';
import type { Punto } from './rutas/tipos';

// Dónde está ahora el usuario, solo si ya dio permiso de ubicación (aquí nunca se
// pregunta: eso se hace en la bienvenida, en Perfil o con el botón del mapa).
// Devuelve null si no hay permiso o no se puede saber.
export async function ubicacionActual(): Promise<Punto | null> {
  try {
    if ((await consultarPermiso('ubicacion')) !== 'concedido') return null;
    // Primero la última conocida (es instantánea), si es de hace menos de 5 minutos.
    const reciente = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }).catch(() => null);
    const posicion = reciente ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return [posicion.coords.latitude, posicion.coords.longitude];
  } catch {
    return null;
  }
}
