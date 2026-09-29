import { AppState } from 'react-native';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import {
  cambiarModoEmpresa,
  estadoEmpresaActual,
  guardarSituacion,
  leerEmpresa,
  olvidarEmpresa,
  type AvisosEmpresa,
  type DatosEmpresa,
} from '@/data/empresa';
import { leerEventos, marcarHecha, suscribirseEventos } from '@/data/eventos';
import { claveDia } from '@/services/fechas';
import { escucharPush, tokenDeAvisos } from '@/services/planes/push';

import { motivoDe } from './base';
import { leerIdVirtual } from './calendario';
import { bloquesOcupados, huellaOcupado } from './disponibilidad';
import { entrarConProveedor, terminarEntradaWeb } from './entrar';
import {
  basePrueba,
  cargarPrueba,
  ejemploPosible,
  esEjemplo,
  modoPruebaEmpresa,
  PERSONAS_PRUEBA,
  ponerEjemplo,
  quitarEjemplo,
} from './prueba';
import type { ProveedorEmpresa, ResultadoEntrar } from './proveedores';
import {
  borrarEmpresaEnServidor,
  crearEmpresa,
  guardarAvisos,
  marcarCanalLeido,
  marcarTarea,
  salirEnServidor,
  subirOcupado,
  traerSituacion,
  unirme,
  base,
} from './servidor';
import { leerCodigoInvitacion } from './textos';

// Organizy grupal (fase 15): activar el modo, entrar, crear o unirse a la empresa, traer
// lo de la empresa y salir. Con el modo apagado no se hace NADA: ni pantallas nuevas, ni
// inicio de sesión, ni llamadas al servidor.

export { ejemploPosible, esEjemplo, modoPruebaEmpresa, PERSONAS_PRUEBA };
export type { ProveedorEmpresa, ResultadoEntrar };

export type Resultado = { ok: true } | { ok: false; motivo: string };

export async function activarModoEmpresa(): Promise<void> {
  await cambiarModoEmpresa(true);
}

// Apagar el modo (sin estar en ninguna empresa): se cierra la sesión de empresa y se
// olvida todo lo de la empresa del dispositivo.
export async function apagarModoEmpresa(): Promise<void> {
  if (esEjemplo()) quitarEjemplo();
  else await base().cerrarSesion();
  await olvidarEmpresa();
}

// --- Traer lo de la empresa ---

let trayendo: Promise<boolean> | null = null;
let ultimaVez = 0;

