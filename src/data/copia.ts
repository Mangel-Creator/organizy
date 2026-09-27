import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { SE_RECALCULAN, viajaEnLaCopia, type CopiaSeguridad } from '@/services/copia/formato';

import { guardarAjuste, leerAjuste } from './ajustes';
// En el móvil cargan los de SQLite y en la web los del navegador, como en data/eventos.
import { repositorio as repositorioEpocas } from './epocas/repositorio';
import { repositorio as repositorioEventos } from './eventos/repositorio';

// Copia de seguridad: reúne todo lo guardado en el dispositivo y lo recupera.
// El formato y las comprobaciones están en services/copia/formato.ts.

const PREFIJO = 'organizy:';
const CLAVE_ULTIMA = 'ultimaCopia'; // ISO de la última copia hecha en este dispositivo

async function leerAjustesGuardados(): Promise<Record<string, unknown>> {
  const claves = (await AsyncStorage.getAllKeys()).filter((c) => c.startsWith(PREFIJO));
  const pares = await AsyncStorage.multiGet(claves);
  const ajustes: Record<string, unknown> = {};
  for (const [clave, texto] of pares) {
    if (texto === null) continue;
    try {
      ajustes[clave.slice(PREFIJO.length)] = JSON.parse(texto);
    } catch {
      // Algo guardado sin JSON (no debería haberlo): no se copia.
    }
  }
  return ajustes;
}

export async function reunirDatos(): Promise<
  Pick<CopiaSeguridad, 'eventos' | 'epocas' | 'registroBloques' | 'ajustes'>
> {
  const [eventos, epocas, registroBloques, ajustes] = await Promise.all([
    repositorioEventos.leerTodos(),
    repositorioEpocas.leerEpocas(),
    repositorioEpocas.leerRegistro(),
    leerAjustesGuardados(),
  ]);
  return { eventos, epocas, registroBloques, ajustes };
}

// Cambia todo lo de este dispositivo por lo de la copia. Después hay que reiniciar
// la app: cada parte (perfil, alarmas, planes...) tiene sus datos en memoria.
export async function recuperarCopia(copia: CopiaSeguridad): Promise<void> {
  // Primero lo que puede fallar a medias (SQLite, todo o nada): si falla, no se ha tocado nada más.
  await repositorioEventos.reemplazarTodos(copia.eventos);
  await repositorioEpocas.reemplazarTodo(copia.epocas, copia.registroBloques);

  const actuales = (await AsyncStorage.getAllKeys()).filter((c) => {
    if (!c.startsWith(PREFIJO)) return false;
    const clave = c.slice(PREFIJO.length);
    return viajaEnLaCopia(clave) || SE_RECALCULAN.includes(clave);
  });
  await AsyncStorage.multiRemove(actuales);
  await AsyncStorage.multiSet(
    Object.entries({
      ...copia.ajustes,
      // Que en modo desarrollo no se vuelvan a crear los ejemplos al arrancar.
      ejemplosCreados: true,
      epocaEjemploCreada: true,
    }).map(([clave, valor]) => [PREFIJO + clave, JSON.stringify(valor)] as [string, string]),
  );
}

let ultima: string | null | undefined;
const oyentes = new Set<(iso: string | null) => void>();

export async function apuntarCopiaHecha(ahora: Date): Promise<void> {
  ultima = ahora.toISOString();
  await guardarAjuste(CLAVE_ULTIMA, ultima);
  oyentes.forEach((avisar) => avisar(ultima ?? null));
}

// Cuándo se hizo la última copia en este dispositivo (null = nunca).
export function useUltimaCopia(): { cargada: boolean; ultima: string | null } {
  const [valor, setValor] = useState(ultima);
  useEffect(() => {
    oyentes.add(setValor);
    if (ultima === undefined) {
      leerAjuste<string | null>(CLAVE_ULTIMA, null).then((iso) => {
        ultima = iso;
        setValor(iso);
      });
    }
    return () => {
      oyentes.delete(setValor);
    };
  }, []);
  return { cargada: valor !== undefined, ultima: valor ?? null };
}
