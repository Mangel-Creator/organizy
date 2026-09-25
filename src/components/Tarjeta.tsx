import { StyleSheet, View, type ViewProps } from 'react-native';

import { colores, espacio, radio } from '@/theme';

// Caja blanca y plana (sin borde) para agrupar contenido.
export function Tarjeta({ style, ...resto }: ViewProps) {
  return <View style={[estilos.tarjeta, style]} {...resto} />;
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.grande,
    padding: espacio.m,
    gap: espacio.s,
  },
});
