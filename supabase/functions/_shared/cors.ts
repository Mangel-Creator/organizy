// CORS: qué páginas web pueden llamar a las funciones desde el navegador.
// Solo la web publicada de Organizy y el servidor de desarrollo (localhost).
// La app del móvil no pasa por aquí (no es un navegador).

const ORIGENES_PERMITIDOS = ['https://mangel-creator.github.io'];

function origenPermitido(origen: string | null): boolean {
  if (!origen) return false;
  if (ORIGENES_PERMITIDOS.includes(origen)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
}

export function cabecerasCors(req: Request): Record<string, string> {
  const origen = req.headers.get('Origin');
  const cabeceras: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-region, x-retry-count, traceparent, tracestate, baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origen && origenPermitido(origen)) cabeceras['Access-Control-Allow-Origin'] = origen;
  return cabeceras;
}

// Respuesta a la pregunta previa (OPTIONS) que hace el navegador antes del POST.
export function respuestaPrevia(req: Request): Response {
  return new Response('ok', { headers: cabecerasCors(req) });
}

export function respuestaJson(req: Request, datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { ...cabecerasCors(req), 'Content-Type': 'application/json' },
  });
}
