import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Pantalla, Tarjeta, Texto, Titulo } from '@/components';
import { useEventos } from '@/data/eventos';
import { useHorasPunta } from '@/data/horasPunta';
import { usePerfil } from '@/data/perfil';
import { RADARES } from '@/data/radares';
import { useSalidas } from '@/data/salidas';
import { formatearHora } from '@/services/fechas';
import { ATRIBUCION_OPENSTREETMAP, buscarCoordenadas, usaOpenStreetMap } from '@/services/lugares';
import { consultarPermiso, pedirPermiso } from '@/services/permisos';
import {
  calcularRutas,
  enlaceGoogleMaps,
  enlaceWaze,
  fraseHorasPunta,
  horaDeSalida,
  modoDeViaje,
  radaresCerca,
  radaresEnRuta,
  type Punto,
  type ResultadoRutas,
} from '@/services/rutas';
import { claveCita } from '@/services/rutas/citas';
import { empezarNavegacion } from '@/services/rutas/motorNavegacion';
import { ubicacionActual } from '@/services/ubicacion';
import { colores, espacio, fuentes, radio } from '@/theme';

import { useAhora } from './calendario/useAhora';
import { destinoDeEvento, sugerencias, type Destino } from './mapa/destinos';
import { MapaGrande } from './mapa/MapaGrande';
import { MapaRuta } from './mapa/MapaRuta';
import { FilaDestino, Leyenda, TarjetaRuta } from './mapa/PiezasMapa';

// Pestaña Mapa (fase 6): "¿A dónde vas?", el mapa con el tráfico, 2 o 3 rutas con
// su duración, retraso y radares, la hora de salir si el destino es un evento y
// botones para abrir Waze o Google Maps. Se abre también desde "Cómo llegar" en
// Hoy con /mapa?evento=<id>&dia=<AAAA-MM-DD>.

type EstadoRutas = { estado: 'cargando' } | ResultadoRutas | null;

// Radares que se enseñan alrededor de ti (o de tu casa) cuando aún no hay ruta.
const RADIO_RADARES_CERCA_M = 25000;

