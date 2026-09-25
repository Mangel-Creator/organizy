import type { Evento } from '@/data/eventos/tipos';
import type { Lugar, Perfil } from '@/data/perfil';
import { eventosDelDia, NOMBRE_CASA, resolverLugar } from '@/services/agenda';
import { claveDia, fechaDesdeClave, formatearDiaCorto, sumarDias, type ClaveDia } from '@/services/fechas';
import { citaDe } from '@/services/rutas/citas';
import type { Punto } from '@/services/rutas/tipos';

// Destinos que propone el buscador "¿A dónde vas?": primero los sitios habituales
// y después los lugares de los próximos eventos.

export type Destino = {
  id: string;
  nombre: string; // "Casa", "Trabajo", "Reunión con Laura"...
  detalle: string; // dirección, o día, hora y sitio del evento
  direccion: string; // para buscar las coordenadas si aún no se tienen
  punto: Punto | null;
  // Si el destino es un evento: para "Sal a las..." y para llegar a tiempo.
  cita: { eventoId: string; dia: ClaveDia; llegada: string } | null;
};

function puntoDe(lugar: Lugar): Punto | null {
  return lugar.coordenadas ? [lugar.coordenadas.latitud, lugar.coordenadas.longitud] : null;
}

// Sin mayúsculas ni tildes, para buscar "cafe" y encontrar "Café".
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-ES')
    .trim();
}

export function sitiosHabituales(perfil: Perfil | null): Destino[] {
  if (!perfil) return [];
  const casa: Destino[] = perfil.vivienda.direccion.trim()
    ? [
        {
          id: 'casa',
          nombre: NOMBRE_CASA,
          detalle: perfil.vivienda.direccion,
          direccion: perfil.vivienda.direccion,
          punto: puntoDe(perfil.vivienda),
          cita: null,
        },
      ]
    : [];
  return [
    ...casa,
    ...perfil.sitios.map((s) => ({
      id: `sitio:${s.id}`,
      nombre: s.nombre,
      detalle: s.direccion,
      direccion: s.direccion,
      punto: puntoDe(s),
      cita: null,
    })),
  ];
}

// Destino de un evento concreto (por ejemplo, desde "Cómo llegar" en Hoy).
export function destinoDeEvento(evento: Evento, dia: ClaveDia, perfil: Perfil | null): Destino | null {
  const lugar = resolverLugar(evento.lugar, perfil);
  if (!lugar) return null;
  const cita = citaDe(evento, dia, perfil);
  const sitio = lugar.nombre ?? lugar.direccion;
  return {
    id: `evento:${evento.id}:${dia}`,
    nombre: evento.titulo,
    detalle: `${formatearDiaCorto(fechaDesdeClave(dia))} · ${evento.horaInicio ?? ''} · ${sitio}`,
    direccion: lugar.direccion,
    punto: cita ? cita.destino : lugar.coordenadas ? [lugar.coordenadas.latitud, lugar.coordenadas.longitud] : null,
    cita: cita ? { eventoId: evento.id, dia, llegada: cita.llegada.toISOString() } : null,
  };
}

// Próximos eventos con lugar (7 días), sin repetir el mismo evento.
export function destinosDeEventos(eventos: Evento[], perfil: Perfil | null, ahora: Date, maximo = 6): Destino[] {
  const hoy = claveDia(ahora);
  const vistos = new Set<string>();
  const destinos: Destino[] = [];
  for (let n = 0; n < 7 && destinos.length < maximo; n++) {
    const dia = sumarDias(hoy, n);
    for (const evento of eventosDelDia(eventos, dia)) {
      if (vistos.has(evento.id) || !evento.lugar || evento.lugar.tipo === 'casa') continue;
      const destino = destinoDeEvento(evento, dia, perfil);
      if (!destino?.cita || new Date(destino.cita.llegada).getTime() <= ahora.getTime()) continue;
      vistos.add(evento.id);
      destinos.push(destino);
      if (destinos.length >= maximo) break;
    }
  }
  return destinos;
}

// Lo que se ve bajo el buscador, filtrado por lo que se ha escrito.
export function sugerencias(perfil: Perfil | null, eventos: Evento[], ahora: Date, texto: string): Destino[] {
  const todos = [...sitiosHabituales(perfil), ...destinosDeEventos(eventos, perfil, ahora)];
  const buscado = normalizar(texto);
  if (!buscado) return todos;
  return todos.filter((d) => normalizar(`${d.nombre} ${d.detalle}`).includes(buscado));
}
