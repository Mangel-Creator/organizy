import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { alturaTactil, colores } from '@/theme';

type Props = {
  marcada: boolean;
  alCambiar: (marcada: boolean) => void;
  etiqueta: string; // para el lector de pantalla
};

// Casilla para marcar algo como hecho. Mide 44 px para pulsarla bien.
export function Casilla({ marcada, alCambiar, etiqueta }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: marcada }}
      onPress={() => alCambiar(!marcada)}
      style={({ pressed }) => [estilos.zona, pressed && estilos.pulsado]}>
      <View style={[estilos.caja, marcada && estilos.cajaMarcada]}>
        {marcada ? <Ionicons name="checkmark" size={18} color={colores.fondo} /> : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  zona: {
    width: alturaTactil,
    height: alturaTactil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caja: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colores.texto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaMarcada: { backgroundColor: colores.texto },
  pulsado: { opacity: 0.6 },
});
