import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Interruptor,
  Pantalla,
  Selector,
  SelectorFecha,
  SelectorHora,
  Tarjeta,
  Texto,
  Titulo,
  type Opcion,
} from '@/components';
import {
  borrarEvento,
  guardarEvento,
  nuevoId,
  useEventos,
  type Evento,
  type LugarEvento,
  type Repeticion,
  type TipoEvento,
} from '@/data/eventos';
import { usePerfil, type SitioHabitual } from '@/data/perfil';
import { bloqueDeFocoQuePisa } from '@/services/agenda';
import {
  claveDia,
  horaDesdeMinutos,
  minutosDelDia,
  minutosDesdeHora,
  type ClaveDia,
} from '@/services/fechas';
import { ATRIBUCION_OPENSTREETMAP, buscarCoordenadas, usaOpenStreetMap } from '@/services/lugares';
import { alturaTactil, colores, espacio } from '@/theme';

import { OPCIONES_DURACION, OPCIONES_REPETICION, OPCIONES_TIPO, rangoHoras } from './calendario/textos';
import { MENSAJE_NO_ENCONTRADO } from './formulario-perfil/borrador';
import { MensajeError } from './formulario-perfil/MensajeError';

// Ficha de un evento: sirve para crear uno nuevo y para editar o borrar uno que ya existe.
// Se abre en /evento?fecha=AAAA-MM-DD (nuevo) o /evento?id=... (editar).

function volver() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function PantallaEvento() {
  const { id, fecha } = useLocalSearchParams<{ id?: string; fecha?: string }>();
  const { cargado, eventos } = useEventos();
  const { perfil } = usePerfil();

  if (id && !cargado) {
    return (
      <Pantalla>
        <Texto secundario>Cargando…</Texto>
      </Pantalla>
    );
  }
  const evento = id ? (eventos.find((e) => e.id === id) ?? null) : null;
  if (id && !evento) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto>Este evento ya no existe.</Texto>
      </Pantalla>
    );
  }
  return (
    <Formulario
      key={id ?? 'nuevo'}
      evento={evento}
      fechaInicial={fecha ?? claveDia(new Date())}
      sitios={perfil?.sitios ?? []}
      eventos={eventos}
    />
  );
}

type Duracion = (typeof OPCIONES_DURACION)[number]['valor'];

type Borrador = {
  titulo: string;
  tipo: TipoEvento;
  fecha: ClaveDia;
  horaInicio: string;
  horaFin: string;
  flexible: boolean;
  duracion: Duracion;
  hecha: boolean;
  foco: boolean;
  repeticion: Repeticion;
  lugar: string; // "ninguno", "otro" o "sitio:<id>"
  direccion: string; // solo si lugar = "otro"
  notas: string;
};

type Errores = Partial<Record<'titulo' | 'horaFin' | 'direccion', string>>;

// Hora por defecto: la siguiente hora en punto (hoy) o las 10:00 (otro día).
function horaPorDefecto(fecha: ClaveDia): string {
  if (fecha !== claveDia(new Date())) return '10:00';
  return horaDesdeMinutos(Math.min(Math.ceil(minutosDelDia(new Date()) / 60) * 60, 22 * 60));
}

function borradorInicial(evento: Evento | null, fecha: ClaveDia, sitios: SitioHabitual[]): Borrador {
  if (!evento) {
    const inicio = horaPorDefecto(fecha);
    return {
      titulo: '',
      tipo: 'yo',
      fecha,
      horaInicio: inicio,
      horaFin: horaDesdeMinutos(minutosDesdeHora(inicio) + 60),
      flexible: false,
      duracion: '30',
      hecha: false,
      foco: false,
      repeticion: 'nunca',
      lugar: 'ninguno',
      direccion: '',
      notas: '',
    };
  }
  const sitio = sitios.find(
    (s) => s.nombre === evento.lugar?.nombre && s.direccion === evento.lugar?.direccion,
  );
  const inicio = evento.horaInicio ?? horaPorDefecto(evento.fecha);
  return {
    titulo: evento.titulo,
    tipo: evento.tipo,
    fecha: evento.fecha,
    horaInicio: inicio,
    horaFin: evento.horaFin ?? horaDesdeMinutos(minutosDesdeHora(inicio) + 60),
    flexible: evento.flexible,
    duracion: (OPCIONES_DURACION.find((o) => o.valor === String(evento.duracionMin))?.valor ?? '30') as Duracion,
    hecha: evento.hecha,
    foco: evento.foco,
    repeticion: evento.repeticion,
    lugar: sitio ? `sitio:${sitio.id}` : evento.lugar ? 'otro' : 'ninguno',
    direccion: sitio ? '' : (evento.lugar?.direccion ?? ''),
    notas: evento.notas,
  };
}

type Props = {
  evento: Evento | null;
  fechaInicial: ClaveDia;
  sitios: SitioHabitual[];
  eventos: Evento[];
};

