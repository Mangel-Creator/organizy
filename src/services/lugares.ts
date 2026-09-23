import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { guardarPerfil, leerPerfil, type Coordenadas, type Lugar } from '@/data/perfil';

// Convierte texto ("Chamberí, Madrid") en coordenadas con expo-location.
// Solo funciona en el móvil (Android e iOS). En el navegador del ordenador
// devuelve "no-disponible": se guarda el texto y las coordenadas se calculan
// la próxima vez que se abra la app en el móvil (ver completarCoordenadasPendientes).

export type ResultadoBusqueda =
  | { estado: 'encontrado'; coordenadas: Coordenadas }
  | { estado: 'no-encontrado' }
  | { estado: 'no-disponible' };

export const puedeBuscarCoordenadas = Platform.OS === 'ios' || Platform.OS === 'android';

export async function buscarCoordenadas(texto: string): Promise<ResultadoBusqueda> {
  if (!puedeBuscarCoordenadas) {
    return { estado: 'no-disponible' };
  }
  try {
    const resultados = await Location.geocodeAsync(texto);
    const primero = resultados[0];
    if (!primero) {
      return { estado: 'no-encontrado' };
    }
    return {
      estado: 'encontrado',
      coordenadas: { latitud: primero.latitude, longitud: primero.longitude },
    };
  } catch {
    // iOS da error cuando no encuentra nada; también si no hay conexión.
    return { estado: 'no-encontrado' };
  }
}

async function completarLugar<T extends Lugar>(lugar: T): Promise<T> {
  if (lugar.coordenadas) {
    return lugar;
  }
  const resultado = await buscarCoordenadas(lugar.direccion);
  return resultado.estado === 'encontrado' ? { ...lugar, coordenadas: resultado.coordenadas } : lugar;
}

// Si hay sitios guardados sin coordenadas, intenta calcularlas ahora.
// Se llama al arrancar la app; en el navegador no hace nada.
export async function completarCoordenadasPendientes(): Promise<void> {
  if (!puedeBuscarCoordenadas) {
    return;
  }
  const perfil = await leerPerfil();
  if (!perfil) {
    return;
  }
  const faltan = !perfil.vivienda.coordenadas || perfil.sitios.some((s) => !s.coordenadas);
  if (!faltan) {
    return;
  }
  const vivienda = await completarLugar(perfil.vivienda);
  const sitios = await Promise.all(perfil.sitios.map(completarLugar));
  await guardarPerfil({ ...perfil, vivienda, sitios });
}
