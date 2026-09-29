import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Boton, Casilla, Interruptor, Pantalla, Plegable, Tarjeta, Texto, Titulo } from '@/components';
import { useEmpresa, type DatosEmpresa } from '@/data/empresa';
import { usePerfil } from '@/data/perfil';
import {
  activarModoEmpresa,
  actualizarEmpresa,
  borrarLaEmpresa,
  dejarEmpresaDeEjemplo,
  entrarDePrueba,
  guardarInvitacion,
  hacerEnEmpresa,
  invitacionGuardada,
  olvidarOcupadoSubido,
  PERSONAS_PRUEBA,
  salirDeLaEmpresa,
  sincronizarOcupado,
  terminarEntrada,
} from '@/services/empresa';
import { esTareaMia, paraQuien, voyAlEvento } from '@/services/empresa/calendario';
import { anunciosSinLeer, totalSinLeer } from '@/services/empresa/chat';
import { planEmpresaVisible } from '@/services/empresa/plan';
import { NOMBRE_PAPEL, gestionoAlgo, nombreEquipo, papelDe, soyAdmin } from '@/services/empresa/roles';
import { marcarTarea, misDatos } from '@/services/empresa/servidor';
import { NOMBRE_CLASE, textoFallo } from '@/services/empresa/textos';
import { claveDia, fechaDesdeClave, formatearDiaCorto, inicioDeSemana, sumarDias } from '@/services/fechas';
import { espacio } from '@/theme';

import { CrearOUnirme, Entrar, FRASE_PRIVACIDAD, Pendiente } from './empresa/Entrar';
import { Baldosas, BotonVolver, Chip, Chips, Confirmar, FilaEmpresa, Mensaje, type Baldosa } from './empresa/piezas';

// Plan empresa (Organizy grupal, fase 15): /empresa. Según en qué punto estés: entrar
// con Google o Microsoft, crear o unirte a la empresa, esperar a que te acepten o, ya
// dentro, las casillas de la empresa. Llegan aquí también el enlace de invitación
// (#invitacion=…) y, en la web, la vuelta del inicio de sesión (?code=…). Con el plan
// puesto es también la pestaña "Empresa" ((tabs)/trabajo, enPestana: sin "Volver").

type Vista = 'calendario' | 'tareas';
type Clave = Vista | 'chat' | 'avisos' | 'turnos' | 'equipo' | 'disponibilidad';

// El código del enlace de invitación, detrás de "#" en la web.
function invitacionDeLaDireccion(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.location.hash.includes('invitacion=') ? window.location.hash : null;
}

