import { borrarAjuste, guardarAjuste, leerAjuste } from '@/data/ajustes';

import type { RepositorioEmpresa } from './tipos';

// En la web, la copia de lo de la empresa va al navegador (organizy:empresaCopia). No
// viaja en la copia de seguridad (services/copia/formato.ts, NO_VIAJAN).

const CLAVE = 'empresaCopia';

export const repositorio: RepositorioEmpresa = {
  leer: () => leerAjuste<string | null>(CLAVE, null),
  guardar: (texto) => guardarAjuste(CLAVE, texto),
  borrar: () => borrarAjuste(CLAVE),
};
