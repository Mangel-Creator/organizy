// Tramos de tiempo dentro de un día, en minutos desde medianoche.
// Por ejemplo, de 17:00 a 19:00 es { inicio: 1020, fin: 1140 }.

export type Intervalo = { inicio: number; fin: number };

// Junta los tramos que se pisan o se tocan y los ordena.
// [9:00-10:00, 9:30-11:00] -> [9:00-11:00]
export function unirIntervalos(intervalos: Intervalo[]): Intervalo[] {
  const ordenados = intervalos
    .filter((i) => i.fin > i.inicio)
    .map((i) => ({ ...i }))
    .sort((a, b) => a.inicio - b.inicio);
  const unidos: Intervalo[] = [];
  for (const actual of ordenados) {
    const ultimo = unidos[unidos.length - 1];
    if (ultimo && actual.inicio <= ultimo.fin) {
      ultimo.fin = Math.max(ultimo.fin, actual.fin);
    } else {
      unidos.push(actual);
    }
  }
  return unidos;
}

// Minutos totales ocupados, sin contar dos veces lo que se solapa.
export function minutosOcupados(intervalos: Intervalo[]): number {
  return unirIntervalos(intervalos).reduce((total, i) => total + (i.fin - i.inicio), 0);
}

export function sePisan(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

// Huecos libres dentro de "ventana" (por ejemplo, de levantarse a acostarse)
// que duran al menos "minimoMin" minutos.
export function calcularHuecos(
  ocupados: Intervalo[],
  ventana: Intervalo,
  minimoMin = 60,
): Intervalo[] {
  const recortados = ocupados.map((i) => ({
    inicio: Math.max(i.inicio, ventana.inicio),
    fin: Math.min(i.fin, ventana.fin),
  }));
  const huecos: Intervalo[] = [];
  let cursor = ventana.inicio;
  for (const ocupado of unirIntervalos(recortados)) {
    if (ocupado.inicio - cursor >= minimoMin) {
      huecos.push({ inicio: cursor, fin: ocupado.inicio });
    }
    cursor = Math.max(cursor, ocupado.fin);
  }
  if (ventana.fin - cursor >= minimoMin) {
    huecos.push({ inicio: cursor, fin: ventana.fin });
  }
  return huecos;
}