export function PantallaEmpresa({ enPestana = false }: { enPestana?: boolean }) {
  const { cargado, modo, situacion } = useEmpresa();
  const { bienvenidaCompletada } = usePerfil();
  const { ver, invitacion } = useLocalSearchParams<{ ver?: string; invitacion?: string }>();
  const [invitado, setInvitado] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Al abrir: la invitación (se guarda y pone el plan empresa) y la vuelta de Google o
  // Microsoft en la web.
  useEffect(() => {
    (async () => {
      const codigo = await guardarInvitacion(invitacion ?? invitacionDeLaDireccion());
      if (codigo) {
        await activarModoEmpresa();
        if (Platform.OS === 'web') setTimeout(() => window.history.replaceState(null, '', window.location.pathname), 500);
      }
      setInvitado(!!codigo || !!(await invitacionGuardada()));
      const vuelta = await terminarEntrada();
      if (vuelta?.ok === false && vuelta.motivo === 'aprobacion-admin') {
        setMensaje('Tu empresa pide que el informático apruebe Organizy antes. Abajo tienes cómo.');
      } else if (vuelta?.ok === false && vuelta.motivo !== 'cancelado') {
        setMensaje('No he podido entrar. Prueba otra vez.');
      }
    })();
  }, [invitacion]);

  // Cada vez que se entra, lo último de la empresa.
  useFocusEffect(
    useCallback(() => {
      actualizarEmpresa();
    }, []),
  );

  const volver = bienvenidaCompletada && !enPestana ? <BotonVolver texto="Hoy" destino="/" /> : null;

  if (!cargado) return <Pantalla>{volver}</Pantalla>;

  if (!modo) {
    return (
      <Pantalla>
        {volver}
        <Titulo>Plan empresa</Titulo>
        <Texto>
          Esto es del plan empresa: calendario de la empresa, turnos, tareas asignadas y disponibilidad del equipo.
        </Texto>
        {planEmpresaVisible(modo) ? <Boton titulo="Ver los planes" onPress={() => router.push('/cambiar-plan')} /> : null}
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      {volver}
      {situacion.fase === 'dentro' ? (
        <Dentro datos={situacion.datos} verAlAbrir={ver === 'calendario' || ver === 'tareas' ? ver : null} />
      ) : (
        <>
          <Titulo>Plan empresa</Titulo>
          {situacion.fase === 'sin-sesion' ? <Entrar invitado={invitado} /> : null}
          {situacion.fase === 'sin-empresa' ? <CrearOUnirme correo={situacion.correo} invitado={invitado} /> : null}
          {situacion.fase === 'pendiente' ? <Pendiente empresa={situacion.empresa} alComprobar={() => actualizarEmpresa()} /> : null}
          <Mensaje texto={mensaje} />
          {!bienvenidaCompletada ? (
            <Boton
              variante="secundario"
              titulo="Preparar mi Organizy"
              onPress={() => router.replace('/bienvenida')}
            />
          ) : null}
        </>
      )}
    </Pantalla>
  );
}

function Dentro({ datos, verAlAbrir }: { datos: DatosEmpresa; verAlAbrir: Vista | null }) {
  const [vista, setVista] = useState<Vista | null>(verAlAbrir);
  const hoy = claveDia(new Date());
  const lunes = claveDia(inicioDeSemana(new Date()));
  const papel = papelDe(datos, datos.yo);
  const gestiona = gestionoAlgo(datos);
  const admin = soyAdmin(datos);

  const proximos = datos.eventos
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => `${a.fecha} ${a.inicio ?? ''}`.localeCompare(`${b.fecha} ${b.inicio ?? ''}`));
  const misTurnos = datos.turnos.filter((t) => t.usuario === datos.yo && t.fecha >= lunes && t.fecha < sumarDias(lunes, 7));
  const misTareas = datos.tareas.filter((t) => esTareaMia(datos, t) && !t.hecha);
  const pendientes = datos.miembros.filter((m) => m.estado === 'pendiente').length;
  const cambiosPorResolver = datos.cambios.filter((c) => c.estado === 'pendiente' && c.usuario !== datos.yo).length;
  const activos = datos.miembros.filter((m) => m.estado === 'activo').length;

  const sinLeer = totalSinLeer(datos);
  const avisosSinLeer = anunciosSinLeer(datos).length;
  const baldosas: Baldosa<Clave>[] = [
    {
      clave: 'chat',
      icono: 'chatbubbles-outline',
      numero: String(sinLeer),
      etiqueta: sinLeer === 1 ? 'mensaje sin leer' : 'mensajes sin leer',
      lectura: `Chat, ${sinLeer} mensajes sin leer. Abrir`,
    },
    {
      clave: 'avisos',
      icono: 'megaphone-outline',
      numero: String(avisosSinLeer),
      etiqueta: avisosSinLeer === 1 ? 'aviso sin leer' : 'avisos sin leer',
      lectura: `Avisos, ${avisosSinLeer} sin leer. Abrir`,
    },
    {
      clave: 'calendario',
      icono: 'calendar-outline',
      numero: String(proximos.length),
      etiqueta: proximos.length === 1 ? 'evento de empresa' : 'eventos de empresa',
      lectura: `${proximos.length} eventos de empresa. Ver la lista`,
    },
    {
      clave: 'turnos',
      icono: 'time-outline',
      numero: String(misTurnos.length),
      etiqueta:
        gestiona && cambiosPorResolver > 0
          ? `turnos tuyos · ${cambiosPorResolver} ${cambiosPorResolver === 1 ? 'cambio' : 'cambios'} por mirar`
          : misTurnos.length === 1
            ? 'turno esta semana'
            : 'turnos esta semana',
      lectura: `${misTurnos.length} turnos esta semana. Abrir los turnos`,
    },
    {
      clave: 'tareas',
      icono: 'checkbox-outline',
      numero: String(misTareas.length),
      etiqueta: misTareas.length === 1 ? 'tarea asignada' : 'tareas asignadas',
      lectura: `${misTareas.length} tareas asignadas. Ver la lista`,
    },
    {
      clave: 'equipo',
      icono: 'people-outline',
      numero: String(activos),
      etiqueta: admin && pendientes > 0 ? `personas · ${pendientes} esperan` : activos === 1 ? 'persona' : 'personas',
      lectura: `${activos} personas${admin && pendientes > 0 ? `, ${pendientes} esperando` : ''}. Abrir el equipo`,
    },
    ...(gestiona
      ? [
          {
            clave: 'disponibilidad' as const,
            icono: 'grid-outline' as const,
            etiqueta: 'Disponibilidad y buscar hueco',
            lectura: 'Disponibilidad del equipo y buscar hueco para una reunión. Abrir',
          },
        ]
      : []),
  ];

  const pulsar = (clave: Clave) => {
    if (clave === 'chat') router.push('/empresa-chat');
    else if (clave === 'avisos') router.push('/empresa-avisos');
    else if (clave === 'turnos') router.push('/empresa-turnos');
    else if (clave === 'equipo') router.push('/empresa-equipo');
    else if (clave === 'disponibilidad') router.push('/empresa-disponibilidad');
    else setVista((v) => (v === clave ? null : clave));
  };

  return (
    <>
      <View>
        <Titulo>{datos.empresa.nombre}</Titulo>
        <Texto secundario>Plan empresa · {NOMBRE_PAPEL[papel]}</Texto>
      </View>
      {datos.ejemplo ? <Ejemplo datos={datos} /> : null}
      <Baldosas baldosas={baldosas} elegida={vista} alPulsar={pulsar} />

      {vista ? (
        <Animated.View key={vista} entering={FadeIn.duration(180)} style={estilos.vista}>
          {vista === 'calendario' ? <ListaCalendario datos={datos} /> : <ListaTareas datos={datos} />}
        </Animated.View>
      ) : null}

      <MisAjustes datos={datos} />
    </>
  );
}

