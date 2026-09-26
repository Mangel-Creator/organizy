import type { StyleProp, ViewStyle } from 'react-native';

import type { Punto, Radar, Ruta } from '@/services/rutas';

// Lo que recibe el mapa, igual en el móvil (MapaRuta.tsx, react-native-maps) y en
// la web (MapaRuta.web.tsx, Leaflet).
export type PropsMapa = {
  ubicacion: Punto | null; // dónde estás (punto azul)
  destino: Punto | null;
  rutas: Ruta[];
  elegida: number; // índice de la ruta elegida en "rutas"
  alElegir: (indice: number) => void; // al tocar una ruta alternativa
  radares: Radar[];
  centroInicial?: Punto | null; // si aún no se sabe dónde estás (por ejemplo, tu casa)
  seguir?: boolean; // navegando: el mapa va centrado en ti, de cerca
  style?: StyleProp<ViewStyle>;
};

// Centro de España, para cuando todavía no se sabe dónde estás.
export const CENTRO_POR_DEFECTO: Punto = [40.4168, -3.7038];

// Los tramos de la ruta elegida, cada uno con sus puntos, para pintarlos encima.
export function puntosDeTramo(ruta: Ruta, desde: number, hasta: number): Punto[] {
  return ruta.puntos.slice(desde, hasta + 1);
}

export type MarcaRadar = { clave: string; punto: Punto; limite: number | null; titulo: string; detalle: string };

// Una marca por cabina y dos por tramo de velocidad media (principio y final).
export function marcasDeRadares(radares: Radar[]): MarcaRadar[] {
  return radares.flatMap((r) => {
    const detalle = [r.carretera, r.provincia, r.limite ? `${r.limite} km/h` : null].filter(Boolean).join(' · ');
    const limite = r.limite ?? null;
    if (!r.fin) return [{ clave: r.id, punto: [r.lat, r.lon] as Punto, limite, titulo: 'Radar fijo', detalle }];
    return [
      { clave: `${r.id}:inicio`, punto: [r.lat, r.lon] as Punto, limite, titulo: 'Empieza tramo de velocidad media', detalle },
      { clave: `${r.id}:fin`, punto: r.fin, limite, titulo: 'Termina tramo de velocidad media', detalle },
    ];
  });
}

// Todos los puntos que tienen que caber en pantalla.
export function puntosVisibles({ ubicacion, destino, rutas }: Pick<PropsMapa, 'ubicacion' | 'destino' | 'rutas'>): Punto[] {
  const puntos: Punto[] = rutas.flatMap((r) => r.puntos);
  if (ubicacion) puntos.push(ubicacion);
  if (destino) puntos.push(destino);
  return puntos;
}
