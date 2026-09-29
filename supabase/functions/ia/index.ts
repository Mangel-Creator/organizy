// Organizy · Cuánta IA te queda (29/09/2026).
//
// La app pregunta aquí para enseñar en Perfil > "Tu IA" las dos barras, como en
// Claude: lo gastado en estas 5 horas y en la semana, cuándo se libera cada una y
// el saldo extra. Solo lee: no llama a Claude ni gasta nada.
//
// Acción "estado" con la sesión (anónima) de la persona. Comprar más IA aún no se
// puede (hace falta el pago de Apple/Google o Stripe): cuando se pueda, el aviso del
// pago llamará a la función SQL ia_recargar y el secreto IA_COMPRA_ACTIVA=si
// enseñará el botón de comprar.

import { respuestaJson, respuestaPrevia } from '../_shared/cors.ts';
import { estadoIA } from '../_shared/limiteIA.ts';
import { usuarioDeLaPeticion } from '../_shared/usuario.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return respuestaPrevia(req);
  if (req.method !== 'POST') return respuestaJson(req, { error: 'metodo' }, 405);

  const usuario = await usuarioDeLaPeticion(req);
  if (!usuario) return respuestaJson(req, { error: 'sin-sesion' }, 401);

  const cuerpo = (await req.json().catch(() => null)) as { accion?: unknown } | null;
  if (cuerpo?.accion !== 'estado') return respuestaJson(req, { error: 'peticion' }, 400);

  try {
    return respuestaJson(req, { estado: await estadoIA(usuario) });
  } catch (error) {
    console.error(error);
    return respuestaJson(req, { error: 'servidor' }, 500);
  }
});
