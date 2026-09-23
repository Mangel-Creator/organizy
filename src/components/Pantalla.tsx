import type { Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espacio } from '@/theme';

// Contenedor base de cada pantalla: fondo crema, márgenes y scroll.
// Se aparta del teclado para que no tape los campos.
export function Pantalla({
  contentContainerStyle,
  ref,
  ...resto
}: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  return (
    <SafeAreaView style={estilos.seguro} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={estilos.seguro}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView
          ref={ref}
          style={estilos.scroll}
          contentContainerStyle={[estilos.contenido, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          {...resto}
        />
      </KeyboardAvoidingView>
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
