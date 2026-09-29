import { obtenerBD } from '@/data/db';

import type { RepositorioEmpresa } from './tipos';

// Copia de lo de la empresa en el móvil (SQLite, migración 9 de data/db.ts), para verlo
// sin conexión. Una sola fila con todo, como JSON: se cambia entera cada vez que se trae
// del servidor. Al salir de la empresa se borra.

const CLAVE = 'todo';

export const repositorio: RepositorioEmpresa = {
  async leer() {
    const bd = await obtenerBD();
    const fila = await bd.getFirstAsync<{ datos: string }>('SELECT datos FROM empresa_copia WHERE clave = ?', CLAVE);
    return fila?.datos ?? null;
  },
  async guardar(texto) {
    const bd = await obtenerBD();
    await bd.runAsync(
      'INSERT INTO empresa_copia (clave, datos, guardada) VALUES (?, ?, ?) ON CONFLICT (clave) DO UPDATE SET datos = excluded.datos, guardada = excluded.guardada',
      CLAVE,
      texto,
      new Date().toISOString(),
    );
  },
  async borrar() {
    const bd = await obtenerBD();
    await bd.runAsync('DELETE FROM empresa_copia');
  },
};
