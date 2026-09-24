import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Boton, Pantalla, Selector, Texto, Titulo } from '@/components';
import { guardarDensidad, OPCIONES_DENSIDAD, useDensidad } from '@/data/densidad';
import { borrarEventosEjemplo, crearEventosEjemplo } from '@/data/eventos';
import { guardarPerfil, repetirBienvenida, usePerfil } from '@/data/perfil';
import {
  abrirAjustesDelTelefono,
  consultarPermiso,
  pedirPermiso,
  PERMISOS_DISPONIBLES,
  type EstadoPermiso,
  type Permiso,
} from '@/services/permisos';
import { alturaTactil, colores, espacio } from '@/theme';

import {
  borradorDesdePerfil,
  comprobarPaso1,
  comprobarPaso2,
  hayErrores,
  perfilDesdeBorrador,
  type Borrador,
  type Errores,
} from './formulario-perfil/borrador';
import { CamposRitmo } from './formulario-perfil/CamposRitmo';
import { CamposSobreTi } from './formulario-perfil/CamposSobreTi';
import { MensajeError } from './formulario-perfil/MensajeError';
import { TarjetaPermiso } from './formulario-perfil/permisos';
import { SeccionAvisos } from './perfil/SeccionAvisos';

type EstadosPermisos = Record<Permiso, EstadoPermiso | undefined>;

// Perfil: editar los datos de la bienvenida, activar permisos y repetir la bienvenida.
const EXPLICACION_DENSIDAD = {
  aire: 'Letra algo mayor y más espacio: unos 3 o 4 eventos por pantalla.',
  equilibrado: 'Unos 5 o 6 eventos por pantalla.',
  compacto: 'Más apretado para días llenos: 8 o más eventos por pantalla.',
} as const;

export function PantallaPerfil() {
  const { nivel: densidad } = useDensidad();
  const { perfil } = usePerfil();
  const [borrador, setBorrador] = useState<Borrador>(() => borradorDesdePerfil(perfil));
  const [errores, setErrores] = useState<Errores>({});
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [avisoEjemplos, setAvisoEjemplos] = useState<string | null>(null);
  const [permisos, setPermisos] = useState<EstadosPermisos>({
    ubicacion: undefined,
    notificaciones: undefined,
  });
  const scroll = useRef<ScrollView>(null);

  const leerPermisos = useCallback(async () => {
    const [ubicacion, notificaciones] = await Promise.all([
      consultarPermiso('ubicacion'),
      consultarPermiso('notificaciones'),
    ]);
    setPermisos({ ubicacion, notificaciones });
  }, []);

  // Relee los permisos al entrar y al volver de los Ajustes del teléfono.
  useFocusEffect(
    useCallback(() => {
      leerPermisos();
      const suscripcion = AppState.addEventListener('change', (estado) => {
        if (estado === 'active') leerPermisos();
      });
      return () => suscripcion.remove();
    }, [leerPermisos]),
  );

  const cambiar = (cambios: Partial<Borrador>) => {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setAviso(null);
    setErrores((actuales) => {
      const quedan = { ...actuales };
      for (const clave of Object.keys(cambios)) delete quedan[clave as keyof Borrador];
      return quedan;
    });
  };

  const guardar = async () => {
    setOcupado(true);
    const paso1 = await comprobarPaso1(borrador);
    const todos = { ...paso1.errores, ...comprobarPaso2(paso1.borrador) };
    setBorrador(paso1.borrador);
    setErrores(todos);
    if (hayErrores(todos)) {
      setOcupado(false);
      setAviso('Revisa los campos marcados en naranja.');
      return;
    }
    await guardarPerfil(perfilDesdeBorrador(paso1.borrador));
    setOcupado(false);
    setAviso('Cambios guardados.');
  };

  const activar = async (permiso: Permiso) => {
    if (permisos[permiso] === 'bloqueado') {
      await abrirAjustesDelTelefono();
      return;
    }
    const estado = await pedirPermiso(permiso);
    setPermisos((actuales) => ({ ...actuales, [permiso]: estado }));
  };

  return (
    <Pantalla ref={scroll}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={({ pressed }) => [estilos.volver, pressed && estilos.pulsado]}>
        <Ionicons name="chevron-back" size={24} color={colores.texto} />
        <Texto fuerte>Hoy</Texto>
      </Pressable>

      <Titulo>Perfil</Titulo>

      <Titulo nivel={2} style={estilos.seccion}>
        Sobre ti
      </Titulo>
      <CamposSobreTi borrador={borrador} cambiar={cambiar} errores={errores} />

      <Titulo nivel={2} style={estilos.seccion}>
        Tu ritmo
      </Titulo>
      <CamposRitmo borrador={borrador} cambiar={cambiar} errores={errores} />

      <View>
        <Boton
          titulo={ocupado ? 'Guardando…' : 'Guardar cambios'}
          disabled={ocupado}
          onPress={guardar}
        />
        {aviso === 'Cambios guardados.' ? (
          <Texto fuerte style={estilos.guardado} accessibilityLiveRegion="polite">
            {aviso}
          </Texto>
        ) : (
          <MensajeError texto={aviso} />
        )}
      </View>

      <Titulo nivel={2} style={estilos.seccion}>
        Cómo se ve
      </Titulo>
      <Selector
        etiqueta="Cuánto cabe en Hoy y en Semana"
        opciones={OPCIONES_DENSIDAD}
        valor={densidad}
        alCambiar={guardarDensidad}
      />
      <Texto pequeno secundario>
        {EXPLICACION_DENSIDAD[densidad]} Se aplica al momento.
      </Texto>

      <Titulo nivel={2} style={estilos.seccion}>
        Permisos
      </Titulo>
      {PERMISOS_DISPONIBLES.map((permiso) => (
        <TarjetaPermiso
          key={permiso}
          permiso={permiso}
          estado={permisos[permiso]}
          alActivar={() => activar(permiso)}
        />
      ))}

      <Titulo nivel={2} style={estilos.seccion}>
        Avisos
      </Titulo>
      <SeccionAvisos
        permiso={permisos.notificaciones}
        alActivarPermiso={() => activar('notificaciones')}
      />

      <Titulo nivel={2} style={estilos.seccion}>
        Pruebas
      </Titulo>
      <Texto secundario>
        Vuelve a mostrar el formulario de bienvenida. Tus datos se conservan.
      </Texto>
      <Boton variante="secundario" titulo="Repetir bienvenida" onPress={repetirBienvenida} />

      <Texto secundario style={estilos.separado}>
        Eventos de ejemplo para probar Hoy y Semana.
        {__DEV__ ? ' En modo desarrollo se crean solos la primera vez.' : ''} Tus eventos no se tocan.
      </Texto>
      <Boton
        variante="secundario"
        titulo="Crear eventos de ejemplo"
        onPress={async () => setAvisoEjemplos(`Creados ${await crearEventosEjemplo()} eventos de ejemplo.`)}
      />
      <Boton
        variante="secundario"
        titulo="Borrar eventos de ejemplo"
        onPress={async () => setAvisoEjemplos(`Borrados ${await borrarEventosEjemplo()} eventos de ejemplo.`)}
      />
      {avisoEjemplos ? (
        <Texto fuerte style={estilos.guardado} accessibilityLiveRegion="polite">
          {avisoEjemplos}
        </Texto>
      ) : null}
    </Pantalla>
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
  seccion: { marginTop: espacio.m },
  guardado: { color: colores.texto, marginTop: espacio.xs }, // el verde es solo de Amigos
  separado: { marginTop: espacio.s },
});
