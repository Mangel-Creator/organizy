import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { dominioDe, esDominioPublico } from './textos';
import { FalloEmpresa, type Base, type Fila, type UsuarioEmpresa } from './base';
import { datosDeEjemplo, PERSONAS_PRUEBA } from './ejemplo';
import { enExpoGo } from './plan';

export { PERSONAS_PRUEBA };

// Servidor de PRUEBA de Organizy grupal, sin cuentas de Google ni Microsoft. Imita lo que
// hace el servidor de verdad (las reglas de verdad se prueban contra Supabase en
// supabase/tests/empresa_rls.sql). Dos usos:
//
//   - En el ordenador (desarrollo, web): ?prueba-empresa=1 en la dirección lo enciende y =0
//     lo apaga. Se guarda en el navegador (localStorage), así se comparte entre pestañas y
//     se prueba con dos o tres personas a la vez.
//   - La "empresa de ejemplo" (Expo Go y desarrollo): "Ver una empresa de ejemplo" en la
//     pantalla de entrar. Pone un bar ya montado (ejemplo.ts) y se ve como Pepe, Laura o
//     Javi. En el móvil se guarda en AsyncStorage; nada va al servidor.

const CLAVE = 'organizy-prueba-empresa';
const CLAVE_EJEMPLO = `${CLAVE}-ejemplo`;

type Bd = { yo: string | null; tablas: Record<string, Fila[]> };

