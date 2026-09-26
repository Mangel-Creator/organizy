import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import {
  AvisoPantallaInicio,
  Boton,
  BotonFlotante,
  BotonInicial,
  Casilla,
  Pantalla,
  Selector,
  Texto,
  Titulo,
} from '@/components';
import { useDensidad } from '@/data/densidad';
import { useEnergia } from '@/data/energia';
import { marcarHecha, moverTareas, useEventos, type Evento } from '@/data/eventos';
import { usePerfil, type MomentoDelDia, type Perfil } from '@/data/perfil';
import {
  calcularHuecos,
  duracionTarea,
  eventosDelDia,
  intervaloDe,
  repartirTareas,
  resolverLugar,
  siguienteEvento,
  tareasPendientes,
  ventanaDelDia,
  type Energia,
  type Intervalo,
  type Siguiente,
} from '@/services/agenda';
import { imprescindiblesDelDia, textoQuedan, ventanaEpoca } from '@/services/epoca';
import {
  claveDia,
  fechaDesdeClave,
  formatearDiaCorto,
  formatearDuracion,
  horaDesdeMinutos,
  minutosDelDia,
  saludoSegunHora,
  sumarDias,
} from '@/services/fechas';
import { colorBaldosa, colorTipo, colorTipoSobreTinta, colores, espacio, fuentes } from '@/theme';

import { CapturaRapida } from './captura/CapturaRapida';
import { ConfirmacionMovidas } from './calendario/ConfirmacionMovidas';
import { FilaEvento } from './calendario/FilaEvento';
import { SalidaSiguiente } from './calendario/SalidaSiguiente';
import { TarjetaHueco } from './calendario/TarjetaHueco';
import { OPCIONES_ENERGIA, abrirEvento, nuevoEvento, rangoHoras } from './calendario/textos';
import { useAhora } from './calendario/useAhora';
import { PlanDeHoy } from './epoca/PlanDeHoy';
import { ResumenFinEpoca } from './epoca/ResumenFinEpoca';
import { useEpocaActiva } from './epoca/useEpoca';
import { PanelHoy, type DatosBaldosa, type Vista } from './hoy/PanelHoy';

const NOMBRE_MOMENTO: Record<MomentoDelDia, string> = {
  manana: 'por la mañana',
  tarde: 'por la tarde',
  noche: 'por la noche',
};

function explicacionEnergia(energia: Energia, rindeMas: MomentoDelDia): string {
  if (energia === 'a-tope') return `Te las coloco ${NOMBRE_MOMENTO[rindeMas]}, cuando rindes más.`;
  if (energia === 'normal') return 'Repartidas entre tus huecos libres.';
  return 'Hoy vas tranqui: como mucho 2.';
}

// "1 cliente" / "2 clientes"
function contar(n: number, uno: string, varios: string): string {
  return n === 1 ? uno : varios;
}

// Las filas se recolocan deslizándose (por ejemplo, al marcar una tarea como hecha)
// en vez de saltar. Con "reducir movimiento" activado en el móvil, cambian sin animar.
const RECOLOCAR = LinearTransition.duration(220);
const APARECER = FadeIn.duration(180);
const DESAPARECER = FadeOut.duration(120);

type FilaTareaLista = { tarea: Evento; detalle: string; apagada?: boolean };

const TITULO_VISTA: Record<Vista, string> = {
  cliente: 'Clientes de hoy',
  amigos: 'Planes con amigos',
  yo: 'Para ti',
  tareas: 'Tareas',
  estudio: 'Estudio de hoy',
  dia: 'Todo el día',
};

