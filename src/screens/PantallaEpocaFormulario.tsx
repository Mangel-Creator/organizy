import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  BarraProgreso,
  Boton,
  CampoTexto,
  Interruptor,
  Pantalla,
  Selector,
  SelectorCantidad,
  SelectorDias,
  SelectorFecha,
  SelectorHora,
  Tarjeta,
  Texto,
  Titulo,
  type Opcion,
} from '@/components';
import { guardarEpoca, useEpocas, type Epoca } from '@/data/epocas';
import type { DiaSemana, Perfil } from '@/data/perfil';
import { usePerfil } from '@/data/perfil';
import { NOMBRE_CASA } from '@/services/agenda';
import { epocasSolapadas } from '@/services/epoca';
import { claveDia, fechaDesdeClave, formatearDiaCorto } from '@/services/fechas';
import { alturaTactil, colores, espacio } from '@/theme';

import {
  borradorDesdeEpoca,
  comprobarPaso1,
  comprobarPaso2,
  comprobarPaso3,
  epocaDesdeBorrador,
  hayErrores,
  type BorradorEpoca,
  type EleccionLugar,
  type Errores,
  type Trayecto,
} from './epoca/borrador';
import { EditorHitos } from './epoca/EditorHitos';
import { EditorImprescindibles } from './epoca/EditorImprescindibles';
import { SelectorLugarEpoca } from './epoca/SelectorLugarEpoca';
import {
  formatoHoras,
  NOMBRES_DIAS,
  OPCIONES_DESCANSO,
  OPCIONES_MOMENTO_EPOCA,
  OPCIONES_TIPO_EPOCA,
  OPCIONES_TRAYECTO,
} from './epoca/textos';
import { MensajeError } from './formulario-perfil/MensajeError';

// Formulario de la Época dorada en 3 pasos, con el mismo estilo que la bienvenida.
// Sirve para crear una época (/epoca-editar) y para editarla (/epoca-editar?id=...,
// y ?paso=3 para ir directo a los hitos). Al guardar, el plan se recalcula solo.

type Paso = 1 | 2 | 3;

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/epoca');
}

export function PantallaEpocaFormulario() {
  const { id, paso } = useLocalSearchParams<{ id?: string; paso?: string }>();
  const { cargado, epocas } = useEpocas();
  const { perfil } = usePerfil();

  if (id && !cargado) {
    return (
      <Pantalla>
        <Texto secundario>Cargando…</Texto>
      </Pantalla>
    );
  }
  const epoca = id ? (epocas.find((e) => e.id === id) ?? null) : null;
  if (id && !epoca) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto>Esta época ya no existe.</Texto>
      </Pantalla>
    );
  }
  return (
    <Formulario
      key={id ?? 'nueva'}
      epoca={epoca}
      epocas={epocas}
      perfil={perfil}
      pasoInicial={paso === '3' ? 3 : paso === '2' ? 2 : 1}
    />
  );
}

type Props = { epoca: Epoca | null; epocas: Epoca[]; perfil: Perfil | null; pasoInicial: Paso };

