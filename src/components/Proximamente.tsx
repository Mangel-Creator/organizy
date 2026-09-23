import { capitalizar, formatearFechaLarga } from '@/services/fechas';

import { Pantalla } from './Pantalla';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';
import { Titulo } from './Titulo';

type Props = {
  titulo: string;
};

// Pantalla provisional para las pestañas que aún no están hechas.
export function Proximamente({ titulo }: Props) {
  return (
    <Pantalla>
      <Texto secundario>{capitalizar(formatearFechaLarga(new Date()))}</Texto>
      <Titulo>{titulo}</Titulo>
      <Tarjeta>
        <Texto>Próximamente</Texto>
      </Tarjeta>
    </Pantalla>
  );
}