// Hoy (rediseño del 26/09/2026, "mucho más visual"): cabecera oscura con el saludo y
// lo siguiente, y un panel de casillas grandes con icono y número. Al tocar una, su
// lista sale debajo. La captura rápida está plegada: se abre con el "+".
export function PantallaHoy() {
  const ahora = useAhora();
  const hoy = claveDia(ahora);
  const { perfil } = usePerfil();
  const { cargado, eventos } = useEventos();
  const [energia, setEnergia] = useEnergia(hoy);
  // Época dorada activa (fase 4b): cambia el horario del día y añade su plan.
  const { epoca, plan, epocas, registro } = useEpocaActiva(hoy, eventos, energia);
  const { medidas } = useDensidad();
  const separacion = { gap: medidas.separacion };
  const [vista, setVista] = useState<Vista | null>(null);
  const [capturaAbierta, setCapturaAbierta] = useState(false);

  const nombre = perfil?.nombre ?? '';
  const saludo = saludoSegunHora(ahora, nombre);

  // La cabecera es oscura: mientras Hoy está a la vista, la hora y la batería van en blanco.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
  const rindeMas = perfil?.rindeMas ?? 'manana';

  // Huecos a partir de ahora (redondeado al cuarto de hora) dentro del horario del perfil.
  // Durante una época, lo que no quiere dejar de hacer cuenta como un evento más
  // y los bloques de estudio (con su descanso) ocupan su tiempo.
  const delDia = [...eventosDelDia(eventos, hoy), ...(epoca ? imprescindiblesDelDia(epoca, hoy) : [])].sort(
    (a, b) => intervaloDe(a).inicio - intervaloDe(b).inicio,
  );
  const bloquesHoy = (plan?.bloques ?? []).filter((b) => b.dia === hoy && b.estado !== 'saltado');
  const ocupados = [...delDia.map(intervaloDe), ...bloquesHoy.map((b) => ({ inicio: b.inicio, fin: b.descansoFin }))];
  const ventana = epoca ? ventanaEpoca(epoca) : ventanaDelDia(perfil);
  const desde = Math.max(ventana.inicio, Math.ceil(minutosDelDia(ahora) / 15) * 15);
  const quedan = { inicio: desde, fin: ventana.fin };
  const huecos = calcularHuecos(ocupados, quedan);

  const pendientes = tareasPendientes(eventos, hoy, hoy);
  const reparto = repartirTareas(pendientes, duracionTarea, calcularHuecos(ocupados, quedan, 15), energia, rindeMas);
  const hechasHoy = eventos.filter((e) => e.flexible && e.hecha && e.fecha === hoy);
  const siguiente = siguienteEvento(eventos, ahora);
  const minutoActual = minutosDelDia(ahora);

  // Lista del día: eventos y huecos libres mezclados por orden de hora.
  const lista = [
    ...delDia.map((evento) => ({ inicio: intervaloDe(evento).inicio, evento, hueco: null })),
    ...huecos.map((hueco) => ({ inicio: hueco.inicio, evento: null, hueco })),
  ].sort((a, b) => a.inicio - b.inicio);

  // Todas las tareas en una sola lista, para que al marcar una se deslice a su sitio.
  const filasTareas: FilaTareaLista[] = [
    ...reparto.colocadas.map((c) => ({
      tarea: c.tarea,
      detalle: `A las ${horaDesdeMinutos(c.inicio)} · ${formatearDuracion(duracionTarea(c.tarea))}`,
    })),
    ...reparto.sinHueco.map((tarea) => ({
      tarea,
      detalle: `Sin hueco hoy · ${formatearDuracion(duracionTarea(tarea))}`,
    })),
    ...reparto.paraManana.map((tarea) => ({ tarea, detalle: 'Mejor mañana', apagada: true })),
  ];
  const filasHechas: FilaTareaLista[] = hechasHoy.map((tarea) => ({ tarea, detalle: 'Hecha', apagada: true }));

  // --- Casillas del panel ---
  const normales = delDia.filter((e) => !e.foco);
  const deTipo = (tipo: Evento['tipo']) => delDia.filter((e) => e.tipo === tipo && (tipo === 'yo' || !e.foco));
  const nClientes = normales.filter((e) => e.tipo === 'cliente').length;
  const nAmigos = normales.filter((e) => e.tipo === 'amigos').length;
  const nYo = deTipo('yo').length;
  const bloquesDeHoy = (plan?.bloques ?? []).filter((b) => b.dia === hoy);
  const bloquesHechos = bloquesDeHoy.filter((b) => b.estado === 'hecho').length;

  const baldosas: DatosBaldosa[] = [
    {
      clave: 'cliente',
      icono: 'briefcase-outline',
      colores: colorBaldosa.cliente,
      numero: String(nClientes),
      etiqueta: contar(nClientes, 'cliente', 'clientes'),
      lectura: `${nClientes} ${contar(nClientes, 'cliente', 'clientes')} hoy. Ver la lista`,
    },
    {
      clave: 'amigos',
      icono: 'people-outline',
      colores: colorBaldosa.amigos,
      numero: String(nAmigos),
      etiqueta: contar(nAmigos, 'plan con amigos', 'planes con amigos'),
      lectura: `${nAmigos} ${contar(nAmigos, 'plan con amigos', 'planes con amigos')} hoy. Ver la lista`,
    },
    {
      clave: 'tareas',
      icono: 'checkbox-outline',
      colores: colorBaldosa.neutro,
      numero: String(pendientes.length),
      etiqueta: contar(pendientes.length, 'tarea', 'tareas'),
      lectura: `${pendientes.length} ${contar(pendientes.length, 'tarea pendiente', 'tareas pendientes')}. Ver la lista`,
    },
    epoca
      ? {
          clave: 'estudio',
          icono: 'school-outline',
          colores: colorBaldosa.estudio,
          numero: `${bloquesHechos}/${bloquesDeHoy.length}`,
          etiqueta: 'bloques de estudio',
          lectura: `${bloquesHechos} de ${bloquesDeHoy.length} bloques de estudio hechos. Ver el plan`,
        }
      : {
          clave: 'yo',
          icono: 'person-outline',
          colores: colorBaldosa.yo,
          numero: String(nYo),
          etiqueta: contar(nYo, 'cosa tuya', 'cosas tuyas'),
          lectura: `${nYo} ${contar(nYo, 'cosa tuya', 'cosas tuyas')} hoy. Ver la lista`,
        },
    {
      clave: 'dia',
      icono: 'calendar-outline',
      colores: colorBaldosa.neutro,
      etiqueta: 'Todo el día',
      lectura: 'Todo el día, por horas. Ver la lista',
    },
    {
      clave: 'epoca',
      icono: epoca ? 'star' : 'star-outline',
      colores: colorBaldosa.estudio,
      etiqueta: epoca ? `Época dorada · ${textoQuedan(epoca, hoy)}` : 'Época dorada',
      lectura: epoca ? `Época dorada, ${textoQuedan(epoca, hoy)}. Abrir` : 'Época dorada. Abrir',
    },
  ];

  const pulsarBaldosa = (clave: DatosBaldosa['clave']) => {
    if (clave === 'epoca') {
      router.push('/epoca');
      return;
    }
    setVista((actual) => (actual === clave ? null : clave));
  };

  const selectorEnergia = (
    <Selector etiqueta="¿Cómo vas de energía?" opciones={OPCIONES_ENERGIA} valor={energia} alCambiar={setEnergia} />
  );

  // Filas de eventos (con sus huecos si es "Todo el día"), con las animaciones de siempre.
  const listaEventos = (items: typeof lista, vacio: string) =>
    items.length === 0 ? (
      <Texto secundario>{vacio}</Texto>
    ) : (
      <LayoutAnimationConfig skipEntering>
        <View style={separacion}>
          {items.map((item) => (
            <Animated.View
              key={item.evento ? item.evento.id : `hueco-${item.inicio}`}
              layout={RECOLOCAR}
              entering={APARECER}
              exiting={DESAPARECER}>
              {item.evento ? (
                <FilaEvento evento={item.evento} pasado={intervaloDe(item.evento).fin <= minutoActual} />
              ) : (
                <TarjetaHueco hueco={item.hueco as Intervalo} />
              )}
            </Animated.View>
          ))}
        </View>
      </LayoutAnimationConfig>
    );
  const soloEventos = (tipo: Evento['tipo']) =>
    deTipo(tipo).map((evento) => ({ inicio: intervaloDe(evento).inicio, evento, hueco: null }));

  return (
    <View style={estilos.contenedor}>
      <Pantalla contentContainerStyle={estilos.contenido} colorArriba={colores.tinta}>
        {/* Cabecera oscura: fecha, saludo y lo siguiente. */}
        <View style={estilos.cabecera}>
          <View style={estilos.cabeceraFila}>
            <View style={estilos.textos}>
              <Texto style={estilos.fechaTinta}>{formatearDiaCorto(ahora)}</Texto>
              <Titulo style={estilos.textoTinta}>{saludo}</Titulo>
            </View>
            <BotonInicial nombre={nombre} sobreTinta onPress={() => router.push('/perfil')} />
          </View>
          {cargado && siguiente ? <TarjetaSiguiente siguiente={siguiente} hoy={hoy} perfil={perfil} ahora={ahora} /> : null}
        </View>

        <CapturaRapida
          hoy={hoy}
          plegada={!capturaAbierta}
          alRellenarAMano={() => {
            setCapturaAbierta(false);
            nuevoEvento(hoy);
          }}
        />
        <AvisoPantallaInicio />
        <ResumenFinEpoca epocas={epocas} registro={registro} hoy={hoy} />

        {cargado ? (
          <>
            <ConfirmacionMovidas />
            <PanelHoy baldosas={baldosas} elegida={vista} alPulsar={pulsarBaldosa} />

            {vista ? (
              <Animated.View key={vista} entering={APARECER} style={estilos.vista}>
                <Titulo nivel={2}>{TITULO_VISTA[vista]}</Titulo>

                {vista === 'dia' ? listaEventos(lista, 'Nada con hora por hoy.') : null}
                {vista === 'cliente' ? listaEventos(soloEventos('cliente'), 'Hoy no tienes clientes.') : null}
                {vista === 'amigos' ? listaEventos(soloEventos('amigos'), 'Hoy no hay planes con amigos.') : null}
                {vista === 'yo' ? listaEventos(soloEventos('yo'), 'Hoy no tienes nada tuyo con hora.') : null}

                {vista === 'estudio' && epoca && plan ? (
                  <>
                    {selectorEnergia}
                    <PlanDeHoy epoca={epoca} plan={plan} registro={registro} perfil={perfil} ahora={ahora} energia={energia} />
                  </>
                ) : null}

                {vista === 'tareas' ? (
                  <>
                    {selectorEnergia}
                    {pendientes.length + hechasHoy.length === 0 ? (
                      <Texto secundario>No te queda ninguna tarea. Bien.</Texto>
                    ) : (
                      <>
                        <Texto pequeno secundario>
                          {explicacionEnergia(energia, rindeMas)}
                        </Texto>
                        <LayoutAnimationConfig skipEntering>
                          <View style={separacion}>
                            {filasTareas.map((fila) => (
                              <Animated.View
                                key={fila.tarea.id}
                                layout={RECOLOCAR}
                                entering={APARECER}
                                exiting={DESAPARECER}>
                                <FilaTarea {...fila} />
                              </Animated.View>
                            ))}
                            {reparto.paraManana.length > 0 ? (
                              <Animated.View key="pasar-a-manana" layout={RECOLOCAR}>
                                <Boton
                                  variante="secundario"
                                  titulo={`Pasar el resto a mañana (${reparto.paraManana.length})`}
                                  onPress={() =>
                                    moverTareas(
                                      reparto.paraManana.map((t) => t.id),
                                      sumarDias(hoy, 1),
                                    )
                                  }
                                />
                              </Animated.View>
                            ) : null}
                            {filasHechas.map((fila) => (
                              <Animated.View
                                key={fila.tarea.id}
                                layout={RECOLOCAR}
                                entering={APARECER}
                                exiting={DESAPARECER}>
                                <FilaTarea {...fila} />
                              </Animated.View>
                            ))}
                          </View>
                        </LayoutAnimationConfig>
                      </>
                    )}
                  </>
                ) : null}
              </Animated.View>
            ) : null}
          </>
        ) : (
          <Texto secundario>Cargando tu día…</Texto>
        )}
      </Pantalla>
      <BotonFlotante
        etiqueta={capturaAbierta ? 'Cerrar la captura rápida' : 'Apuntar algo'}
        icono={capturaAbierta ? 'close' : 'add'}
        onPress={() => setCapturaAbierta((abierta) => !abierta)}
      />
    </View>
  );
}

