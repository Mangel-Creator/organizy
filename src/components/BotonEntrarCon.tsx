import { GoogleSans_500Medium } from '@expo-google-fonts/google-sans/500Medium';
import { useFonts } from 'expo-font';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { alturaTactil, coloresMarca, fuentes } from '@/theme';

// Botones "Continuar con Google" e "Iniciar sesión con Microsoft", hechos como piden
// sus normas de marca (si no, pueden rechazar la app al revisarla):
// - Google: la "G" de colores oficial sobre blanco, borde #747775, letra Google Sans
//   Medium 14/20 y 12 px a cada lado del logo. Nada de "G" de un solo color.
// - Microsoft: su logo de cuatro cuadrados sin cambiar, fondo blanco, borde #8C8C8C,
//   texto #5E5E5E de 15 px y esquinas rectas.
// Desactivado se ve como dice Google (todo al 38 %); por eso quien lo use debe explicar
// debajo, con texto normal, por qué no se puede pulsar.

export type ProveedorMarca = 'google' | 'microsoft';

const LOGO_GOOGLE = require('../../assets/images/marcas/google-g.svg');

// Logo de cada proveedor, sin tocar. La "G" siempre sobre fondo blanco.
export function LogoMarca({ proveedor, tamano = 20 }: { proveedor: ProveedorMarca; tamano?: number }) {
  if (proveedor === 'google') {
    // "eager": en la web, sin esperar a que el navegador decida que se ve (salía tarde).
    return (
      <Image
        source={LOGO_GOOGLE}
        style={{ width: tamano, height: tamano }}
        contentFit="contain"
        loading="eager"
        transition={0}
        accessible={false}
      />
    );
  }
  // Cuatro cuadrados de 10 con 1 de separación (a 21 px), como el oficial.
  const lado = (tamano - tamano / 21) / 2;
  const hueco = tamano / 21;
  return (
    <View style={{ width: tamano, height: tamano, flexDirection: 'row', flexWrap: 'wrap', gap: hueco }}>
      {[coloresMarca.microsoftRojo, coloresMarca.microsoftVerde, coloresMarca.microsoftAzul, coloresMarca.microsoftAmarillo].map(
        (color) => (
          <View key={color} style={{ width: lado, height: lado, backgroundColor: color }} />
        ),
      )}
    </View>
  );
}

type Props = {
  proveedor: ProveedorMarca;
  titulo: string;
  onPress: () => void;
  activo?: boolean;
  cargando?: boolean;
};

export function BotonEntrarCon({ proveedor, titulo, onPress, activo = true, cargando = false }: Props) {
  // La letra de Google solo se carga cuando sale su botón.
  const [letraGoogle] = useFonts({ GoogleSans_500Medium });
  const google = proveedor === 'google';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !activo, busy: cargando }}
      disabled={!activo || cargando}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        google ? estilos.google : estilos.microsoft,
        !activo && estilos.desactivado,
        pressed && estilos.pulsado,
      ]}>
      <LogoMarca proveedor={proveedor} tamano={google ? 20 : 21} />
      <Text
        style={[google ? estilos.textoGoogle : estilos.textoMicrosoft, google && letraGoogle && estilos.letraGoogle]}
        numberOfLines={1}>
        {titulo}
      </Text>
      {cargando ? <ActivityIndicator size="small" color={google ? coloresMarca.googleTexto : coloresMarca.microsoftTexto} /> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: alturaTactil,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  google: {
    gap: 10,
    borderRadius: 4,
    backgroundColor: coloresMarca.googleFondo,
    borderColor: coloresMarca.googleBorde,
  },
  microsoft: {
    gap: 12,
    borderRadius: 0,
    backgroundColor: coloresMarca.microsoftFondo,
    borderColor: coloresMarca.microsoftBorde,
  },
  textoGoogle: {
    color: coloresMarca.googleTexto,
    fontFamily: fuentes.textoMedio,
    fontSize: 14,
    lineHeight: 20,
  },
  letraGoogle: { fontFamily: 'GoogleSans_500Medium' },
  textoMicrosoft: {
    color: coloresMarca.microsoftTexto,
    fontFamily: fuentes.textoFuerte,
    fontSize: 15,
    lineHeight: 20,
  },
  desactivado: { opacity: 0.38 },
  pulsado: { transform: [{ scale: 0.98 }] },
});
