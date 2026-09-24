import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colores, espacio } from '@/theme';

type Props = Omit<PressableProps, 'children'> & {
  etiqueta: string; // lo que lee el lector de pantalla, por ejemplo "Añadir evento"
};

const TAMANO = 60;

// Botón redondo naranja con un "+", fijo abajo a la derecha de la pantalla.
// Va dentro de un contenedor con flex: 1, al lado (no dentro) de <Pantalla>.
export function BotonFlotante({ etiqueta, style, ...resto }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={(estado) => [
        estilos.boton,
        estado.pressed && estilos.pulsado,
        typeof style === 'function' ? style(estado) : style,
      ]}
      {...resto}>
      <Ionicons name="add" size={32} color={colores.textoSobrePrincipal} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    position: 'absolute',
    right: espacio.l,
    bottom: espacio.l,
    width: TAMANO,
    height: TAMANO,
    borderRadius: TAMANO / 2,
    backgroundColor: colores.principal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colores.texto,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pulsado: { opacity: 0.85 },
});
