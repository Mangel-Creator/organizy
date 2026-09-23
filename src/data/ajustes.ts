import AsyncStorage from '@react-native-async-storage/async-storage';

// Guardado de ajustes sencillos (valores pequeños) con AsyncStorage.
// Cada ajuste se guarda como JSON bajo una clave con el prefijo "organizy:".

const PREFIJO = 'organizy:';

export async function leerAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  try {
    const texto = await AsyncStorage.getItem(PREFIJO + clave);
    return texto === null ? porDefecto : (JSON.parse(texto) as T);
  } catch {
    return porDefecto;
  }
}

export async function guardarAjuste<T>(clave: string, valor: T): Promise<void> {
  await AsyncStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
}

export async function borrarAjuste(clave: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIJO + clave);
}
