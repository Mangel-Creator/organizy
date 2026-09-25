import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { textoHoras } from '@/services/epoca';
import { colores, espacio, radio } from '@/theme';

type Props = {
  etiqueta: string;
  hechoMin: number;
  totalMin: number;
};

// "Estadística · 6 h de 12 h" con una barra dorada debajo.
export function BarraHoras({ etiqueta, hechoMin, totalMin }: Props) {
  const proporcion = totalMin > 0 ? Math.min(hechoMin / totalMin, 1) : 0;
  return (
    <View
      style={estilos.contenedor}
      accessibilityRole="progressbar"
      accessibilityLabel={`${etiqueta}: ${textoHoras(hechoMin)} de ${textoHoras(totalMin)}`}>
      <View style={estilos.textos}>
        <Texto pequeno fuerte style={estilos.etiqueta} numberOfLines={1}>
          {etiqueta}
        </Texto>
        <Texto pequeno secundario>
          {textoHoras(hechoMin)} de {textoHoras(totalMin)}
        </Texto>
      </View>
      <View style={estilos.fondo}>
        <View style={[estilos.relleno, { width: `${proporcion * 100}%` }]} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  textos: { flexDirection: 'row', justifyContent: 'space-between', gap: espacio.s },
  etiqueta: { flex: 1 },
  fondo: { height: 8, borderRadius: radio.chip, backgroundColor: colores.borde, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: radio.chip, backgroundColor: colores.dorado },
});
