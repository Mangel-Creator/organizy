import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Pantalla, SelectorVisual, Tarjeta, Texto, Titulo } from '@/components';
import { borrarServicio, guardarServicio, nuevoIdServicio, useServicios, type Servicio } from '@/data/servicios';
import { dejarBorrador } from '@/services/captura/borrador';
import { claveDia } from '@/services/fechas';
import {
  CATEGORIAS,
  datosCategoria,
  enlaceBusquedaBooksy,
  esBooksy,
  extraerEnlace,
  nombreDesdeEnlace,
  textoDonde,
  type CategoriaServicio,
} from '@/services/servicios';
import { alturaTactil, colorBaldosa, colores, espacio, radio } from '@/theme';

// Reservar servicios (/servicios, desde la casilla de Hoy): tus sitios de siempre
// (peluquería, barbería, uñas...) con su enlace de Booksy o de su web. Al tocar uno se
// abre su página para reservar y, al volver, se ofrece apuntar la cita en el calendario.

const abrir = (enlace: string) => Linking.openURL(enlace).catch(() => {});

export function PantallaServicios() {
  const { cargado, servicios } = useServicios();
  // null = nada abierto; 'nuevo' = añadiendo; si no, el id de la que se edita.
  const [editando, setEditando] = useState<string | null>(null);
  // La última tienda abierta: debajo sale "¿Ya tienes cita?".
  const [abierta, setAbierta] = useState<string | null>(null);

  const anadiendo = editando === 'nuevo' || (cargado && servicios.length === 0);

  const reservar = (s: Servicio) => {
    setAbierta(s.id);
    abrir(s.enlace);
  };

  return (
    <Pantalla>
      <BotonVolver />
      <Titulo>Reservar servicios</Titulo>
      <Texto secundario>
        Tus sitios de siempre, a un toque. La reserva la haces en Booksy o en la web de la tienda, y luego la apuntas
        aquí.
      </Texto>

      {!cargado ? null : (
        <View style={estilos.lista}>
          {servicios.map((s) =>
            editando === s.id ? (
              <Formulario key={s.id} inicial={s} alTerminar={() => setEditando(null)} />
            ) : (
              <View key={s.id}>
                <FilaServicio servicio={s} alReservar={() => reservar(s)} alEditar={() => setEditando(s.id)} />
                {abierta === s.id ? <ApuntarCita servicio={s} alCerrar={() => setAbierta(null)} /> : null}
              </View>
            ),
          )}
        </View>
      )}

      {!cargado ? null : anadiendo ? (
        <Formulario
          inicial={null}
          primero={servicios.length === 0}
          alTerminar={() => setEditando(null)}
        />
      ) : (
        <Boton variante="secundario" titulo="Añadir una tienda" onPress={() => setEditando('nuevo')} />
      )}
    </Pantalla>
  );
}

function BotonVolver() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [estilos.volver, pressed && estilos.pulsado]}>
      <Ionicons name="chevron-back" size={24} color={colores.texto} />
      <Texto fuerte>Hoy</Texto>
    </Pressable>
  );
}

function FilaServicio({
  servicio,
  alReservar,
  alEditar,
}: {
  servicio: Servicio;
  alReservar: () => void;
  alEditar: () => void;
}) {
  const categoria = datosCategoria(servicio.categoria);
  return (
    <View style={estilos.fila}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Reservar en ${servicio.nombre}. ${textoDonde(servicio.enlace)}`}
        onPress={alReservar}
        style={({ pressed }) => [estilos.filaPrincipal, pressed && estilos.pulsado]}>
        <View style={estilos.icono}>
          <Ionicons name={categoria.icono} size={22} color={colorBaldosa.neutro.icono} />
        </View>
        <View style={estilos.textosFila}>
          <Texto fuerte numberOfLines={2}>
            {servicio.nombre}
          </Texto>
          <Texto pequeno secundario numberOfLines={1}>
            {textoDonde(servicio.enlace)}
          </Texto>
        </View>
        <View style={estilos.reservar}>
          <Texto fuerte style={estilos.textoReservar}>
            Reservar
          </Texto>
          <Ionicons name="open-outline" size={16} color={colores.principal} />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cambiar ${servicio.nombre}`}
        onPress={alEditar}
        style={({ pressed }) => [estilos.editar, pressed && estilos.pulsado]}>
        <Ionicons name="pencil-outline" size={20} color={colores.textoSecundario} />
      </Pressable>
    </View>
  );
}

// Después de abrir la tienda: Booksy no le cuenta a Organizy si has reservado, así que
// se pregunta. "Apuntarla" abre la ficha de evento con el nombre ya puesto.
function ApuntarCita({ servicio, alCerrar }: { servicio: Servicio; alCerrar: () => void }) {
  const apuntar = () => {
    const hoy = claveDia(new Date());
    const propuesta = dejarBorrador({
      titulo: servicio.nombre,
      tipo: 'yo',
      mensaje: `Pon el día y la hora que te han dado en ${esBooksy(servicio.enlace) ? 'Booksy' : 'la tienda'}.`,
    });
    alCerrar();
    router.push({ pathname: '/evento', params: { fecha: hoy, propuesta } });
  };
  return (
    <View style={estilos.apuntar} accessibilityLiveRegion="polite">
      <Texto pequeno>¿Ya tienes cita? Apúntala para que te avise.</Texto>
      <View style={estilos.botones}>
        <Boton titulo="Apuntarla" onPress={apuntar} style={estilos.boton} />
        <Boton variante="secundario" titulo="Ahora no" onPress={alCerrar} style={estilos.boton} />
      </View>
    </View>
  );
}

