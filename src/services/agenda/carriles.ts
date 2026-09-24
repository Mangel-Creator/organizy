import type { Intervalo } from './huecos';

// Para dibujar un día con línea de horas: si dos eventos se solapan, cada uno
// va en su columna ("carril") para que no se tapen.

export type Colocado<T> = { elemento: T; carril: number; carriles: number };

export function colocarEnCarriles<T>(elementos: T[], tramo: (e: T) => Intervalo): Colocado<T>[] {
  const ordenados = [...elementos].sort((a, b) => tramo(a).inicio - tramo(b).inicio);
  const resultado: Colocado<T>[] = [];
  let grupo: Colocado<T>[] = []; // eventos que se solapan entre sí (en cadena)
  let finesCarriles: number[] = []; // hora a la que queda libre cada carril
  let finGrupo = -Infinity;

  const cerrarGrupo = () => {
    grupo.forEach((c) => (c.carriles = finesCarriles.length));
    resultado.push(...grupo);
    grupo = [];
    finesCarriles = [];
  };

  for (const elemento of ordenados) {
    const { inicio, fin } = tramo(elemento);
    if (inicio >= finGrupo) cerrarGrupo();
    let carril = finesCarriles.findIndex((libreDesde) => libreDesde <= inicio);
    if (carril === -1) carril = finesCarriles.push(fin) - 1;
    else finesCarriles[carril] = fin;
    grupo.push({ elemento, carril, carriles: 0 });
    finGrupo = Math.max(finGrupo, fin);
  }
  cerrarGrupo();
  return resultado;
}