function Formulario({ epoca, epocas, perfil, pasoInicial }: Props) {
  const hoy = claveDia(new Date());
  const [b, setBorrador] = useState<BorradorEpoca>(() => borradorDesdeEpoca(epoca, perfil, hoy));
  const [errores, setErrores] = useState<Errores>({});
  const [paso, setPaso] = useState<Paso>(pasoInicial);
  const [ocupado, setOcupado] = useState(false);
  const [solapes, setSolapes] = useState<Epoca[]>([]);
  const scroll = useRef<ScrollView>(null);

  const cambiar = (cambios: Partial<BorradorEpoca>) => {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setSolapes([]);
    setErrores((actuales) => {
      const quedan = { ...actuales };
      for (const clave of Object.keys(cambios)) delete quedan[clave as keyof Errores];
      if ('inicio' in cambios) delete quedan.fin;
      if ('lugar' in cambios) delete quedan.direccion;
      if ('levantarse' in cambios) delete quedan.acostarse;
      return quedan;
    });
  };

  const irA = (nuevo: Paso) => {
    setPaso(nuevo);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const siguiente = (comprobar: () => Errores, destino: Paso) => {
    const nuevos = comprobar();
    setErrores(nuevos);
    if (hayErrores(nuevos)) {
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    irA(destino);
  };

  const guardar = async (aunqueSeSolape: boolean) => {
    const todos = { ...comprobarPaso1(b, hoy), ...comprobarPaso2(b), ...comprobarPaso3(b) };
    setErrores(todos);
    if (hayErrores(todos)) {
      if (todos.nombre || todos.tipo || todos.fin) irA(1);
      else if (!todos.hitos) irA(2);
      return;
    }
    const otras = epocasSolapadas({ id: b.id ?? '', inicio: b.inicio, fin: b.fin }, epocas);
    if (otras.length > 0 && !aunqueSeSolape) {
      setSolapes(otras);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
      return;
    }
    setOcupado(true);
    const resultado = await epocaDesdeBorrador(b);
    if ('error' in resultado) {
      setOcupado(false);
      setErrores({ direccion: resultado.error });
      irA(2);
      return;
    }
    await guardarEpoca(resultado);
    router.replace({ pathname: '/epoca', params: { id: resultado.id } });
  };

  // Chips del sitio de cada día: el de la época, Casa o un sitio habitual.
  const opcionesDia: Opcion<EleccionLugar>[] = [
    { valor: 'epoca', etiqueta: 'El de la época' },
    { valor: 'casa', etiqueta: NOMBRE_CASA },
    ...(perfil?.sitios ?? []).map((s) => ({ valor: `sitio:${s.id}`, etiqueta: s.nombre })),
  ];
  const opcionesLibre: Opcion<string>[] = [
    { valor: 'ninguno', etiqueta: 'Ninguno' },
    ...NOMBRES_DIAS.map((nombre, i) => ({ valor: String(i), etiqueta: nombre })),
  ];
  const vaFuera = b.lugar !== 'casa' || (b.distintoPorDia && Object.values(b.lugarPorDia).some((l) => l !== 'casa'));

  return (
    <Pantalla ref={scroll}>
      <BotonVolver />
      <BarraProgreso paso={paso} total={3} />

      {paso === 1 ? (
        <>
          <Titulo>¿Qué época se viene?</Titulo>
          <CampoTexto
            etiqueta="Nombre"
            placeholder="Exámenes de enero"
            value={b.nombre}
            onChangeText={(nombre) => cambiar({ nombre })}
            autoCapitalize="sentences"
            error={errores.nombre}
          />
          <View>
            <Selector
              etiqueta="Tipo"
              opciones={OPCIONES_TIPO_EPOCA}
              valor={b.tipo}
              alCambiar={(tipo) => cambiar({ tipo })}
            />
            <MensajeError texto={errores.tipo} />
          </View>
          <SelectorFecha etiqueta="Empieza" valor={b.inicio} alCambiar={(inicio) => cambiar({ inicio })} />
          <View>
            <SelectorFecha etiqueta="Termina" valor={b.fin} alCambiar={(fin) => cambiar({ fin })} />
            <MensajeError texto={errores.fin} />
          </View>
          <Boton titulo="Siguiente" onPress={() => siguiente(() => comprobarPaso1(b, hoy), 2)} />
        </>
      ) : null}

      {paso === 2 ? (
        <>
          <Titulo>Tu ritmo en esta época</Titulo>
          <View>
            <View style={estilos.fila}>
              <SelectorHora etiqueta="Me levanto" valor={b.levantarse} alCambiar={(levantarse) => cambiar({ levantarse })} />
              <SelectorHora etiqueta="Me acuesto" valor={b.acostarse} alCambiar={(acostarse) => cambiar({ acostarse })} />
            </View>
            <MensajeError texto={errores.acostarse} />
          </View>

          <SelectorLugarEpoca
            etiqueta="¿Dónde vas a estudiar o trabajar?"
            valor={b.lugar}
            alCambiar={(lugar) => cambiar({ lugar })}
            perfil={perfil}
            direccion={b.direccion}
            alCambiarDireccion={(direccion) => cambiar({ direccion })}
            error={errores.direccion}
          />
          <SelectorDias
            etiqueta="Qué días vas (los demás días, en casa)"
            valor={b.diasVas}
            alCambiar={(diasVas) => cambiar({ diasVas })}
          />
          <Interruptor
            etiqueta="Un sitio distinto según el día"
            ayuda="Por ejemplo, la biblioteca de lunes a jueves y casa el viernes."
            valor={b.distintoPorDia}
            alCambiar={(distintoPorDia) => cambiar({ distintoPorDia })}
          />
          {b.distintoPorDia
            ? b.diasVas.map((dia) => (
                <Selector
                  key={dia}
                  etiqueta={NOMBRES_DIAS[dia]}
                  opciones={opcionesDia}
                  valor={b.lugarPorDia[dia] ?? 'epoca'}
                  alCambiar={(eleccion) => cambiar({ lugarPorDia: { ...b.lugarPorDia, [dia]: eleccion } })}
                />
              ))
            : null}
          {b.distintoPorDia ? (
            <Texto pequeno secundario>Para elegir aquí otro sitio, añádelo antes a tus sitios habituales en Perfil.</Texto>
          ) : null}
          {vaFuera ? (
            <Selector
              etiqueta="¿Cuánto tardas en llegar? (para avisarte de cuándo salir)"
              opciones={OPCIONES_TRAYECTO}
              valor={b.trayecto}
              alCambiar={(trayecto: Trayecto) => cambiar({ trayecto })}
            />
          ) : null}

          <SelectorCantidad
            etiqueta="Horas de estudio o trabajo al día"
            valor={b.horasDia}
            alCambiar={(horasDia) => cambiar({ horasDia })}
            minimo={0.5}
            maximo={14}
            paso={0.5}
            formato={formatoHoras}
          />
          <View>
            <Selector
              etiqueta="¿Cuándo rindes más en esta época?"
              opciones={OPCIONES_MOMENTO_EPOCA}
              valor={b.rindeMas}
              alCambiar={(rindeMas) => cambiar({ rindeMas })}
            />
            <MensajeError texto={errores.rindeMas} />
          </View>
          <View>
            <Selector
              etiqueta="Cómo te gusta descansar (trabajo + descanso)"
              opciones={OPCIONES_DESCANSO}
              valor={b.descanso}
              alCambiar={(descanso) => cambiar({ descanso })}
            />
            <MensajeError texto={errores.descanso} />
          </View>
          <Selector
            etiqueta="Día libre a la semana"
            opciones={opcionesLibre}
            valor={b.diaLibre === null ? 'ninguno' : String(b.diaLibre)}
            alCambiar={(valor) => cambiar({ diaLibre: valor === 'ninguno' ? null : (Number(valor) as DiaSemana) })}
          />
          <EditorImprescindibles
            lista={b.imprescindibles}
            alCambiar={(imprescindibles) => cambiar({ imprescindibles })}
          />

          <View style={estilos.botones}>
            <Boton titulo="Siguiente" onPress={() => siguiente(() => comprobarPaso2(b), 3)} />
            <Boton variante="secundario" titulo="Atrás" onPress={() => irA(1)} />
          </View>
        </>
      ) : null}

      {paso === 3 ? (
        <>
          <Titulo>¿Qué tienes por delante?</Titulo>
          <Texto secundario>
            Exámenes o entregas. Con las horas de preparación de cada uno te hago el plan día a día. Puedes
            cambiarlos cuando quieras, también durante la época.
          </Texto>
          <EditorHitos
            hitos={b.hitos}
            alCambiar={(hitos) => cambiar({ hitos })}
            perfil={perfil}
            inicio={b.inicio}
            fin={b.fin}
          />
          <MensajeError texto={errores.hitos} />

          {solapes.length > 0 ? (
            <Tarjeta style={estilos.aviso} accessibilityLiveRegion="assertive">
              <Titulo nivel={3}>Se solapa con otra época</Titulo>
              {solapes.map((o) => (
                <Texto key={o.id} secundario>
                  «{o.nombre}», del {formatearDiaCorto(fechaDesdeClave(o.inicio))} al{' '}
                  {formatearDiaCorto(fechaDesdeClave(o.fin))}.
                </Texto>
              ))}
              <Texto secundario>
                Solo puede haber una activa a la vez: en los días que coincidan manda la que empieza antes.
              </Texto>
              <Boton titulo="Guardar igualmente" disabled={ocupado} onPress={() => guardar(true)} />
              <Boton variante="secundario" titulo="Cambiar las fechas" onPress={() => irA(1)} />
            </Tarjeta>
          ) : null}

          <View style={estilos.botones}>
            <Boton
              titulo={ocupado ? 'Guardando…' : epoca ? 'Guardar cambios' : 'Empezar época dorada'}
              disabled={ocupado}
              onPress={() => guardar(false)}
            />
            <Boton variante="secundario" titulo="Atrás" onPress={() => irA(2)} />
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}

function BotonVolver() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver sin guardar"
      onPress={volver}
      style={({ pressed }) => [estilos.volver, pressed && estilos.pulsado]}>
      <Ionicons name="chevron-back" size={24} color={colores.texto} />
      <Texto fuerte>Volver</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: alturaTactil,
    paddingRight: espacio.s,
    marginLeft: -espacio.xs,
  },
  pulsado: { transform: [{ scale: 0.97 }] },
  fila: { flexDirection: 'row', gap: espacio.m },
  botones: { gap: espacio.s, marginTop: espacio.s },
  aviso: { borderColor: colores.aviso, borderWidth: 2, gap: espacio.m },
});
