import { pedirAlServidor } from './servidor';
import type { PeticionRutas, ResultadoRutas, Ruta } from './tipos';

// Rutas con tráfico (fase 6). Las calcula TomTom a través de nuestro servidor
// (Supabase Edge Function "rutas"), que guarda la clave en secreto.
//
//   - calcularRutas(peticion): 1 a 3 rutas con duración, retraso por tráfico y tramos.
//   - Se guardan 5 minutos en memoria: si se vuelve a pedir lo mismo, no se llama
//     otra vez al servidor (cada llamada gasta del uso gratuito de TomTom).

export * from './horasPunta';
export * from './navegacion';
export * from './radares';
export * from './textos';
export * from './tipos';

export const DURACION_CACHE_MS = 5 * 60 * 1000;

// 4 decimales son unos 11 metros: moverse un poco no gasta otra llamada.
function redondear(n: number): string {
  return n.toFixed(4);
}

// La hora pedida se redondea a 5 minutos por el mismo motivo.
function redondearHora(iso: string | undefined): string {
  if (!iso) return '';
  const cinco = 5 * 60 * 1000;
  return String(Math.round(new Date(iso).getTime() / cinco));
}

export function claveCache(p: PeticionRutas): string {
  return [
    redondear(p.origen[0]),
    redondear(p.origen[1]),
    redondear(p.destino[0]),
    redondear(p.destino[1]),
    p.modo,
    p.alternativas,
    p.instrucciones ? 'i' : '',
    `l${redondearHora(p.llegada)}`,
    `s${redondearHora(p.salida)}`,
  ].join('|');
}

const cache = new Map<string, { hasta: number; resultado: Promise<ResultadoRutas> }>();

export function calcularRutas(peticion: PeticionRutas): Promise<ResultadoRutas> {
  const ahora = Date.now();
  for (const [clave, entrada] of cache) if (entrada.hasta < ahora) cache.delete(clave);

  const clave = claveCache(peticion);
  const guardada = cache.get(clave);
  if (guardada) return guardada.resultado;

  const resultado = pedirAlServidor<{ rutas: Ruta[] }>({ accion: 'rutas', ...peticion }).then(
    (respuesta): ResultadoRutas => {
      // Los errores no se guardan: al reintentar, se vuelve a preguntar.
      if (respuesta.estado !== 'ok') cache.delete(clave);
      if (respuesta.estado === 'ok') return { estado: 'ok', rutas: respuesta.datos.rutas ?? [] };
      return respuesta;
    },
  );
  cache.set(clave, { hasta: ahora + DURACION_CACHE_MS, resultado });
  return resultado;
}
