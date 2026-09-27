import { useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import {
  cancelarDictado,
  consultarPermisoDictado,
  dictadoDisponible,
  empezarDictado,
  mensajeFallo,
  pedirPermisoDictado,
} from '@/services/dictado';

// El micro de la captura rápida (fase 9). La primera vez explica para qué es antes de
// que el sistema pida el permiso; si se deniega, dice cómo darlo. Mientras escucha,
// lo que va entendiendo sale en el campo (alOir) y al terminar se envía por el mismo
// camino que lo escrito (alTerminar).

export type FaseDictado = 'quieto' | 'explicar' | 'escuchando' | 'sin-permiso';

const CLAVE_EXPLICADO = 'dictadoExplicado';
const esWeb = Platform.OS === 'web';

type Opciones = { alOir: (texto: string) => void; alTerminar: (texto: string) => void };

export function useDictado({ alOir, alTerminar }: Opciones) {
  const [disponible] = useState(dictadoDisponible);
  const [fase, setFase] = useState<FaseDictado>('quieto');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const terminar = useRef<(() => void) | null>(null);

  // Al salir de la pantalla no se sigue escuchando.
  useEffect(() => () => cancelarDictado(), []);

  const escuchar = () => {
    setMensaje(null);
    setFase('escuchando');
    terminar.current = empezarDictado({
      alOir,
      alTerminar: (texto) => {
        terminar.current = null;
        setFase('quieto');
        alTerminar(texto);
      },
      alFallar: (fallo) => {
        terminar.current = null;
        setFase(fallo === 'sin-permiso' ? 'sin-permiso' : 'quieto');
        setMensaje(fallo === 'sin-permiso' ? null : mensajeFallo(fallo, esWeb));
      },
    });
  };

  const pedirYEscuchar = async () => {
    await guardarAjuste(CLAVE_EXPLICADO, true);
    // En la web lo pregunta el navegador al empezar; en el móvil, el sistema, aquí.
    if (!esWeb) {
      const estado = await pedirPermisoDictado();
      if (estado !== 'concedido') {
        setFase('sin-permiso');
        return;
      }
    }
    escuchar();
  };

  const pulsar = async () => {
    if (fase === 'escuchando') {
      terminar.current?.();
      return;
    }
    setMensaje(null);
    const estado = await consultarPermisoDictado();
    if (estado === 'concedido') return escuchar();
    if (estado === 'bloqueado') return setFase('sin-permiso');
    const explicado = await leerAjuste(CLAVE_EXPLICADO, false);
    if (!explicado) return setFase('explicar');
    return pedirYEscuchar();
  };

  return {
    disponible,
    fase,
    mensaje,
    pulsar,
    aceptar: pedirYEscuchar,
    cerrar: () => {
      setFase('quieto');
      setMensaje(null);
    },
    // En el móvil lleva a los Ajustes de Organizy; en la web no se puede.
    abrirAjustes: esWeb ? null : () => Linking.openSettings(),
  };
}
