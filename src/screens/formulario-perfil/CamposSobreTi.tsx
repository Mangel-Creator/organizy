import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Selector, Tarjeta, Texto, Titulo } from '@/components';
import type { SitioHabitual } from '@/data/perfil';
import {
  ATRIBUCION_OPENSTREETMAP,
  buscarCoordenadas,
  usaOpenStreetMap,
} from '@/services/lugares';
import { alturaTactil, colores, espacio } from '@/theme';

import {
  MENSAJE_NO_ENCONTRADO,
  OPCIONES_TRANSPORTE,
  OPCIONES_USO,
  type Borrador,
  type Errores,
} from './borrador';
import { MensajeError } from './MensajeError';

type Props = {
  borrador: Borrador;
  cambiar: (cambios: Partial<Borrador>) => void;
  errores: Errores;
};

// Paso 1: nombre, dónde vives, sitios habituales, cómo te mueves y para qué la usas.
export function CamposSobreTi({ borrador, cambiar, errores }: Props) {
  return (
    <>
      <CampoTexto
        etiqueta="¿Cómo te llamas?"
        placeholder="Tu nombre"
        value={borrador.nombre}
        onChangeText={(nombre) => cambiar({ nombre })}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
        returnKeyType="next"
        error={errores.nombre}
      />

      <CampoTexto
        etiqueta="¿Dónde vives?"
        placeholder="Municipio o barrio"
        value={borrador.vivienda.direccion}
        // Al cambiar el texto, las coordenadas anteriores ya no valen.
        onChangeText={(direccion) => cambiar({ vivienda: { direccion, coordenadas: null } })}
        autoCapitalize="words"
        returnKeyType="done"
        ayuda="Lo uso para calcular el tráfico y cuándo tienes que salir."
        error={errores.vivienda}
      />

      <SitiosHabituales
        sitios={borrador.sitios}
        alCambiar={(sitios) => cambiar({ sitios })}
      />

      <View>
        <Selector
          etiqueta="¿Cómo te mueves normalmente?"
          opciones={OPCIONES_TRANSPORTE}
          valor={borrador.transporte}
          alCambiar={(transporte) => cambiar({ transporte })}
        />
        <MensajeError texto={errores.transporte} />
      </View>

      <View>
        <Selector
          etiqueta="¿Para qué la vas a usar?"
          opciones={OPCIONES_USO}
          valor={borrador.uso}
          alCambiar={(uso) => cambiar({ uso })}
        />
        <MensajeError texto={errores.uso} />
      </View>
    </>
  );
}

type PropsSitios = {
  sitios: SitioHabitual[];
  alCambiar: (sitios: SitioHabitual[]) => void;
};

// Lista de sitios habituales: se pueden añadir, editar y quitar. Opcional.
// Al editar un sitio se conserva su id: los eventos que lo usan (ver
// data/eventos) pasan a apuntar solos a la dirección nueva.
function SitiosHabituales({ sitios, alCambiar }: PropsSitios) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [editando, setEditando] = useState<SitioHabitual | null>(null);

  const limpiar = () => {
    setNombre('');
    setDireccion('');
    setError(null);
    setEditando(null);
  };

  const empezarEdicion = (sitio: SitioHabitual) => {
    setEditando(sitio);
    setNombre(sitio.nombre);
    setDireccion(sitio.direccion);
    setError(null);
  };

  const anadir = async () => {
    if (!nombre.trim() || !direccion.trim()) {
      setError('Escribe el nombre del sitio y su dirección.');
      return;
    }
    // Si solo cambia el nombre, se conservan las coordenadas.
    const mismaDireccion = editando && editando.direccion === direccion.trim();
    let coordenadas = mismaDireccion ? editando.coordenadas : null;
    if (!mismaDireccion) {
      setBuscando(true);
      const resultado = await buscarCoordenadas(direccion.trim());
      setBuscando(false);
      if (resultado.estado === 'no-encontrado') {
        setError(MENSAJE_NO_ENCONTRADO);
        return;
      }
      coordenadas = resultado.estado === 'encontrado' ? resultado.coordenadas : null;
    }
    const sitio: SitioHabitual = {
      id: editando?.id ?? `${Date.now()}`,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      coordenadas,
    };
    alCambiar(editando ? sitios.map((s) => (s.id === editando.id ? sitio : s)) : [...sitios, sitio]);
    limpiar();
  };

  return (
    <View style={estilos.seccion}>
      <View>
        <Titulo nivel={3}>Tus sitios habituales</Titulo>
        <Texto pequeno secundario>
          Opcional. Por ejemplo: Trabajo, Gimnasio, Casa de mis padres.
        </Texto>
      </View>

      {sitios.map((sitio) => (
        <Tarjeta key={sitio.id} style={estilos.sitio}>
          <View style={estilos.sitioTexto}>
            <Texto fuerte>{sitio.nombre}</Texto>
            <Texto pequeno secundario>
              {sitio.direccion}
            </Texto>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${sitio.nombre}`}
            onPress={() => empezarEdicion(sitio)}
            style={({ pressed }) => [estilos.quitar, pressed && estilos.pulsado]}>
            <Ionicons name="create-outline" size={22} color={colores.textoSecundario} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${sitio.nombre}`}
            onPress={() => {
              if (editando?.id === sitio.id) limpiar();
              alCambiar(sitios.filter((s) => s.id !== sitio.id));
            }}
            style={({ pressed }) => [estilos.quitar, pressed && estilos.pulsado]}>
            <Ionicons name="close" size={22} color={colores.textoSecundario} />
          </Pressable>
        </Tarjeta>
      ))}

      <Tarjeta>
        {editando ? (
          <Texto fuerte>
            Editando «{editando.nombre}». Los eventos que lo usan se actualizan solos.
          </Texto>
        ) : null}
        <CampoTexto
          etiqueta="Nombre del sitio"
          placeholder="Trabajo"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            setError(null);
          }}
          autoCapitalize="sentences"
        />
        <CampoTexto
          etiqueta="Dirección"
          placeholder="Calle, número y municipio"
          value={direccion}
          onChangeText={(texto) => {
            setDireccion(texto);
            setError(null);
          }}
          onSubmitEditing={anadir}
          returnKeyType="done"
          error={error}
        />
        <Boton
          variante="secundario"
          titulo={buscando ? 'Buscando…' : editando ? 'Guardar sitio' : 'Añadir sitio'}
          disabled={buscando}
          onPress={anadir}
        />
        {editando ? <Boton variante="secundario" titulo="Cancelar" onPress={limpiar} /> : null}
        {usaOpenStreetMap ? (
          <Texto pequeno secundario>
            {ATRIBUCION_OPENSTREETMAP}
          </Texto>
        ) : null}
      </Tarjeta>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espacio.s },
  sitio: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  sitioTexto: { flex: 1 },
  quitar: {
    width: alturaTactil,
    height: alturaTactil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: { opacity: 0.6 },
});