function hayNavegador(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// En el móvil no hay localStorage: se lee de memoria y se guarda también en AsyncStorage
// (cargarPrueba() lo trae al abrir la app).
const memoria = new Map<string, string>();

function leerTexto(clave: string): string | null {
  if (hayNavegador()) return window.localStorage.getItem(clave);
  return memoria.get(clave) ?? null;
}

function guardarTexto(clave: string, valor: string | null) {
  if (hayNavegador()) {
    if (valor === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, valor);
    return;
  }
  if (valor === null) {
    memoria.delete(clave);
    AsyncStorage.removeItem(clave).catch(() => {});
  } else {
    memoria.set(clave, valor);
    AsyncStorage.setItem(clave, valor).catch(() => {});
  }
}

// Dónde se puede ver la empresa de ejemplo: donde se ve el plan empresa sin tenerlo.
export const ejemploPosible = () => enExpoGo || __DEV__;

let cargada: Promise<void> | null = null;

export function cargarPrueba(): Promise<void> {
  if (hayNavegador() || !ejemploPosible()) return Promise.resolve();
  cargada ??= AsyncStorage.multiGet([CLAVE, CLAVE_EJEMPLO])
    .then((pares) => {
      for (const [clave, valor] of pares) if (valor !== null && !memoria.has(clave)) memoria.set(clave, valor);
    })
    .catch(() => {});
  return cargada;
}

export function esEjemplo(): boolean {
  return ejemploPosible() && leerTexto(CLAVE_EJEMPLO) === '1';
}

export function modoPruebaEmpresa(): boolean {
  if (esEjemplo()) return true;
  if (!__DEV__ || !hayNavegador()) return false;
  const m = window.location.search.match(/prueba-empresa=([01])/);
  if (m) window.localStorage.setItem(`${CLAVE}-activa`, m[1]);
  return window.localStorage.getItem(`${CLAVE}-activa`) === '1';
}

function leerBd(): Bd {
  try {
    const bd = JSON.parse(leerTexto(CLAVE) ?? '') as Bd;
    if (bd?.tablas) return bd;
  } catch {
    // vacía
  }
  return { yo: null, tablas: {} };
}

function guardarBd(bd: Bd) {
  guardarTexto(CLAVE, JSON.stringify(bd));
}

// Pone la empresa de ejemplo (borra lo que hubiera de prueba) y entra como Pepe, el jefe.
export function ponerEjemplo(ahora = new Date()) {
  guardarBd({ yo: PERSONAS_PRUEBA[0].id, tablas: datosDeEjemplo(ahora) });
  guardarTexto(CLAVE_EJEMPLO, '1');
}

export function quitarEjemplo() {
  guardarTexto(CLAVE_EJEMPLO, null);
  guardarTexto(CLAVE, null);
}

const tabla = (bd: Bd, t: string) => (bd.tablas[t] ??= []);
const id = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
const ahora = () => new Date().toISOString();

function yoMiembro(bd: Bd): Fila | undefined {
  return tabla(bd, 'empresa_miembros').find((m) => m.usuario === bd.yo);
}

function miEmpresa(bd: Bd): string | null {
  const m = yoMiembro(bd);
  return m && m.estado === 'activo' ? (m.empresa_id as string) : null;
}

function soyAdmin(bd: Bd): boolean {
  const m = yoMiembro(bd);
  return !!m && m.estado === 'activo' && m.rol === 'admin';
}

function persona(bd: Bd): UsuarioEmpresa {
  const p = PERSONAS_PRUEBA.find((x) => x.id === bd.yo);
  if (!p) throw new FalloEmpresa('sin-cuenta');
  return p;
}

// Lo que ve cada uno (una versión simplificada de las reglas del servidor).
function visible(bd: Bd, t: string, f: Fila): boolean {
  const empresa = miEmpresa(bd);
  if (t === 'empresa_avisos') return f.usuario === bd.yo;
  if (t === 'empresas') return tabla(bd, 'empresa_miembros').some((m) => m.usuario === bd.yo && m.empresa_id === f.id);
  if (t === 'empresa_miembros') return f.usuario === bd.yo || (f.empresa_id === empresa && (f.estado === 'activo' || soyAdmin(bd)));
  if (t === 'invitaciones_correo' || t === 'invitaciones_enlace') return f.empresa_id === empresa && soyAdmin(bd);
  if (t === 'chat_canales') return veCanal(bd, f);
  if (t === 'chat_mensajes') return veCanal(bd, tabla(bd, 'chat_canales').find((c) => c.id === f.canal_id));
  if (t === 'chat_leidos') return f.usuario === bd.yo;
  if (t === 'anuncios_leidos') return tabla(bd, 'anuncios').some((a) => a.id === f.anuncio_id && a.empresa_id === empresa);
  if (t === 'anuncios' && f.equipo_id && !soyAdmin(bd)) {
    return f.empresa_id === empresa && tabla(bd, 'equipo_miembros').some((m) => m.equipo_id === f.equipo_id && m.usuario === bd.yo);
  }
  return f.empresa_id === empresa;
}

function veCanal(bd: Bd, c: Fila | undefined): boolean {
  if (!c || c.empresa_id !== miEmpresa(bd)) return false;
  if (c.tipo === 'privado') return c.persona_a === bd.yo || c.persona_b === bd.yo;
  if (c.tipo === 'equipo') return soyAdmin(bd) || tabla(bd, 'equipo_miembros').some((m) => m.equipo_id === c.equipo_id && m.usuario === bd.yo);
  return true;
}

function sacar(bd: Bd, t: string, quitar: (f: Fila) => boolean) {
  bd.tablas[t] = tabla(bd, t).filter((f) => !quitar(f));
}

function quitarPersona(bd: Bd, empresa: string, usuario: string) {
  for (const t of ['empresa_miembros', 'equipo_miembros', 'turnos', 'respuestas_evento', 'cambios_turno', 'ocupado_compartido']) {
    sacar(bd, t, (f) => f.empresa_id === empresa && f.usuario === usuario);
  }
  sacar(bd, 'tareas_empresa', (f) => f.empresa_id === empresa && f.usuario === usuario);
}

function borrarEmpresa(bd: Bd, empresa: string) {
  sacar(bd, 'empresas', (f) => f.id === empresa);
  for (const t of Object.keys(bd.tablas)) {
    if (t !== 'empresas' && t !== 'empresa_avisos') sacar(bd, t, (f) => f.empresa_id === empresa);
  }
}

const FUNCIONES: Record<string, (bd: Bd, a: Fila) => unknown> = {
  empresa_crear(bd, a) {
    const p = persona(bd);
    if (yoMiembro(bd)) throw new FalloEmpresa('ya-en-empresa');
    const empresa = id();
    tabla(bd, 'empresas').push({ id: empresa, nombre: a.p_nombre, dominio: null, aprobar_solo: false, creada_por: p.id, creada: ahora() });
    tabla(bd, 'chat_canales').push({ id: id(), empresa_id: empresa, tipo: 'general', equipo_id: null, persona_a: null, persona_b: null });
    tabla(bd, 'empresa_miembros').push({
      empresa_id: empresa, usuario: p.id, nombre: a.p_mi_nombre, email: p.correo, rol: 'admin', estado: 'activo',
      via: 'creador', comparte_ocupado: false, alta: ahora(),
    });
    return empresa;
  },
  empresa_unirme(bd, a) {
    const p = persona(bd);
    const ya = yoMiembro(bd);
    if (ya) return ya.estado;
    let empresa: string | undefined;
    let estado = 'pendiente';
    let via = 'dominio';
    const invitacion = tabla(bd, 'invitaciones_correo').find((i) => i.email === p.correo);
    if (invitacion) {
      empresa = invitacion.empresa_id as string;
      estado = 'activo';
      via = 'lista';
      sacar(bd, 'invitaciones_correo', (i) => i.email === p.correo);
    } else if (a.p_codigo) {
      const enlace = tabla(bd, 'invitaciones_enlace').find(
        (i) => i.codigo === a.p_codigo && !i.anulada && (i.caduca as string) > ahora(),
      );
      if (!enlace) throw new FalloEmpresa('enlace-caducado');
      empresa = enlace.empresa_id as string;
      via = 'enlace';
    } else {
      const dominio = dominioDe(p.correo);
      const e = esDominioPublico(dominio) ? undefined : tabla(bd, 'empresas').find((x) => x.dominio === dominio);
      if (!e) throw new FalloEmpresa('sin-invitacion');
      empresa = e.id as string;
      estado = e.aprobar_solo ? 'activo' : 'pendiente';
    }
    tabla(bd, 'empresa_miembros').push({
      empresa_id: empresa, usuario: p.id, nombre: a.p_mi_nombre, email: p.correo, rol: 'empleado', estado, via,
      comparte_ocupado: false, alta: ahora(),
    });
    return estado;
  },
  empresa_aprobar(bd, a) {
    if (!soyAdmin(bd)) throw new FalloEmpresa('sin-permiso');
    const m = tabla(bd, 'empresa_miembros').find((x) => x.usuario === a.p_usuario && x.empresa_id === miEmpresa(bd));
    if (!m || m.estado !== 'pendiente') return null;
    if (a.p_aprobar) m.estado = 'activo';
    else sacar(bd, 'empresa_miembros', (x) => x === m);
    return null;
  },
  empresa_cambiar_rol(bd, a) {
    if (!soyAdmin(bd)) throw new FalloEmpresa('sin-permiso');
    const empresa = miEmpresa(bd);
    const m = tabla(bd, 'empresa_miembros').find((x) => x.usuario === a.p_usuario && x.empresa_id === empresa);
    if (!m) return null;
    const antes = m.rol;
    m.rol = a.p_rol;
    if (!tabla(bd, 'empresa_miembros').some((x) => x.empresa_id === empresa && x.rol === 'admin' && x.estado === 'activo')) {
      m.rol = antes;
      throw new FalloEmpresa('sin-admin');
    }
    return null;
  },
  empresa_quitar(bd, a) {
    if (!soyAdmin(bd)) throw new FalloEmpresa('sin-permiso');
    quitarPersona(bd, miEmpresa(bd) as string, a.p_usuario as string);
    return null;
  },
  empresa_salir(bd) {
    const m = yoMiembro(bd);
    if (m) {
      const empresa = m.empresa_id as string;
      const otros = tabla(bd, 'empresa_miembros').filter((x) => x.empresa_id === empresa && x.usuario !== bd.yo);
      if (otros.length === 0) borrarEmpresa(bd, empresa);
      else if (m.rol === 'admin' && m.estado === 'activo' && !otros.some((x) => x.rol === 'admin' && x.estado === 'activo')) {
        throw new FalloEmpresa('unico-admin');
      } else quitarPersona(bd, empresa, bd.yo as string);
    }
    sacar(bd, 'empresa_avisos', (f) => f.usuario === bd.yo);
    bd.yo = null;
    return null;
  },
  empresa_borrar(bd) {
    if (!soyAdmin(bd)) throw new FalloEmpresa('sin-permiso');
    borrarEmpresa(bd, miEmpresa(bd) as string);
    bd.yo = null;
    return null;
  },
  empresa_ajustes(bd, a) {
    if (!soyAdmin(bd)) throw new FalloEmpresa('sin-permiso');
    const dominio = typeof a.p_dominio === 'string' && a.p_dominio.trim() ? a.p_dominio.trim().toLowerCase() : null;
    if (dominio && esDominioPublico(dominio)) throw new FalloEmpresa('dominio-publico');
    if (dominio && dominio !== dominioDe(persona(bd).correo)) throw new FalloEmpresa('dominio-ajeno');
    const e = tabla(bd, 'empresas').find((x) => x.id === miEmpresa(bd));
    if (e) {
      if (typeof a.p_nombre === 'string' && a.p_nombre.trim()) e.nombre = a.p_nombre.trim();
      e.dominio = dominio;
      e.aprobar_solo = !!dominio && !!a.p_aprobar_solo;
    }
    return null;
  },
  empresa_mis_datos(bd, a) {
    const m = yoMiembro(bd);
    if (m) {
      if (typeof a.p_nombre === 'string') m.nombre = a.p_nombre;
      if (typeof a.p_comparte === 'boolean') m.comparte_ocupado = a.p_comparte;
      if (a.p_comparte === false) sacar(bd, 'ocupado_compartido', (f) => f.usuario === bd.yo);
    }
    return null;
  },
  empresa_marcar_tarea(bd, a) {
    const t = tabla(bd, 'tareas_empresa').find((x) => x.id === a.p_id && x.empresa_id === miEmpresa(bd));
    if (!t) throw new FalloEmpresa('sin-permiso');
    t.hecha = a.p_hecha;
    t.hecha_por = a.p_hecha ? bd.yo : null;
    t.hecha_el = a.p_hecha ? ahora() : null;
    return null;
  },
  chat_privado(bd, a) {
    const empresa = miEmpresa(bd);
    const [x, y] = [bd.yo as string, a.p_persona as string].sort();
    let c = tabla(bd, 'chat_canales').find((k) => k.tipo === 'privado' && k.empresa_id === empresa && k.persona_a === x && k.persona_b === y);
    if (!c) {
      c = { id: id(), empresa_id: empresa, tipo: 'privado', equipo_id: null, persona_a: x, persona_b: y };
      tabla(bd, 'chat_canales').push(c);
    }
    return c.id;
  },
  chat_resumen(bd) {
    return tabla(bd, 'chat_canales')
      .filter((c) => veCanal(bd, c))
      .map((c) => {
        const leido = (tabla(bd, 'chat_leidos').find((l) => l.canal_id === c.id && l.usuario === bd.yo)?.leido_hasta as string) ?? '';
        const mensajes = tabla(bd, 'chat_mensajes').filter((m) => m.canal_id === c.id && !m.borrado);
        const ultimo = mensajes[mensajes.length - 1];
        return {
          canal_id: c.id,
          sin_leer: mensajes.filter((m) => m.autor !== bd.yo && (m.creado as string) > leido).length,
          ultimo_texto: ultimo?.texto ?? null,
          ultimo_autor: ultimo?.autor ?? null,
          ultimo_el: ultimo?.creado ?? null,
        };
      });
  },
  chat_borrar_mensaje(bd, a) {
    const m = tabla(bd, 'chat_mensajes').find((x) => x.id === a.p_id && x.autor === bd.yo);
    if (!m) throw new FalloEmpresa('sin-permiso');
    m.borrado = true;
    m.texto = '';
    return null;
  },
  empresa_resolver_cambio(bd, a) {
    const c = tabla(bd, 'cambios_turno').find((x) => x.id === a.p_id && x.estado === 'pendiente');
    if (!c) throw new FalloEmpresa('no-existe');
    const t = tabla(bd, 'turnos').find((x) => x.id === c.turno_id);
    if (a.p_aprobar && t) {
      t.fecha = c.fecha ?? t.fecha;
      t.entrada = c.entrada ?? t.entrada;
      t.salida = c.salida ?? t.salida;
      t.usuario = c.cubre ?? t.usuario;
    }
    c.estado = a.p_aprobar ? 'aprobado' : 'rechazado';
    c.resuelto_por = bd.yo;
    return null;
  },
};

// Como hacen las columnas con valor por defecto del servidor.
function completar(t: string, f: Fila, bd: Bd): Fila {
  const comun = { ...f };
  if (!comun.id && !['equipo_miembros', 'respuestas_evento', 'invitaciones_correo', 'ocupado_compartido', 'empresa_avisos'].includes(t)) comun.id = id();
  if (t === 'invitaciones_enlace') {
    comun.codigo ??= id().replace(/-/g, '');
    comun.caduca ??= new Date(Date.now() + 7 * 86400000).toISOString();
    comun.anulada ??= false;
    comun.creada = ahora();
  }
  if (t === 'invitaciones_correo') comun.creada = ahora();
  if (t === 'cambios_turno') comun.creado = ahora();
  if (['eventos_empresa', 'turnos', 'tareas_empresa'].includes(t)) comun.creado_por = bd.yo;
  if (t === 'tareas_empresa') Object.assign(comun, { hecha: false, hecha_por: null, hecha_el: null });
  if (t === 'chat_mensajes') {
    if (!String(comun.texto ?? '').trim()) throw new FalloEmpresa('mensaje-vacio');
    Object.assign(comun, { autor: bd.yo, creado: ahora(), borrado: false, texto: String(comun.texto).trim() });
  }
  if (t === 'anuncios') Object.assign(comun, { autor: bd.yo, creado: ahora() });
  if (t === 'anuncios_leidos') {
    comun.el = ahora();
    if (tabla(bd, t).some((l) => l.anuncio_id === comun.anuncio_id && l.usuario === comun.usuario)) throw new FalloEmpresa('duplicate');
  }
  return comun;
}

const coincide = (f: Fila, donde: Fila) => Object.entries(donde).every(([k, v]) => f[k] === v);

function conBd<T>(hacer: (bd: Bd) => T): T {
  const bd = leerBd();
  const r = hacer(bd);
  guardarBd(bd);
  return r;
}

export const basePrueba: Base & { entrarComo(persona: UsuarioEmpresa): void } = {
  entrarComo(p) {
    conBd((bd) => {
      bd.yo = p.id;
    });
  },
  async usuario() {
    const bd = leerBd();
    return PERSONAS_PRUEBA.find((p) => p.id === bd.yo) ?? null;
  },
  async rpc<T>(nombre: string, argumentos: Fila) {
    return conBd((bd) => FUNCIONES[nombre](bd, argumentos)) as T;
  },
  async leer(t, filtros = []) {
    const bd = leerBd();
    return tabla(bd, t).filter(
      (f) =>
        visible(bd, t, f) &&
        filtros.every((x) => (x.es === 'igual' ? f[x.columna] === x.valor : String(f[x.columna] ?? '') >= x.valor)),
    );
  },
  async insertar(t, filas) {
    return conBd((bd) => {
      if (!miEmpresa(bd) && t !== 'empresa_avisos') throw new FalloEmpresa('sin-permiso');
      const nuevas = filas.map((f) => completar(t, f, bd));
      tabla(bd, t).push(...nuevas);
      // Cada equipo nuevo, su canal (como el disparador del servidor).
      if (t === 'equipos') {
        for (const e of nuevas) {
          tabla(bd, 'chat_canales').push({ id: id(), empresa_id: e.empresa_id, tipo: 'equipo', equipo_id: e.id, persona_a: null, persona_b: null });
        }
      }
      return nuevas;
    });
  },
  async cambiar(t, donde, cambios) {
    conBd((bd) => {
      for (const f of tabla(bd, t)) if (coincide(f, donde) && visible(bd, t, f)) Object.assign(f, cambios);
    });
  },
  async borrar(t, donde) {
    conBd((bd) => sacar(bd, t, (f) => coincide(f, donde) && visible(bd, t, f)));
  },
  async guardarFila(t, fila, conflicto) {
    conBd((bd) => {
      const claves = conflicto.split(',').map((c) => c.trim());
      const ya = tabla(bd, t).find((f) => claves.every((c) => f[c] === fila[c]));
      if (ya) Object.assign(ya, fila);
      else tabla(bd, t).push(completar(t, fila, bd));
    });
  },
  // Sin servidor de verdad: se mira cada 2 segundos si ha cambiado algo (vale para varias pestañas).
  escuchar(_tabla, _columna, _valor, alLlegar) {
    let antes = leerTexto(CLAVE);
    const vigilar = setInterval(() => {
      const ahoraBd = leerTexto(CLAVE);
      if (ahoraBd !== antes) {
        antes = ahoraBd;
        alLlegar();
      }
    }, 2000);
    return () => clearInterval(vigilar);
  },
  async cerrarSesion() {
    conBd((bd) => {
      bd.yo = null;
    });
  },
};
