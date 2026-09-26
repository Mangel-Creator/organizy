import { Contact, getPermissionsAsync, requestPermissionsAsync } from 'expo-contacts';
import { Platform } from 'react-native';

// Elegir a alguien de la agenda del móvil (fase 8, "¿Con quién?"). Solo se lee el
// nombre de la persona elegida: no se guarda ni se envía nada más de la agenda.
// El permiso se pide justo al tocar "De la agenda", después de explicar para qué.
// En la web no hay agenda: los nombres se escriben a mano.

export const contactosDisponibles = Platform.OS !== 'web';

export type ResultadoContacto =
  | { estado: 'elegido'; nombre: string }
  | { estado: 'cancelado' }
  | { estado: 'denegado' } // se puede volver a preguntar
  | { estado: 'bloqueado' } // hay que activarlo en Ajustes
  | { estado: 'error' };

// ¿Ya se ha dado el permiso? (para no enseñar la explicación otra vez)
export async function hayPermisoContactos(): Promise<boolean> {
  if (!contactosDisponibles) return false;
  try {
    return (await getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function elegirContacto(): Promise<ResultadoContacto> {
  if (!contactosDisponibles) return { estado: 'error' };
  try {
    const permiso = await requestPermissionsAsync();
    if (!permiso.granted) return { estado: permiso.canAskAgain ? 'denegado' : 'bloqueado' };
    const contacto = await Contact.presentPicker();
    if (!contacto) return { estado: 'cancelado' };
    const nombre = ((await contacto.getGivenName()) || (await contacto.getFullName()) || '').trim();
    return nombre ? { estado: 'elegido', nombre } : { estado: 'cancelado' };
  } catch (error) {
    console.warn('No se pudo abrir la agenda', error);
    return { estado: 'error' };
  }
}
