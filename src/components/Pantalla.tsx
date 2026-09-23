import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espacio } from '@/theme';

// Contenedor base de cada pantalla: fondo crema, márgenes y scroll.
export function Pantalla({ contentContainerStyle, ...resto }: ScrollViewProps) {
  return (
    <SafeAreaView style={estilos.seguro} edges={['top', 'left', 'right']}>
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={[estilos.contenido, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        {...resto}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  seguro: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flex: 1 },
  contenido: {
    paddingHorizontal: espacio.l,
    paddingTop: espacio.l,
    paddingBottom: espacio.xxl,
    gap: espacio.m,
  },
});
