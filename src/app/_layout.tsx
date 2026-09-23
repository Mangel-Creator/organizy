import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold, Fraunces_700Bold, useFonts } from '@expo-google-fonts/fraunces';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { cargarPerfil, usePerfil } from '@/data/perfil';
import { completarCoordenadasPendientes } from '@/services/lugares';
import { colores } from '@/theme';

// Mantiene la pantalla de carga hasta que las letras estén listas.
SplashScreen.preventAutoHideAsync();

// Tema de navegación con nuestros colores (solo modo claro).
const temaNavegacion = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colores.principal,
    background: colores.fondo,
    card: colores.tarjeta,
    text: colores.texto,
    border: colores.borde,
  },
};

export default function LayoutRaiz() {
  const [letrasListas, errorLetras] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const { cargado: perfilCargado, bienvenidaCompletada } = usePerfil();
  const listo = (letrasListas || !!errorLetras) && perfilCargado;

  useEffect(() => {
    // Lee el perfil guardado y, en el móvil, calcula coordenadas que falten
    // (por ejemplo, si la bienvenida se rellenó desde el navegador).
    cargarPerfil().then(() => completarCoordenadasPendientes());
  }, []);

  useEffect(() => {
    if (listo) {
      SplashScreen.hideAsync();
    }
  }, [listo]);

  if (!listo) {
    return null;
  }

  // Hasta completar la bienvenida solo se puede ver esa pantalla. Al completarla,
  // "bienvenidaCompletada" pasa a true y la app salta sola a las pestañas.
  return (
    <ThemeProvider value={temaNavegacion}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
        <Stack.Protected guard={bienvenidaCompletada}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" />
        </Stack.Protected>
        <Stack.Protected guard={!bienvenidaCompletada}>
          <Stack.Screen name="bienvenida" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
