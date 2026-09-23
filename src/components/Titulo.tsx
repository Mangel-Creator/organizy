import { StyleSheet, Text, type TextProps } from 'react-native';

import { colores, fuentes, tamanos } from '@/theme';

type Props = TextProps & {
  nivel?: 1 | 2 | 3;
};

// Título con la letra Fraunces. Nivel 1 es el más grande.
export function Titulo({ nivel = 1, style, ...resto }: Props) {
  return (
    <Text
      accessibilityRole="header"
      style={[estilos.base, nivel === 1 ? estilos.n1 : nivel === 2 ? estilos.n2 : estilos.n3, style]}
      {...resto}
    />
  );
}

const estilos = StyleSheet.create({
  base: {
    color: colores.texto,
    fontFamily: fuentes.titulo,
  },
  n1: { fontSize: tamanos.tituloGrande, lineHeight: 40 },
  n2: { fontSize: tamanos.titulo, lineHeight: 32 },
  n3: { fontSize: tamanos.grande, lineHeight: 24 },
});
