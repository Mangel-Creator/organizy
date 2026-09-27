import type { FalloDictado } from './textos';

// Lo que avisa el dictado mientras escucha. Al final llama a una sola de las dos:
// alTerminar con lo que ha entendido o alFallar con el motivo.
export type Escucha = {
  alOir: (texto: string) => void; // lo que lleva entendido hasta ahora (va cambiando)
  alTerminar: (texto: string) => void;
  alFallar: (fallo: FalloDictado) => void;
};
