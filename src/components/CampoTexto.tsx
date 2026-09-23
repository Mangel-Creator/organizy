import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { alturaTactil, colores, espacio, fuentes, radio, tamanos } from '@/theme';

type Props = TextInputProps & {
  etiqueta?: string;
  ayuda?: string;
};

// Campo para escribir texto, con etiqueta encima y ayuda opcional debajo.
export function CampoTexto({ etiqueta, ayuda, style, ...resto }: Props) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.textoSecundario}
        style={[estilos.campo, style]}
        {...resto}
      />
      {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  etiqueta: {
    fontFamily: fuentes.textoMedio,
    fontSize: tamanos.pequeno,
    color: colores.textoSecundario,
  },
  campo: {
    minHeight: alturaTactil + 6,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.pequeno,
    paddingHorizontal: espacio.m,
    fontFamily: fuentes.texto,
    fontSize: tamanos.normal,
    color: colores.texto,
  },
  ayuda: {
    fontFamily: fuentes.texto,
    fontSize: tamanos.pequeno,
    color: colores.textoSecundario,
  },
});
