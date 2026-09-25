import 'leaflet/dist/leaflet.css';

import type * as L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colores, coloresMapa } from '@/theme';

import { CENTRO_POR_DEFECTO, puntosDeTramo, puntosVisibles, type PropsMapa } from './tipos';

// Mapa de la web con Leaflet. Leaflet necesita el navegador, así que se carga al
// montar el componente (no al compilar la web estática).
//
// Fondo del mapa y capa de tráfico de todas las carreteras: TomTom, con una clave
// PÚBLICA restringida a la web de Organizy y solo a mapas (EXPO_PUBLIC_TOMTOM_MAPA_KEY).
// Esa clave no sirve para calcular rutas (eso va por el servidor) y, como la cuenta de
// TomTom no tiene tarjeta, no puede generar gasto. Sin ella, el fondo es el de
// OpenStreetMap y no hay capa de tráfico (solo los tramos de la ruta).

const CLAVE_MAPA = process.env.EXPO_PUBLIC_TOMTOM_MAPA_KEY ?? '';

const ATRIBUCION_OSM = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ATRIBUCION_TOMTOM = '© <a href="https://www.tomtom.com">TomTom</a>';

type Capas = { rutas: L.LayerGroup; radares: L.LayerGroup; marcas: L.LayerGroup };

export function MapaRuta({ ubicacion, destino, rutas, elegida, alElegir, radares, centroInicial, style }: PropsMapa) {
  const contenedor = useRef<View>(null);
  const [leaflet, setLeaflet] = useState<typeof L | null>(null);
  const mapa = useRef<L.Map | null>(null);
  const capas = useRef<Capas | null>(null);

  // Crear el mapa una vez.
  useEffect(() => {
    let cancelado = false;
    import('leaflet').then((modulo) => {
      const Lf = (modulo as unknown as { default?: typeof L }).default ?? (modulo as unknown as typeof L);
      const nodo = contenedor.current as unknown as HTMLElement | null;
      if (cancelado || !nodo) return;
      const centro = ubicacion ?? destino ?? centroInicial ?? CENTRO_POR_DEFECTO;
      const m = Lf.map(nodo, { zoomControl: true, attributionControl: true }).setView(
        centro,
        ubicacion || destino || centroInicial ? 13 : 6,
      );
      if (CLAVE_MAPA) {
        Lf.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${CLAVE_MAPA}&language=es-ES`, {
          maxZoom: 19,
          attribution: ATRIBUCION_TOMTOM,
        }).addTo(m);
        Lf.tileLayer(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${CLAVE_MAPA}`, {
          maxZoom: 19,
          opacity: 0.85,
        }).addTo(m);
      } else {
        Lf.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: ATRIBUCION_OSM,
        }).addTo(m);
      }
      capas.current = {
        rutas: Lf.layerGroup().addTo(m),
        radares: Lf.layerGroup().addTo(m),
        marcas: Lf.layerGroup().addTo(m),
      };
      mapa.current = m;
      setLeaflet(Lf);
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      capas.current = null;
    };
    // Solo al montar: lo demás se actualiza en los efectos de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rutas, tramos de tráfico, radares y marcas.
  useEffect(() => {
    const Lf = leaflet;
    const c = capas.current;
    if (!Lf || !c) return;
    c.rutas.clearLayers();
    c.radares.clearLayers();
    c.marcas.clearLayers();

    rutas.forEach((r, i) => {
      if (i === elegida) return;
      Lf.polyline(r.puntos, { color: coloresMapa.rutaAlternativa, weight: 6, opacity: 0.9 })
        .on('click', () => alElegir(i))
        .addTo(c.rutas);
    });
    const ruta = rutas[elegida];
    if (ruta) {
      Lf.polyline(ruta.puntos, { color: coloresMapa.ruta, weight: 7 }).addTo(c.rutas);
      for (const t of ruta.tramos) {
        Lf.polyline(puntosDeTramo(ruta, t.desde, t.hasta), {
          color: t.nivel === 'atasco' ? coloresMapa.atasco : coloresMapa.denso,
          weight: 7,
        }).addTo(c.rutas);
      }
    }
    for (const r of radares) {
      Lf.circleMarker([r.lat, r.lon], {
        radius: 7,
        color: coloresMapa.bordeRadar,
        weight: 3,
        fillColor: coloresMapa.radar,
        fillOpacity: 1,
      })
        .bindTooltip(`${r.tipo === 'tramo' ? 'Tramo de velocidad media' : 'Radar fijo'} · ${r.carretera}`)
        .addTo(c.radares);
    }
    if (ubicacion) {
      Lf.circleMarker(ubicacion, {
        radius: 8,
        color: '#FFFFFF',
        weight: 3,
        fillColor: colores.principal,
        fillOpacity: 1,
      }).addTo(c.marcas);
    }
    if (destino) {
      Lf.circleMarker(destino, {
        radius: 10,
        color: colores.principal,
        weight: 4,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
      }).addTo(c.marcas);
    }
  }, [leaflet, rutas, elegida, alElegir, radares, ubicacion, destino]);

  // Encuadrar la ruta (o tu posición y el destino) al cambiar.
  const visibles = puntosVisibles({ ubicacion, destino, rutas });
  const huella = `${visibles.length}:${visibles[0]?.join()}:${visibles[visibles.length - 1]?.join()}`;
  useEffect(() => {
    const m = mapa.current;
    if (!leaflet || !m || visibles.length === 0) return;
    if (visibles.length === 1) m.setView(visibles[0], 14);
    else m.fitBounds(leaflet.latLngBounds(visibles), { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, huella]);

  return <View ref={contenedor} style={[estilos.contenedor, style]} />;
}

const estilos = StyleSheet.create({
  contenedor: { overflow: 'hidden', backgroundColor: colores.borde, zIndex: 0 },
});
