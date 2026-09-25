import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
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
  fraseResumen,
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
import { imprescindiblesDelDia, ventanaEpoca } from '@/services/epoca';
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
import { colorTipo, colorTipoSobreTinta, colores, espacio, fuentes, tamanos } from '@/theme';

import { ConfirmacionMovidas } from './calendario/ConfirmacionMovidas';
import { FilaEvento } from './calendario/FilaEvento';
import { TarjetaHueco } from './calendario/TarjetaHueco';
import { OPCIONES_ENERGIA, abrirEvento, nuevoEvento, rangoHoras } from './calendario/textos';
import { useAhora } from './calendario/useAhora';
import { BotonEpoca, FranjaEpoca } from './epoca/FranjaEpoca';
import { PlanDeHoy } from './epoca/PlanDeHoy';
import { ResumenFinEpoca } from './epoca/ResumenFinEpoca';
import { useEpocaActiva } from './epoca/useEpoca';

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

// Las filas se recolocan deslizándose (por ejemplo, al marcar una tarea como hecha)
// en vez de saltar. Con "reducir movimiento" activado en el móvil, cambian sin animar.
const RECOLOCAR = LinearTransition.duration(220);
const APARECER = FadeIn.duration(180);
const DESAPARECER = FadeOut.duration(120);

type FilaTareaLista = { tarea: Evento; detalle: string; apagada?: boolean };

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

  const frase = fraseResumen({ eventos: delDia, tareasPendientes: pendientes.length, huecos });
  const siguiente = siguienteEvento(eventos, ahora);

  // Lista del día: eventos y huecos libres mezclados por orden de hora.
  const lista = [
    ...delDia.map((evento) => ({ inicio: intervaloDe(evento).inicio, evento, hueco: null })),
    ...huecos.map((hueco) => ({ inicio: hueco.inicio, evento: null, hueco })),
  ].sort((a, b) => a.inicio - b.inicio);
  const minutoActual = minutosDelDia(ahora);

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

  return (
    <View style={estilos.contenedor}>
      <Pantalla contentContainerStyle={estilos.contenido} colorArriba={colores.tinta}>
        {/* Cabecera oscura: fecha, saludo, resumen del día y lo siguiente. */}
        <View style={estilos.cabecera}>
          <View style={estilos.cabeceraFila}>
            <View style={estilos.textos}>
              <Texto style={estilos.fechaTinta}>{formatearDiaCorto(ahora)}</Texto>
              <Titulo style={estilos.textoTinta}>{saludo}</Titulo>
            </View>
            <BotonInicial nombre={nombre} sobreTinta onPress={() => router.push('/perfil')} />
          </View>
          {cargado ? (
            <Texto style={estilos.resumen} accessibilityLiveRegion="polite">
              {frase}
            </Texto>
          ) : null}
          {cargado && siguiente ? <TarjetaSiguiente siguiente={siguiente} hoy={hoy} perfil={perfil} /> : null}
        </View>
        {epoca ? <FranjaEpoca epoca={epoca} hoy={hoy} /> : null}
        <AvisoPantallaInicio />
        {cargado && !epoca ? <BotonEpoca /> : null}
        <ResumenFinEpoca epocas={epocas} registro={registro} hoy={hoy} />

        <Selector
          etiqueta="¿Cómo vas de energía?"
          opciones={OPCIONES_ENERGIA}
          valor={energia}
          alCambiar={setEnergia}
        />

        {cargado ? (
          <>
            <ConfirmacionMovidas />

            {epoca && plan ? (
              <PlanDeHoy epoca={epoca} plan={plan} registro={registro} perfil={perfil} ahora={ahora} energia={energia} />
            ) : null}

            <Titulo nivel={2} style={estilos.seccion}>
              Tu día
            </Titulo>
            {lista.length === 0 ? (
              <Texto secundario>Nada con hora por hoy.</Texto>
            ) : (
              <LayoutAnimationConfig skipEntering>
                <View style={separacion}>
                  {lista.map((item) => (
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
            )}

            {pendientes.length + hechasHoy.length > 0 ? (
              <>
                <View style={estilos.seccion}>
                  <Titulo nivel={2}>Tareas flexibles</Titulo>
                  <Texto pequeno secundario>
                    {explicacionEnergia(energia, rindeMas)}
                  </Texto>
                </View>
                <LayoutAnimationConfig skipEntering>
                  <View style={separacion}>
                    {filasTareas.map((fila) => (
                      <Animated.View key={fila.tarea.id} layout={RECOLOCAR} entering={APARECER} exiting={DESAPARECER}>
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
                      <Animated.View key={fila.tarea.id} layout={RECOLOCAR} entering={APARECER} exiting={DESAPARECER}>
                        <FilaTarea {...fila} />
                      </Animated.View>
                    ))}
                  </View>
                </LayoutAnimationConfig>
              </>
            ) : null}
          </>
        ) : (
          <Texto secundario>Cargando tu día…</Texto>
        )}
      </Pantalla>
      <BotonFlotante etiqueta="Añadir evento" onPress={() => nuevoEvento(hoy)} />
    </View>
  );
}

// Lo siguiente (o lo que está en curso), dentro de la cabecera oscura. La barra de la
// izquierda lleva el color de su tipo, en su versión clara para que se vea sobre la tinta.
type PropsSiguiente = { siguiente: Siguiente; hoy: string; perfil: Perfil | null };

function TarjetaSiguiente({ siguiente, hoy, perfil }: PropsSiguiente) {
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cuando}: ${evento.titulo}, ${rangoHoras(evento)}`}
      onPress={() => abrirEvento(evento.id)}
      style={({ pressed }) => [
        estilos.siguiente,
        { borderLeftColor: colorTipoSobreTinta[evento.tipo] },
        pressed && estilos.pulsado,
      ]}>
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
  resumen: { color: colores.textoSobreTinta, fontSize: tamanos.normal, lineHeight: 24 },
  seccion: { marginTop: espacio.m },
  siguiente: {
    backgroundColor: colores.tintaSuave,
    borderLeftWidth: 4,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s + 4,
    gap: 2,
  },
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