function Formulario({ evento, fechaInicial, sitios, eventos }: Props) {
  const [b, setBorrador] = useState<Borrador>(() => borradorInicial(evento, fechaInicial, sitios));
  const [errores, setErrores] = useState<Errores>({});
  const [ocupado, setOcupado] = useState(false);
  const [focoPisado, setFocoPisado] = useState<{ bloque: Evento; nuevo: Evento } | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const scroll = useRef<ScrollView>(null);

  const cambiar = (cambios: Partial<Borrador>) => {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setFocoPisado(null);
    setErrores((actuales) => {
      const quedan = { ...actuales };
      for (const clave of Object.keys(cambios)) delete quedan[clave as keyof Errores];
      if ('horaInicio' in cambios) delete quedan.horaFin;
      if ('lugar' in cambios) delete quedan.direccion;
      return quedan;
    });
  };

  // Al mover la hora de inicio, la de fin se mueve igual (se mantiene la duración).
  const cambiarInicio = (horaInicio: string) => {
    const diferencia = minutosDesdeHora(horaInicio) - minutosDesdeHora(b.horaInicio);
    cambiar({ horaInicio, horaFin: horaDesdeMinutos(minutosDesdeHora(b.horaFin) + diferencia) });
  };

  const opcionesLugar: Opcion<string>[] = [
    { valor: 'ninguno', etiqueta: 'Sin lugar' },
    ...sitios.map((s) => ({ valor: `sitio:${s.id}`, etiqueta: s.nombre })),
    { valor: 'otro', etiqueta: 'Otra dirección' },
  ];

  // Calcula el lugar del evento. Devuelve un texto de error si no encuentra la dirección.
  const calcularLugar = async (): Promise<LugarEvento | null | string> => {
    if (b.lugar === 'ninguno') return null;
    if (b.lugar.startsWith('sitio:')) {
      const sitio = sitios.find((s) => `sitio:${s.id}` === b.lugar);
      return sitio ? { nombre: sitio.nombre, direccion: sitio.direccion, coordenadas: sitio.coordenadas } : null;
    }
    const direccion = b.direccion.trim();
    // Si la dirección no ha cambiado, se conservan sus coordenadas.
    if (evento?.lugar && evento.lugar.direccion === direccion && evento.lugar.coordenadas) {
      return evento.lugar;
    }
    const resultado = await buscarCoordenadas(direccion);
    if (resultado.estado === 'no-encontrado') return MENSAJE_NO_ENCONTRADO;
    return {
      nombre: null,
      direccion,
      coordenadas: resultado.estado === 'encontrado' ? resultado.coordenadas : null,
    };
  };

  const guardar = async () => {
    const nuevosErrores: Errores = {};
    if (!b.titulo.trim()) nuevosErrores.titulo = 'Escribe un título.';
    if (!b.flexible && minutosDesdeHora(b.horaFin) <= minutosDesdeHora(b.horaInicio)) {
      nuevosErrores.horaFin = 'La hora de fin tiene que ser después de la de inicio.';
    }
    if (b.lugar === 'otro' && !b.direccion.trim()) {
      nuevosErrores.direccion = 'Escribe la dirección o elige «Sin lugar».';
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setOcupado(true);
    const lugar = await calcularLugar();
    setOcupado(false);
    if (typeof lugar === 'string') {
      setErrores({ direccion: lugar });
      return;
    }

    const nuevo: Evento = {
      id: evento?.id ?? nuevoId(),
      titulo: b.titulo.trim(),
      fecha: b.fecha,
      horaInicio: b.flexible ? null : b.horaInicio,
      horaFin: b.flexible ? null : b.horaFin,
      tipo: b.tipo,
      lugar,
      notas: b.notas.trim(),
      repeticion: b.flexible ? 'nunca' : b.repeticion,
      flexible: b.flexible,
      duracionMin: b.flexible ? Number(b.duracion) : null,
      hecha: b.flexible && b.hecha,
      foco: !b.flexible && b.foco,
      ejemplo: evento?.ejemplo ?? false,
    };

    const bloque = bloqueDeFocoQuePisa(nuevo, eventos);
    if (bloque) {
      setFocoPisado({ bloque, nuevo });
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
      return;
    }
    await guardarDeVerdad(nuevo);
  };

  const guardarDeVerdad = async (nuevo: Evento) => {
    setOcupado(true);
    await guardarEvento(nuevo);
    volver();
  };

  const borrar = async () => {
    if (!evento) return;
    volver();
    await borrarEvento(evento.id);
  };

  const nombre = b.flexible ? 'tarea' : 'evento';

  return (
    <Pantalla ref={scroll}>
      <BotonVolver />
      <Titulo>{evento ? `Editar ${nombre}` : b.flexible ? 'Nueva tarea' : 'Nuevo evento'}</Titulo>

      <CampoTexto
        etiqueta="Título"
        placeholder={b.flexible ? 'Llamar al taller' : 'Reunión con Laura'}
        value={b.titulo}
        onChangeText={(titulo) => cambiar({ titulo })}
        autoCapitalize="sentences"
        autoFocus={!evento}
        returnKeyType="done"
        error={errores.titulo}
      />

      <Selector etiqueta="Tipo" opciones={OPCIONES_TIPO} valor={b.tipo} alCambiar={(tipo) => cambiar({ tipo })} />

      <Interruptor
        etiqueta="Tarea flexible"
        ayuda="Sin hora fija, como «llamar al taller». La coloco en tus huecos libres."
        valor={b.flexible}
        alCambiar={(flexible) => cambiar({ flexible })}
      />

      <SelectorFecha
        etiqueta={b.flexible ? 'Para el día' : 'Fecha'}
        valor={b.fecha}
        alCambiar={(fecha) => cambiar({ fecha })}
      />

      {b.flexible ? (
        <>
          <Selector
            etiqueta="Duración estimada"
            opciones={OPCIONES_DURACION}
            valor={b.duracion}
            alCambiar={(duracion) => cambiar({ duracion })}
          />
          {evento ? (
            <Interruptor etiqueta="Ya está hecha" valor={b.hecha} alCambiar={(hecha) => cambiar({ hecha })} />
          ) : null}
        </>
      ) : (
        <>
          <View>
            <View style={estilos.fila}>
              <SelectorHora etiqueta="Empieza" valor={b.horaInicio} alCambiar={cambiarInicio} />
              <SelectorHora etiqueta="Termina" valor={b.horaFin} alCambiar={(horaFin) => cambiar({ horaFin })} />
            </View>
            <MensajeError texto={errores.horaFin} />
          </View>

          <Interruptor
            etiqueta="Bloque de foco"
            ayuda="Tiempo protegido para concentrarte. Te aviso si algo lo pisa."
            valor={b.foco}
            alCambiar={(foco) => cambiar({ foco })}
          />

          <Selector
            etiqueta="Repetición"
            opciones={OPCIONES_REPETICION}
            valor={b.repeticion}
            alCambiar={(repeticion) => cambiar({ repeticion })}
          />
        </>
      )}

      <View style={estilos.grupo}>
        <Selector
          etiqueta="Lugar (opcional)"
          opciones={opcionesLugar}
          valor={b.lugar}
          alCambiar={(lugar) => cambiar({ lugar })}
        />
        {b.lugar === 'otro' ? (
          <>
            <CampoTexto
              placeholder="Calle, número y municipio"
              value={b.direccion}
              onChangeText={(direccion) => cambiar({ direccion })}
              autoCapitalize="words"
              accessibilityLabel="Dirección"
              error={errores.direccion}
            />
            {usaOpenStreetMap ? (
              <Texto pequeno secundario>
                {ATRIBUCION_OPENSTREETMAP}
              </Texto>
            ) : null}
          </>
        ) : null}
      </View>

      <CampoTexto
        etiqueta="Notas (opcional)"
        placeholder="Lo que quieras recordar"
        value={b.notas}
        onChangeText={(notas) => cambiar({ notas })}
        multiline
        style={estilos.notas}
      />

      {focoPisado ? (
        <Tarjeta style={estilos.aviso} accessibilityLiveRegion="assertive">
          <Titulo nivel={3}>Esto pisa tu bloque de foco. ¿Seguro?</Titulo>
          <Texto secundario>
            «{focoPisado.bloque.titulo}», {rangoHoras(focoPisado.bloque)}.
          </Texto>
          <Boton titulo="Sí, guardar igualmente" disabled={ocupado} onPress={() => guardarDeVerdad(focoPisado.nuevo)} />
          <Boton variante="secundario" titulo="Cambiar la hora" onPress={() => setFocoPisado(null)} />
        </Tarjeta>
      ) : (
        <Boton
          titulo={ocupado ? 'Guardando…' : evento ? 'Guardar cambios' : `Guardar ${nombre}`}
          disabled={ocupado}
          onPress={guardar}
        />
      )}

      {evento ? (
        confirmarBorrado ? (
          <Tarjeta style={estilos.aviso}>
            <Titulo nivel={3}>¿Borrar «{evento.titulo}»?</Titulo>
            <Texto secundario>
              {evento.repeticion !== 'nunca'
                ? 'Se borran todas las repeticiones. No se puede deshacer.'
                : 'No se puede deshacer.'}
            </Texto>
            <Boton titulo="Sí, borrar" onPress={borrar} />
            <Boton variante="secundario" titulo="No, dejarlo" onPress={() => setConfirmarBorrado(false)} />
          </Tarjeta>
        ) : (
          <Boton
            variante="secundario"
            titulo={`Borrar ${nombre}`}
            onPress={() => {
              setConfirmarBorrado(true);
              setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
            }}
          />
        )
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
  pulsado: { opacity: 0.6 },
  fila: { flexDirection: 'row', gap: espacio.m },
  grupo: { gap: espacio.s },
  notas: { minHeight: 96, paddingTop: espacio.s, textAlignVertical: 'top' },
  aviso: { borderColor: colores.principal, borderWidth: 2, gap: espacio.m },
});
