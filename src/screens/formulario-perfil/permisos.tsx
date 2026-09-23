import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Tarjeta, Texto } from '@/components';
import type { EstadoPermiso, Permiso } from '@/services/permisos';
import { colores, espacio } from '@/theme';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

// Una frase por permiso explicando para qué sirve.
export const EXPLICACION_PERMISOS: Record<Permiso, { titulo: string; frase: string; icono: NombreIcono }> = {
  ubicacion: {
    titulo: 'Ubicación',
    frase: 'Para saber dónde estás, calcular el tráfico y avisarte de cuándo tienes que salir.',
    icono: 'navigate-outline',
  },
  notificaciones: {
    titulo: 'Notificaciones',
    frase: 'Para avisarte antes de tus citas y planes, aunque no tengas la app abierta.',
    icono: 'notifications-outline',
  },
};

const TEXTO_ESTADO: Record<EstadoPermiso, string> = {
  concedido: 'Activado',
  denegado: 'Desactivado',
  bloqueado: 'Desactivado en los Ajustes del teléfono',
  'sin-preguntar': 'Sin activar',
  'no-disponible': 'No disponible en este dispositivo',
};

type Props = {
  permiso: Permiso;
  estado?: EstadoPermiso; // si no se pasa, solo se muestra la explicación
  alActivar?: () => void;
};

// Tarjeta con el icono, el nombre del permiso, su explicación y, en Perfil,
// su estado y un botón para activarlo.
export function TarjetaPermiso({ permiso, estado, alActivar }: Props) {
  const info = EXPLICACION_PERMISOS[permiso];
  const sePuedeActivar = estado && estado !== 'concedido' && estado !== 'no-disponible';
  return (
    <Tarjeta>
      <View style={estilos.cabecera}>
        <Ionicons name={info.icono} size={24} color={colores.principal} />
        <Texto fuerte style={estilos.titulo}>
          {info.titulo}
        </Texto>
        {estado ? (
          <Texto pequeno secundario={estado !== 'concedido'} fuerte={estado === 'concedido'}>
            {TEXTO_ESTADO[estado]}
          </Texto>
        ) : null}
      </View>
      <Texto secundario>{info.frase}</Texto>
      {sePuedeActivar && alActivar ? (
        <Boton
          variante="secundario"
          titulo={estado === 'bloqueado' ? 'Abrir Ajustes del teléfono' : 'Activar'}
          onPress={alActivar}
        />
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  titulo: { flex: 1 },
});
