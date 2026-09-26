import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { alturaTactil, colores, espacio } from '@/theme';

import { Texto } from './Texto';

type Props = {
  titulo: string; // "Más ajustes"
  resumen?: string; // lo que ya está puesto, para no tener que abrirlo: "Te levantas a las 7:30 · de lunes a viernes"
  abierto?: boolean; // ábrelo desde fuera, por ejemplo si hay un error dentro
  children: ReactNode;
};

// Esconde lo opcional detrás de una fila que se toca para abrir. Así un formulario
// enseña solo lo importante (lo pidió el usuario: "mucho más cortos y visuales").
export function Plegable({ titulo, resumen, abierto, children }: Props) {
  const [abiertoAMano, setAbiertoAMano] = useState(false);
  const visible = abiertoAMano || !!abierto;

  return (
    <View style={estilos.contenedor}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: visible }}
        onPress={() => setAbiertoAMano((actual) => !actual)}
        style={({ pressed }) => [estilos.cabecera, pressed && estilos.pulsado]}>
        <View style={estilos.textos}>
          <Texto fuerte>{titulo}</Texto>
          {resumen && !visible ? (
            <Texto pequeno secundario numberOfLines={2}>
              {resumen}
            </Texto>
          ) : null}
        </View>
        <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={20} color={colores.texto} />
      </Pressable>
      {visible ? (
        <Animated.View entering={FadeIn.duration(160)} style={estilos.contenido}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.m },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    minHeight: alturaTactil + 8,
    paddingVertical: espacio.s,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  textos: { flex: 1, gap: 2 },
  pulsado: { opacity: 0.7 },
  contenido: { gap: espacio.m },
});