const OPCIONES = CATEGORIAS.map(({ valor, etiqueta, icono }) => ({ valor, etiqueta, icono }));

function Formulario({
  inicial,
  primero = false,
  alTerminar,
}: {
  inicial: Servicio | null;
  primero?: boolean;
  alTerminar: () => void;
}) {
  const [categoria, setCategoria] = useState<CategoriaServicio>(inicial?.categoria ?? 'peluqueria');
  const [enlace, setEnlace] = useState(inicial?.enlace ?? '');
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [errores, setErrores] = useState<{ enlace?: string; nombre?: string }>({});

  // Si el enlace de Booksy lleva el nombre de la tienda, lo pone solo (se puede cambiar).
  const cambiarEnlace = (texto: string) => {
    setEnlace(texto);
    setErrores((e) => ({ ...e, enlace: undefined }));
    const limpio = extraerEnlace(texto);
    const sugerido = limpio ? nombreDesdeEnlace(limpio) : null;
    if (sugerido && !nombre.trim()) setNombre(sugerido);
  };

  const guardar = async () => {
    const limpio = extraerEnlace(enlace);
    const nombreFinal = nombre.trim() || (limpio ? nombreDesdeEnlace(limpio) : null) || '';
    const fallos = {
      enlace: limpio ? undefined : 'Pega el enlace de la tienda: empieza por https://',
      nombre: nombreFinal ? undefined : 'Ponle un nombre para reconocerla.',
    };
    setErrores(fallos);
    if (!limpio || !nombreFinal) return;
    await guardarServicio({ id: inicial?.id ?? nuevoIdServicio(), nombre: nombreFinal, categoria, enlace: limpio });
    alTerminar();
  };

  const quitar = async () => {
    if (inicial) await borrarServicio(inicial.id);
    alTerminar();
  };

  return (
    <Tarjeta style={estilos.formulario}>
      <Titulo nivel={3}>{inicial ? 'Cambiar la tienda' : primero ? 'Añade tu primera tienda' : 'Nueva tienda'}</Titulo>
      <SelectorVisual etiqueta="¿Qué es?" opciones={OPCIONES} valor={categoria} alCambiar={setCategoria} />

      <CampoTexto
        etiqueta="Enlace para reservar"
        ayuda="En Booksy, abre la tienda, toca Compartir y copia el enlace. También vale la web de reservas de la tienda."
        placeholder="https://booksy.com/es-es/…"
        value={enlace}
        onChangeText={cambiarEnlace}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={errores.enlace}
      />
      <Pressable
        accessibilityRole="link"
        onPress={() => abrir(enlaceBusquedaBooksy(categoria))}
        style={({ pressed }) => [estilos.buscar, pressed && estilos.pulsado]}>
        <Ionicons name="search-outline" size={18} color={colores.principal} />
        <Texto fuerte style={estilos.textoReservar}>
          {categoria === 'otro' ? 'Buscarla en Booksy' : `Buscar ${datosCategoria(categoria).etiqueta.toLowerCase()} en Booksy`}
        </Texto>
      </Pressable>

      <CampoTexto
        etiqueta="Nombre"
        placeholder="Peluquería Laura"
        value={nombre}
        onChangeText={(t) => {
          setNombre(t);
          setErrores((e) => ({ ...e, nombre: undefined }));
        }}
        error={errores.nombre}
      />

      <View style={estilos.botones}>
        <Boton titulo="Guardar" onPress={guardar} style={estilos.boton} />
        {primero ? null : (
          <Boton variante="secundario" titulo="Cancelar" onPress={alTerminar} style={estilos.boton} />
        )}
      </View>
      {inicial ? (
        <Pressable
          accessibilityRole="button"
          onPress={quitar}
          style={({ pressed }) => [estilos.quitar, pressed && estilos.pulsado]}>
          <Texto style={estilos.textoQuitar}>Quitar esta tienda</Texto>
        </Pressable>
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: alturaTactil,
    alignSelf: 'flex-start',
  },
  pulsado: { opacity: 0.8 },
  lista: { gap: espacio.s },
  // Fila plana, como las de eventos (sin barra de color: no es de ningún tipo).
  fila: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colores.tarjeta },
  filaPrincipal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    minHeight: 64,
    paddingLeft: espacio.m,
    paddingVertical: espacio.s,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radio.normal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorBaldosa.neutro.fondo,
  },
  textosFila: { flex: 1, gap: 2 },
  reservar: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  textoReservar: { color: colores.principal },
  editar: { width: alturaTactil + 4, alignItems: 'center', justifyContent: 'center' },
  apuntar: {
    gap: espacio.s,
    padding: espacio.m,
    backgroundColor: colores.tarjeta,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  botones: { flexDirection: 'row', gap: espacio.s },
  boton: { flex: 1 },
  formulario: { gap: espacio.m },
  buscar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: alturaTactil,
    alignSelf: 'flex-start',
  },
  quitar: { minHeight: alturaTactil, alignItems: 'center', justifyContent: 'center' },
  textoQuitar: { color: colores.aviso },
});
