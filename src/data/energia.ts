import { useEffect, useState } from 'react';

import type { Energia } from '@/services/agenda';
import type { ClaveDia } from '@/services/fechas';

import { guardarAjuste, leerAjuste } from './ajustes';

// Energía elegida en Hoy ("A tope", "Normal" o "Tranqui"). Se guarda para
// cada día con la clave "organizy:energia:AAAA-MM-DD". Por defecto, Normal.

export function useEnergia(dia: ClaveDia): [Energia, (energia: Energia) => void] {
  const [energia, setEnergia] = useState<{ dia: ClaveDia; valor: Energia }>({ dia, valor: 'normal' });

  useEffect(() => {
    let vigente = true;
    leerAjuste<Energia>(`energia:${dia}`, 'normal').then((valor) => {
      if (vigente) setEnergia({ dia, valor });
    });
    return () => {
      vigente = false;
    };
  }, [dia]);

  const cambiar = (valor: Energia) => {
    setEnergia({ dia, valor });
    guardarAjuste(`energia:${dia}`, valor);
  };

  return [energia.dia === dia ? energia.valor : 'normal', cambiar];
}