// Trae del servidor dónde está esta persona y todo lo de su empresa. false si no se pudo
// (sin conexión): se queda la copia que había.
export function actualizarEmpresa(): Promise<boolean> {
  if (!trayendo) {
    trayendo = (async () => {
      const [{ modo }] = await Promise.all([leerEmpresa(), cargarPrueba()]);
      if (!modo) return false;
      try {
        const situacion = await traerSituacion();
        ultimaVez = Date.now();
        await guardarSituacion(situacion);
        if (situacion.fase === 'dentro') {
          await apuntarEsteMovil(situacion.datos);
          await sincronizarOcupado(situacion.datos);
        }
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      trayendo = null;
    });
  }
  return trayendo;
}

// Hace algo en el servidor y vuelve a traerlo todo.
export async function hacerEnEmpresa(accion: () => Promise<unknown>): Promise<Resultado> {
  try {
    await accion();
  } catch (error) {
    return { ok: false, motivo: motivoDe(error) };
  }
  await actualizarEmpresa();
  return { ok: true };
}

// Los datos de la empresa ahora mismo, si se está dentro.
export function datosActuales(): DatosEmpresa | null {
  const { modo, situacion } = estadoEmpresaActual();
  return modo && situacion.fase === 'dentro' ? situacion.datos : null;
}

// He abierto un canal del chat: leído en el servidor y, al momento, en la copia del móvil.
export async function marcarCanalLeidoAqui(canalId: string): Promise<void> {
  const datos = datosActuales();
  if (!datos) return;
  await marcarCanalLeido(canalId, datos.yo).catch(() => {});
  const actual = estadoEmpresaActual().situacion;
  if (actual.fase !== 'dentro' || !actual.datos.canales.some((c) => c.id === canalId && c.sinLeer > 0)) return;
  await guardarSituacion(
    { ...actual, datos: { ...actual.datos, canales: actual.datos.canales.map((c) => (c.id === canalId ? { ...c, sinLeer: 0 } : c)) } },
    estadoEmpresaActual().traidoEl,
  );
}

// Marcar una tarea de la agenda (Hoy): si es de la empresa, en el servidor.
export async function marcarHechaDeAgenda(id: string, hecha: boolean): Promise<void> {
  const marca = leerIdVirtual(id);
  if (marca?.clase === 'tarea') await hacerEnEmpresa(() => marcarTarea(marca.id, hecha));
  else if (!marca) await marcarHecha(id, hecha);
}

// --- Entrar ---

export async function entrarEnEmpresa(proveedor: ProveedorEmpresa): Promise<ResultadoEntrar> {
  const resultado = await entrarConProveedor(proveedor);
  if (resultado.ok === true) await actualizarEmpresa();
  return resultado;
}

// La empresa de ejemplo (Expo Go y desarrollo): un bar ya montado, sin cuentas y sin
// servidor. Se entra como Pepe (el jefe); luego se puede ver como Laura o Javi.
export async function verEmpresaDeEjemplo(): Promise<void> {
  ponerEjemplo();
  await activarModoEmpresa();
  await actualizarEmpresa();
}

// Dejar el ejemplo: se borra y se vuelve a la pantalla de entrar (sigue el plan empresa).
export async function dejarEmpresaDeEjemplo(): Promise<void> {
  quitarEjemplo();
  await guardarSituacion({ fase: 'sin-sesion' });
}

// En desarrollo (web) y en el ejemplo: entrar como una de las personas de prueba.
export async function entrarDePrueba(usuario: string): Promise<void> {
  const persona = PERSONAS_PRUEBA.find((p) => p.id === usuario);
  if (persona) basePrueba.entrarComo(persona);
  await actualizarEmpresa();
}

// En la web, al volver de Google o Microsoft a /empresa.
export async function terminarEntrada(): Promise<ResultadoEntrar | null> {
  const resultado = await terminarEntradaWeb();
  if (resultado?.ok === true) await actualizarEmpresa();
  return resultado;
}

// El enlace de invitación se guarda antes de ir a Google o Microsoft (en la web, la
// página se va y vuelve sin él).
const CLAVE_INVITACION = 'empresaInvitacion';

export async function guardarInvitacion(texto: string | null): Promise<string | null> {
  const codigo = leerCodigoInvitacion(texto);
  if (codigo) await guardarAjuste(CLAVE_INVITACION, codigo);
  return codigo;
}

export const invitacionGuardada = () => leerAjuste<string | null>(CLAVE_INVITACION, null);

export async function crearMiEmpresa(nombre: string, miNombre: string): Promise<Resultado> {
  return hacerEnEmpresa(() => crearEmpresa(nombre.trim(), miNombre.trim()));
}

export async function unirmeAMiEmpresa(miNombre: string, enlace: string | null): Promise<Resultado> {
  const codigo = leerCodigoInvitacion(enlace) ?? (await invitacionGuardada());
  const r = await hacerEnEmpresa(() => unirme(codigo, miNombre.trim()));
  if (r.ok || r.motivo === 'enlace-caducado') await guardarAjuste(CLAVE_INVITACION, null);
  return r;
}

// --- Salir ---

// Sale de la empresa: en el servidor se borra la cuenta de empresa de esta persona y
// todo lo suyo; en el dispositivo, todo lo de la empresa. Lo personal se queda.
export async function salirDeLaEmpresa(): Promise<Resultado> {
  if (esEjemplo()) {
    quitarEjemplo();
    await olvidarEmpresa();
    return { ok: true };
  }
  try {
    await salirEnServidor();
  } catch (error) {
    const motivo = motivoDe(error);
    // Sin sesión ya no hay nada que borrar en el servidor.
    if (motivo !== 'sin-cuenta' && motivo !== 'sin-sesion') return { ok: false, motivo };
  }
  await base().cerrarSesion();
  await olvidarEmpresa();
  return { ok: true };
}

// "Usar otra cuenta" o "Cancelar la petición": se va esta cuenta de empresa (sin
// empresa o aún pendiente) y se puede entrar con otra. El plan empresa sigue puesto.
export async function cambiarDeCuenta(): Promise<void> {
  await salirEnServidor().catch(() => {});
  await base().cerrarSesion();
  await guardarSituacion({ fase: 'sin-sesion' });
}

export async function borrarLaEmpresa(): Promise<Resultado> {
  if (esEjemplo()) return salirDeLaEmpresa();
  try {
    await borrarEmpresaEnServidor();
  } catch (error) {
    return { ok: false, motivo: motivoDe(error) };
  }
  await base().cerrarSesion();
  await olvidarEmpresa();
  return { ok: true };
}

// --- Avisos y "Ocupado" ---

let movilApuntado = false;

// La dirección de avisos de este móvil, una vez por sesión de la app.
async function apuntarEsteMovil(datos: DatosEmpresa) {
  if (movilApuntado || datos.ejemplo) return;
  const token = await tokenDeAvisos().catch(() => null);
  if (!token) return;
  await guardarAvisos(datos.yo, datos.avisos, token).catch(() => {});
  movilApuntado = true;
}

export async function cambiarAvisosEmpresa(cambios: Partial<AvisosEmpresa>): Promise<Resultado> {
  const datos = datosActuales();
  if (!datos) return { ok: false, motivo: 'sin-sesion' };
  const token = await tokenDeAvisos().catch(() => null);
  return hacerEnEmpresa(() => guardarAvisos(datos.yo, { ...datos.avisos, ...cambios }, token));
}

const CLAVE_OCUPADO = 'empresaOcupado';

// Si la persona comparte sus huecos como "Ocupado", sube los de los próximos 28 días
// (solo día y horas de SUS eventos) cuando cambian o una vez al día.
export async function sincronizarOcupado(datos: DatosEmpresa | null = datosActuales()): Promise<void> {
  if (!datos || datos.ejemplo) return;
  const yo = datos.miembros.find((m) => m.usuario === datos.yo);
  if (!yo?.comparteOcupado) return;
  const hoy = claveDia(new Date());
  const bloques = bloquesOcupados(await leerEventos(), hoy);
  const huella = `${hoy}|${huellaOcupado(bloques)}`;
  if ((await leerAjuste<string | null>(CLAVE_OCUPADO, null)) === huella) return;
  try {
    await subirOcupado(datos.empresa.id, datos.yo, bloques);
    await guardarAjuste(CLAVE_OCUPADO, huella);
  } catch {
    // Se reintenta la próxima vez.
  }
}

export async function olvidarOcupadoSubido(): Promise<void> {
  await guardarAjuste(CLAVE_OCUPADO, null);
}

// --- Arranque ---

// En _layout. Con el modo apagado no hace nada más que leer ese ajuste.
export function iniciarEmpresa(): () => void {
  let esperaOcupado: ReturnType<typeof setTimeout> | null = null;
  let vivo = true;
  const quitar: (() => void)[] = [];
  Promise.all([leerEmpresa(), cargarPrueba()]).then(([{ modo }]) => {
    if (!vivo) return;
    if (modo) actualizarEmpresa();
    // Al volver a la app (si hace más de un minuto) y al llegar un aviso de la empresa.
    const app = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && estadoEmpresaActual().modo && Date.now() - ultimaVez > 60_000) actualizarEmpresa();
    });
    quitar.push(() => app.remove());
    quitar.push(escucharPush('empresa', () => estadoEmpresaActual().modo && actualizarEmpresa()));
    // Al cambiar mis eventos, el "Ocupado" compartido (si lo comparto).
    quitar.push(
      suscribirseEventos(() => {
        if (!datosActuales()) return;
        if (esperaOcupado) clearTimeout(esperaOcupado);
        esperaOcupado = setTimeout(() => sincronizarOcupado(), 3000);
      }),
    );
  });
  return () => {
    vivo = false;
    if (esperaOcupado) clearTimeout(esperaOcupado);
    quitar.forEach((q) => q());
  };
}