const PAPEL_EJEMPLO = ['el jefe', 'responsable de Cocina', 'empleado'];

// La empresa de ejemplo: de quién la ves y "Dejar el ejemplo".
function Ejemplo({ datos }: { datos: DatosEmpresa }) {
  const [cambiando, setCambiando] = useState(false);
  const verComo = async (usuario: string) => {
    if (usuario === datos.yo || cambiando) return;
    setCambiando(true);
    await entrarDePrueba(usuario);
    setCambiando(false);
  };
  return (
    <Tarjeta style={estilos.ejemplo}>
      <Texto fuerte>Empresa de ejemplo</Texto>
      <Texto pequeno secundario>
        No es de verdad: no hay cuentas y nada sale de tu móvil. Cambia de persona para ver qué ve cada uno.
      </Texto>
      <Chips>
        {PERSONAS_PRUEBA.map((p, i) => (
          <Chip key={p.id} texto={`${p.nombre} · ${PAPEL_EJEMPLO[i]}`} elegido={p.id === datos.yo} onPress={() => verComo(p.id)} />
        ))}
      </Chips>
      <Boton variante="secundario" titulo="Dejar el ejemplo" onPress={() => dejarEmpresaDeEjemplo()} />
    </Tarjeta>
  );
}

function ListaCalendario({ datos }: { datos: DatosEmpresa }) {
  const hoy = claveDia(new Date());
  const proximos = datos.eventos
    .filter((e) => e.fecha >= hoy)
    .sort((a, b) => `${a.fecha} ${a.inicio ?? ''}`.localeCompare(`${b.fecha} ${b.inicio ?? ''}`));
  const puedeCrear = gestionoAlgo(datos);
  return (
    <>
      <Titulo nivel={2}>Calendario de la empresa</Titulo>
      {puedeCrear ? (
        <Boton titulo="Nuevo evento de empresa" onPress={() => router.push({ pathname: '/empresa-evento', params: { fecha: hoy } })} />
      ) : null}
      {proximos.length === 0 ? <Texto secundario>No hay nada por delante.</Texto> : null}
      {proximos.map((e) => {
        const respuesta = datos.respuestas.find((r) => r.eventoId === e.id && r.usuario === datos.yo)?.respuesta;
        const detalle = [
          formatearDiaCorto(fechaDesdeClave(e.fecha)),
          NOMBRE_CLASE[e.clase],
          e.equipoId ? nombreEquipo(datos, e.equipoId) : null,
          e.pideRespuesta ? (respuesta === 'voy' ? 'Vas' : respuesta === 'no-voy' ? 'No vas' : '¿Vienes?') : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <FilaEmpresa
            key={e.id}
            titulo={e.titulo}
            hora={e.inicio}
            horaFin={e.fin}
            detalle={detalle}
            apagada={!voyAlEvento(datos, e.id)}
            onPress={() => router.push({ pathname: '/empresa-evento', params: { id: e.id } })}
          />
        );
      })}
    </>
  );
}

