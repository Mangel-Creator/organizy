import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Tarjeta, Texto } from '@/components';
import { colores } from '@/theme';

// Confirmación en Hoy tras pulsar "Sí, a mañana" en el aviso del cierre del día.
// La app llega a Hoy con ?movidas=N (ver services/avisos y app/_layout.tsx).
export function ConfirmacionMovidas() {
  const { movidas } = useLocalSearchParams<{ movidas?: string }>();
  if (movidas === undefined) return null;
  const n = Number(movidas);
  const texto =
    n === 0
      ? 'Ya no te quedaba nada pendiente.'
      : n === 1
        ? 'Hecho: he pasado 1 tarea a mañana.'
        : `Hecho: he pasado ${n} tareas a mañana.`;
  return (
    <Tarjeta accessibilityLiveRegion="polite">
      <Texto fuerte style={estilos.texto}>
        {texto}
      </Texto>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  texto: { color: colores.texto }, // el verde es solo de Amigos
});