export function PantallaMapa() {
  const { perfil } = usePerfil();
  const { eventos } = useEventos();
  const salidas = useSalidas();
  const horasPunta = useHorasPunta();
  const ahora = useAhora();
  const parametros = useLocalSearchParams<{ evento?: string; dia?: string }>();

  const [texto, setTexto] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [destino, setDestino] = useState<Destino | null>(null);
  const [ubicacion, setUbicacion] = useState<Punto | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [elegida, setElegida] = useState(0);
  const [grande, setGrande] = useState(false);
  const [avisoNavegar, setAvisoNavegar] = useState<string | null>(null);

  const modo = modoDeViaje(perfil?.transporte);
  const casa: Punto | null = perfil?.vivienda.coordenadas
    ? [perfil.vivienda.coordenadas.latitud, perfil.vivienda.coordenadas.longitud]
    : null;
  const origen = ubicacion ?? casa;

  // Dónde estás, cada vez que se abre la pestaña (sin volver a pedir permiso).
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        const permiso = await consultarPermiso('ubicacion');
        if (!activo) return;
        setSinPermiso(permiso !== 'concedido');
        if (permiso === 'concedido') {
          const aqui = await ubicacionActual();
          if (activo && aqui) setUbicacion(aqui);
        }
      })();
      return () => {
        activo = false;
      };
    }, []),
  );

  async function usarMiUbicacion() {
    if ((await pedirPermiso('ubicacion')) !== 'concedido') return;
    setSinPermiso(false);
    const aqui = await ubicacionActual();
    if (aqui) setUbicacion(aqui);
  }

  // Elegir un destino. Si aún no tiene coordenadas, el efecto de abajo las busca.
  function elegirDestino(nuevo: Destino) {
    setErrorBusqueda(null);
    setElegida(0);
    setTexto('');
    setDestino(nuevo);
  }

  function buscarTexto() {
    const escrito = texto.trim();
    if (!escrito) return;
    elegirDestino({ id: 'busqueda', nombre: escrito, detalle: '', direccion: escrito, punto: null, cita: null });
  }

  // Desde "Cómo llegar" (Hoy) llega un evento: se elige como destino una sola vez
  // (se ajusta al pintar, como recomienda React, en vez de en un efecto).
  const { evento: eventoId, dia } = parametros;
  const claveParametros = eventoId && dia ? `${eventoId}:${dia}` : null;
  const [parametrosVistos, setParametrosVistos] = useState<string | null>(null);
  if (claveParametros && claveParametros !== parametrosVistos && eventoId && dia) {
    const evento = eventos.find((e) => e.id === eventoId);
    const nuevo = evento ? destinoDeEvento(evento, dia, perfil) : null;
    if (nuevo) {
      setParametrosVistos(claveParametros);
      elegirDestino(nuevo);
    }
  }

  // Coordenadas del destino elegido si todavía no las tiene (dirección escrita).
  const buscando = !!destino && !destino.punto && !errorBusqueda;
  useEffect(() => {
    if (!destino || destino.punto) return;
    let activo = true;
    buscarCoordenadas(destino.direccion).then((resultado) => {
      if (!activo) return;
      if (resultado.estado === 'encontrado') {
        const { latitud, longitud } = resultado.coordenadas;
        setDestino({ ...destino, punto: [latitud, longitud] });
      } else {
        setErrorBusqueda(
          resultado.estado === 'no-encontrado'
            ? `No encuentro "${destino.direccion}". Prueba a escribirla de otra forma.`
            : 'Sin conexión: no puedo buscar la dirección ahora.',
        );
      }
    });
    return () => {
      activo = false;
    };
  }, [destino]);

  // Rutas con tráfico cada vez que cambian el destino, el origen o el transporte.
  // Se guardan 5 minutos (services/rutas): volver a la pestaña no gasta otra llamada.
  const punto = destino?.punto ?? null;
  const huella = punto && origen && modo ? `${origen.join()}|${punto.join()}|${modo}` : null;
  const [calculadas, setCalculadas] = useState<{ huella: string; resultado: ResultadoRutas } | null>(null);
  useEffect(() => {
    if (!huella || !punto || !origen || !modo) return;
    let activo = true;
    // Con las indicaciones: así "Empezar" no gasta otra llamada.
    calcularRutas({ origen, destino: punto, modo, alternativas: 2, instrucciones: true }).then((resultado) => {
      if (activo) setCalculadas({ huella, resultado });
    });
    return () => {
      activo = false;
    };
    // La huella resume origen, destino y modo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huella]);
  const rutas: EstadoRutas = !huella
    ? null
    : calculadas?.huella === huella
      ? calculadas.resultado
      : { estado: 'cargando' };

  const lista = rutas?.estado === 'ok' ? rutas.rutas : [];
  const radaresPorRuta = lista.map((r) => radaresEnRuta(r.puntos, RADARES));
  const rutaElegida = lista[elegida] ?? lista[0];
  const radaresEnMapa = rutaElegida
    ? (radaresPorRuta[lista.indexOf(rutaElegida)] ?? [])
    : origen
      ? radaresCerca(origen, RADARES, RADIO_RADARES_CERCA_M)
      : [];
  const propsMapa = {
    ubicacion,
    destino: punto,
    rutas: lista,
    elegida: rutaElegida ? lista.indexOf(rutaElegida) : 0,
    alElegir: setElegida,
    radares: radaresEnMapa,
    centroInicial: casa,
  };

  // Hora de salida si el destino es un evento: la calculada con el tráfico previsto
  // (services/rutas/actualizar.ts) o, si aún no está, con la ruta elegida.
  let salida: Date | null = null;
  if (destino?.cita) {
    const guardada = salidas[claveCita(destino.cita.eventoId, destino.cita.dia)];
    if (guardada) salida = new Date(guardada.salida);
    else if (rutaElegida) salida = horaDeSalida(new Date(destino.cita.llegada), rutaElegida.duracionSeg);
  }
  const vaTarde = salida ? salida.getTime() < ahora.getTime() : false;

  const propuestas = destino ? [] : sugerencias(perfil, eventos, ahora, texto);

  // Empezar a navegar con la ruta elegida. En el móvil primero hace falta el permiso
  // de ubicación; en la web lo pide el navegador (y la voz tiene que salir del toque).
  async function empezar() {
    if (!rutaElegida || !punto || !modo || !destino) return;
    if (Platform.OS !== 'web' && sinPermiso) {
      if ((await pedirPermiso('ubicacion')) !== 'concedido') {
        setAvisoNavegar('Para guiarte necesito tu ubicación. Actívala en los Ajustes del teléfono.');
        return;
      }
      setSinPermiso(false);
    }
    setAvisoNavegar(null);
    setGrande(false);
    empezarNavegacion({ ruta: rutaElegida, destino: punto, nombreDestino: destino.nombre, modo });
  }
  const sePuedeNavegar = !!rutaElegida?.instrucciones?.length;

  return (
    <Pantalla>
      <Titulo>¿A dónde vas?</Titulo>
      <View style={estilos.buscador}>
        <View style={estilos.campo}>
          <CampoTexto
            value={texto}
            onChangeText={setTexto}
            placeholder="Un sitio o una dirección"
            accessibilityLabel="¿A dónde vas?"
            returnKeyType="search"
            onSubmitEditing={buscarTexto}
            error={errorBusqueda}
          />
        </View>
        <Boton titulo="Buscar" onPress={buscarTexto} disabled={buscando || !texto.trim()} />
      </View>
      {usaOpenStreetMap && texto.trim() ? (
        <Texto pequeno secundario>
          {ATRIBUCION_OPENSTREETMAP}
        </Texto>
      ) : null}
      {buscando ? <Texto secundario>Buscando…</Texto> : null}

      {propuestas.length > 0 ? (
        <View style={estilos.lista}>
          {propuestas.map((d) => (
            <FilaDestino key={d.id} destino={d} alPulsar={() => elegirDestino(d)} />
          ))}
        </View>
      ) : null}

      {destino ? (
        <View style={estilos.destino}>
          <View style={estilos.destinoTextos}>
            <Texto fuerte>{destino.nombre}</Texto>
            {destino.detalle ? (
              <Texto pequeno secundario>
                {destino.detalle}
              </Texto>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDestino(null);
            }}
            style={({ pressed }) => [estilos.quitar, pressed && estilos.pulsado]}>
            <Texto style={estilos.enlace}>Cambiar</Texto>
          </Pressable>
        </View>
      ) : null}

      <View>
        <MapaRuta style={estilos.mapa} {...propsMapa} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver el mapa en grande"
          onPress={() => setGrande(true)}
          style={({ pressed }) => [estilos.agrandar, pressed && estilos.pulsado]}>
          <Ionicons name="expand" size={18} color={colores.texto} />
          <Texto pequeno fuerte>
            En grande
          </Texto>
        </Pressable>
      </View>
      <Leyenda />
      <MapaGrande
        {...propsMapa}
        visible={grande}
        nombreDestino={destino?.nombre ?? 'Mapa'}
        alCerrar={() => setGrande(false)}
        alEmpezar={sePuedeNavegar ? empezar : null}
      />

      {sinPermiso ? (
        <Boton variante="secundario" titulo="Usar mi ubicación" onPress={usarMiUbicacion} />
      ) : null}

      {destino && punto ? (
        <>
          {salida ? (
            <Tarjeta>
              <Texto fuerte style={vaTarde ? estilos.tarde : null}>
                {vaTarde ? `Vas justo: tenías que salir a las ${formatearHora(salida)}` : `Sal a las ${formatearHora(salida)}`}
              </Texto>
              {destino.cita ? (
                <Texto pequeno secundario>
                  Para llegar a las {formatearHora(new Date(destino.cita.llegada))}, con el tráfico previsto y 5 min de
                  margen.
                </Texto>
              ) : null}
            </Tarjeta>
          ) : null}

          <EstadoDeRutas rutas={rutas} modo={modo} origen={origen} />

          {lista.length > 0 ? (
            <View style={estilos.lista}>
              {lista.map((r, i) => (
                <TarjetaRuta
                  key={i}
                  numero={i + 1}
                  ruta={r}
                  radares={radaresPorRuta[i]?.length ?? 0}
                  elegida={r === rutaElegida}
                  alPulsar={() => setElegida(i)}
                />
              ))}
            </View>
          ) : null}

          <View style={estilos.lista}>
            {sePuedeNavegar ? <Boton titulo="Empezar" onPress={empezar} /> : null}
            {avisoNavegar ? <Texto style={estilos.tarde}>{avisoNavegar}</Texto> : null}
            {modo ? (
              <Boton
                variante={sePuedeNavegar ? 'secundario' : 'principal'}
                titulo="Abrir en Waze"
                onPress={() => Linking.openURL(enlaceWaze(punto))}
              />
            ) : null}
            <Boton
              variante={modo ? 'secundario' : 'principal'}
              titulo="Abrir en Google Maps"
              onPress={() => Linking.openURL(enlaceGoogleMaps(punto, perfil?.transporte))}
            />
          </View>
        </>
      ) : null}

      {horasPunta ? (
        <Tarjeta>
          <Texto fuerte>{fraseHorasPunta(horasPunta.horas)}</Texto>
          <Texto pequeno secundario>
            De casa al trabajo y vuelta, un día laborable. Se calcula una vez por semana.
          </Texto>
        </Tarjeta>
      ) : null}

      <Texto pequeno secundario>
        Tráfico y rutas: TomTom. Radares fijos: DGT (datos abiertos; de momento sin País Vasco ni Cataluña).
        Límites de velocidad: © colaboradores de OpenStreetMap.
      </Texto>
    </Pantalla>
  );
}

function EstadoDeRutas({ rutas, modo, origen }: { rutas: EstadoRutas; modo: string | null; origen: Punto | null }) {
  if (!modo) {
    return (
      <Texto secundario>
        En transporte público no hay tráfico que calcular: ábrelo en Google Maps y te da los horarios.
      </Texto>
    );
  }
  if (!origen) {
    return <Texto secundario>Para calcular la ruta necesito saber dónde estás o tener tu casa en Perfil.</Texto>;
  }
  if (!rutas) return null;
  if (rutas.estado === 'cargando') return <Texto secundario>Calculando rutas con el tráfico de ahora…</Texto>;
  if (rutas.estado === 'sin-servidor') {
    return (
      <Texto secundario>
        Las rutas con tráfico todavía no están activadas en esta versión. Mientras, puedes abrir el destino en Waze o
        Google Maps.
      </Texto>
    );
  }
  if (rutas.estado === 'error') return <Texto style={estilos.tarde}>{rutas.mensaje}</Texto>;
  if (rutas.rutas.length === 0) return <Texto secundario>No encuentro una ruta por carretera hasta ahí.</Texto>;
  return null;
}

const estilos = StyleSheet.create({
  buscador: { flexDirection: 'row', gap: espacio.s, alignItems: 'flex-start' },
  campo: { flex: 1 },
  lista: { gap: espacio.s },
  destino: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  destinoTextos: { flex: 1 },
  quitar: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  enlace: { color: colores.principal, fontFamily: fuentes.textoFuerte },
  pulsado: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  mapa: { height: 340, borderRadius: radio.grande },
  // Botón "En grande", encima del mapa, arriba a la derecha.
  agrandar: {
    position: 'absolute',
    top: espacio.s,
    right: espacio.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: 44,
    paddingHorizontal: espacio.m,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.chip,
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
    zIndex: 1000,
  },
  tarde: { color: colores.aviso },
});
