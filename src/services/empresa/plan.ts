import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Organizy grupal es un PLAN EXTRA ("Plan empresa"), no parte de la app de siempre
// (decisión del usuario del 29/09/2026). Se elige con "Cambiar de plan" en Perfil.
//
// Por ahora solo se ve:
//   - en Expo Go (el dueño lo prueba ahí),
//   - en desarrollo (localhost),
//   - y en la web, solo si alguien llega con un enlace de invitación (o ya tiene el plan
//     puesto). En la web pública no sale "Cambiar de plan".

export const enExpoGo = Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function planEmpresaVisible(modo: boolean): boolean {
  return enExpoGo || __DEV__ || modo;
}

export const NOMBRE_PLAN = { personal: 'Plan personal', empresa: 'Plan empresa' } as const;
