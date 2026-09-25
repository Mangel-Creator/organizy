import { guardarAjuste, leerAjuste } from '@/data/ajustes';

import type { Epoca, RegistroBloque, RepositorioEpocas } from './tipos';

// Guardado de las épocas doradas en la versión web: igual que los eventos
// (data/eventos/repositorio.web.ts), en el almacenamiento del navegador, porque
// GitHub Pages no permite SQLite. Claves "organizy:epocas" y "organizy:bloquesEpoca".

const CLAVE_EPOCAS = 'epocas';
const CLAVE_REGISTRO = 'bloquesEpoca';

const leerEpocas = () => leerAjuste<Epoca[]>(CLAVE_EPOCAS, []);
const leerRegistro = () => leerAjuste<RegistroBloque[]>(CLAVE_REGISTRO, []);

export const repositorio: RepositorioEpocas = {
  leerEpocas,
  leerRegistro,

  async guardarEpoca(epoca) {
    const epocas = await leerEpocas();
    await guardarAjuste(CLAVE_EPOCAS, [...epocas.filter((e) => e.id !== epoca.id), epoca]);
  },

  async borrarEpoca(id) {
    const [epocas, registro] = await Promise.all([leerEpocas(), leerRegistro()]);
    await guardarAjuste(CLAVE_EPOCAS, epocas.filter((e) => e.id !== id));
    await guardarAjuste(CLAVE_REGISTRO, registro.filter((r) => r.epocaId !== id));
  },

  async guardarRegistro(bloque) {
    const registro = await leerRegistro();
    await guardarAjuste(CLAVE_REGISTRO, [...registro.filter((r) => r.id !== bloque.id), bloque]);
  },

  async borrarRegistro(id) {
    const registro = await leerRegistro();
    await guardarAjuste(CLAVE_REGISTRO, registro.filter((r) => r.id !== id));
  },
};