function ListaTareas({ datos }: { datos: DatosEmpresa }) {
  const hoy = claveDia(new Date());
  const [error, setError] = useState<string | null>(null);
  const mias = datos.tareas.filter((t) => esTareaMia(datos, t)).sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  // Las que he asignado o gestiono y aún no están hechas (cuáles faltan).
  const gestiona = gestionoAlgo(datos);
  const delEquipo = gestiona
    ? datos.tareas.filter((t) => !esTareaMia(datos, t)).sort((a, b) => Number(a.hecha) - Number(b.hecha) || a.fechaLimite.localeCompare(b.fechaLimite))
    : [];

  const marcar = async (id: string, hecha: boolean) => {
    const r = await hacerEnEmpresa(() => marcarTarea(id, hecha));
    setError(r.ok ? null : textoFallo(r.motivo));
  };

  const fila = (t: DatosEmpresa['tareas'][number], conCasilla: boolean) => (
    <FilaEmpresa
      key={t.id}
      titulo={t.titulo}
      apagada={t.hecha}
      detalle={[
        t.fechaLimite < hoy && !t.hecha ? `Se pasó el ${formatearDiaCorto(fechaDesdeClave(t.fechaLimite))}` : `Para el ${formatearDiaCorto(fechaDesdeClave(t.fechaLimite))}`,
        conCasilla ? null : paraQuien(datos, t),
        t.hecha ? 'Hecha' : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      onPress={() => router.push({ pathname: '/empresa-tarea', params: { id: t.id } })}
      derecha={
        conCasilla ? (
          <Casilla marcada={t.hecha} alCambiar={(h) => marcar(t.id, h)} etiqueta={`Marcar como hecha: ${t.titulo}`} />
        ) : undefined
      }
    />
  );

  return (
    <>
      <Titulo nivel={2}>Tareas asignadas</Titulo>
      {gestiona ? <Boton titulo="Asignar una tarea" onPress={() => router.push('/empresa-tarea')} /> : null}
      <Texto pequeno secundario>
        Las tuyas salen también en Hoy, junto a tus tareas.
      </Texto>
      {mias.length === 0 ? <Texto secundario>No tienes tareas de la empresa.</Texto> : mias.map((t) => fila(t, true))}
      {delEquipo.length > 0 ? (
        <>
          <Titulo nivel={3}>De tu gente</Titulo>
          {delEquipo.map((t) => fila(t, false))}
        </>
      ) : null}
      <Mensaje texto={error} />
    </>
  );
}

function MisAjustes({ datos }: { datos: DatosEmpresa }) {
  const yo = datos.miembros.find((m) => m.usuario === datos.yo);
  const [preguntar, setPreguntar] = useState<'salir' | 'borrar' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compartir = async (si: boolean) => {
    setError(null);
    await olvidarOcupadoSubido();
    const r = await hacerEnEmpresa(() => misDatos(null, si));
    if (!r.ok) setError(textoFallo(r.motivo));
    else if (si) await sincronizarOcupado();
  };

  const salir = async () => {
    setPreguntar(null);
    const r = await salirDeLaEmpresa();
    if (!r.ok) setError(textoFallo(r.motivo));
    else router.replace('/perfil');
  };

  const borrar = async () => {
    setPreguntar(null);
    const r = await borrarLaEmpresa();
    if (!r.ok) setError(textoFallo(r.motivo));
    else router.replace('/perfil');
  };

  return (
    <Plegable titulo="Tus ajustes en la empresa" resumen={yo?.comparteOcupado ? 'Compartes tus huecos como Ocupado' : 'No compartes tus huecos'}>
      <Texto pequeno secundario>{FRASE_PRIVACIDAD}</Texto>
      <Interruptor
        etiqueta="Compartir mis huecos como «Ocupado»"
        ayuda="Quien te organiza verá que estás ocupado a esas horas, sin título, sin lugar y sin tipo. Solo lo decides tú."
        valor={yo?.comparteOcupado === true}
        alCambiar={compartir}
      />
      {/* En el ejemplo, "Dejar el ejemplo" (arriba) hace de salir. */}
      {!datos.ejemplo ? <Boton variante="secundario" titulo="Salir de la empresa" onPress={() => setPreguntar('salir')} /> : null}
      {soyAdmin(datos) && !datos.ejemplo ? (
        <Boton variante="secundario" titulo="Borrar la empresa" onPress={() => setPreguntar('borrar')} />
      ) : null}
      {preguntar === 'salir' ? (
        <Confirmar
          texto="Al salir se borra todo lo de la empresa de tu móvil y del servidor, y vuelves al plan personal. Lo tuyo se queda."
          si="Salir de la empresa"
          alSi={salir}
          alNo={() => setPreguntar(null)}
        />
      ) : null}
      {preguntar === 'borrar' ? (
        <Confirmar
          texto={`Se borra ${datos.empresa.nombre} para todos: turnos, tareas, eventos y la gente. No se puede deshacer.`}
          si="Borrar la empresa"
          alSi={borrar}
          alNo={() => setPreguntar(null)}
        />
      ) : null}
      <Mensaje texto={error} />
    </Plegable>
  );
}

const estilos = StyleSheet.create({
  vista: { gap: espacio.m },
  ejemplo: { gap: espacio.s },
});
