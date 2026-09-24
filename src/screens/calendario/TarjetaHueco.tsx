import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import type { Intervalo } from '@/services/agenda';
import { formatearDuracion, horaDesdeMinutos } from '@/services/fechas';
import { colores, espacio, radio } from '@/theme';

// Hueco libre de 1 hora o más: tarjeta con borde discontinuo.
export function TarjetaHueco({ hueco }: { hueco: Intervalo }) {
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.horas}>
        <Texto pequeno secundario>
          {horaDesdeMinutos(hueco.inicio)}
        </Texto>
        <Texto pequeno secundario>
          {horaDesdeMinutos(hueco.fin)}
        </Texto>
      </View>
      <Texto fuerte style={estilos.texto}>
        Hueco libre · {formatearDuracion(hueco.fin - hueco.inicio)}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    minHeight: 56,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colores.cargaNormal,
    borderRadius: radio.normal,
  },
  horas: { width: 48 },
  texto: { flex: 1, color: colores.textoSecundario },
});