// Lo siguiente (o lo que está en curso), dentro de la cabecera oscura. La barra de la
// izquierda lleva el color de su tipo, en su versión clara para que se vea sobre la tinta.
type PropsSiguiente = { siguiente: Siguiente; hoy: string; perfil: Perfil | null; ahora: Date };

function TarjetaSiguiente({ siguiente, hoy, perfil, ahora }: PropsSiguiente) {
  const { evento, dia, enCurso } = siguiente;
  const cuando = enCurso
    ? 'Ahora mismo'
    : dia === hoy
      ? 'Lo siguiente'
      : dia === sumarDias(hoy, 1)
        ? 'Mañana'
        : formatearDiaCorto(fechaDesdeClave(dia));
  // Nombre del sitio (Casa, Trabajo...) y debajo su dirección.
  const lugar = resolverLugar(evento.lugar, perfil);

  return (
    <View style={[estilos.siguiente, { borderLeftColor: colorTipoSobreTinta[evento.tipo] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${cuando}: ${evento.titulo}, ${rangoHoras(evento)}`}
        onPress={() => abrirEvento(evento.id)}
        style={({ pressed }) => [estilos.siguienteTextos, pressed && estilos.pulsado]}>
        <Texto pequeno style={estilos.horaTinta}>
          {cuando} · {rangoHoras(evento)}
        </Texto>
        <Titulo nivel={3} style={estilos.textoTinta}>
          {evento.titulo}
        </Titulo>
        {lugar ? (
          <Texto pequeno style={estilos.fechaTinta}>
            {[lugar.nombre, lugar.direccion].filter(Boolean).join(' · ')}
          </Texto>
        ) : null}
      </Pressable>
      {/* "Sal a las 10:05 · 18 min en coche" y "Cómo llegar" (fase 6). */}
      <SalidaSiguiente evento={evento} dia={dia} enCurso={enCurso} ahora={ahora} />
    </View>
  );
}

function FilaTarea({ tarea, detalle, apagada }: FilaTareaLista) {
  const { medidas } = useDensidad();
  return (
    <View
      style={[
        estilos.tarea,
        { borderLeftColor: apagada ? colores.cargaNormal : colorTipo[tarea.tipo] },
        { minHeight: medidas.altoFila, paddingVertical: Math.max(medidas.rellenoFila - 4, 0) },
        apagada && estilos.apagada,
      ]}>
      <Casilla
        marcada={tarea.hecha}
        alCambiar={(hecha) => marcarHecha(tarea.id, hecha)}
        etiqueta={`Marcar como hecha: ${tarea.titulo}`}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => abrirEvento(tarea.id)}
        style={({ pressed }) => [estilos.tareaTextos, pressed && estilos.pulsado]}>
        <Texto
          fuerte
          style={[
            { fontSize: medidas.texto, lineHeight: medidas.interlineado },
            apagada && estilos.textoApagado,
            tarea.hecha && estilos.tachada,
          ]}>
          {tarea.titulo}
        </Texto>
        <Texto pequeno secundario>
          {detalle}
        </Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingBottom: 120 }, // deja sitio al botón "+"
  // La cabecera ocupa todo el ancho: se come el margen de Pantalla.
  cabecera: {
    marginHorizontal: -espacio.l,
    marginTop: -espacio.l,
    paddingHorizontal: espacio.l,
    paddingTop: espacio.m,
    paddingBottom: espacio.l,
    backgroundColor: colores.tinta,
    gap: espacio.m,
  },
  cabeceraFila: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.m },
  textos: { flex: 1, gap: espacio.xs },
  fechaTinta: { color: colores.textoSecundarioSobreTinta },
  textoTinta: { color: colores.textoSobreTinta },
  horaTinta: { color: colores.textoSecundarioSobreTinta, fontFamily: fuentes.hora },
  vista: { gap: espacio.m, marginTop: espacio.s },
  siguiente: {
    backgroundColor: colores.tintaSuave,
    borderLeftWidth: 4,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s + 4,
    gap: 2,
  },
  siguienteTextos: { gap: 2 },
  pulsado: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  tarea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    paddingRight: espacio.m,
    backgroundColor: colores.tarjeta,
    borderLeftWidth: 4, // barra del color de su tipo
  },
  tareaTextos: { flex: 1, minHeight: 44, justifyContent: 'center' },
  // Sin opacidad, para que el texto siga pasando el contraste mínimo.
  apagada: { backgroundColor: 'transparent' },
  textoApagado: { color: colores.textoSecundario },
  tachada: { textDecorationLine: 'line-through' },
});
