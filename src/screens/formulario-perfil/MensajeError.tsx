import { StyleSheet } from 'react-native';

import { Texto } from '@/components';
import { colores, espacio } from '@/theme';

// Mensaje de error pequeño en naranja, debajo de un campo. No pinta nada si no hay texto.
export function MensajeError({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <Texto pequeno fuerte style={estilos.error} accessibilityLiveRegion="polite">
      {texto}
    </Texto>
  );
}

const estilos = StyleSheet.create({
  error: { color: colores.principal, marginTop: espacio.xs },
});
