import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { cargarEventos } from '@/data/eventos';
import { cargarPerfil, usePerfil } from '@/data/perfil';
import { vigilarActualizacionesWeb } from '@/services/actualizacionWeb';
import { atenderRespuesta, escucharRespuestas, iniciarAvisos } from '@/services/avisos';
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
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  const { cargado: perfilCargado, bienvenidaCompletada } = usePerfil();
  const listo = (letrasListas || !!errorLetras) && perfilCargado;

  useEffect(() => {
    // Lee el perfil guardado y calcula las coordenadas que falten
    // (por ejemplo, si se rellenó sin conexión).
    cargarPerfil().then(() => completarCoordenadasPendientes());
    cargarEventos();
    // Programa los avisos de los próximos días y los mantiene al día (solo en el móvil).
    return iniciarAvisos();
  }, []);

  // En la web, recarga sola si se ha publicado una versión nueva.
  useEffect(() => vigilarActualizacionesWeb(), []);

  useEffect(() => {
    if (listo) {
      SplashScreen.hideAsync();
    }
  }, [listo]);

  // Al tocar un aviso (o uno de sus botones), abre la pantalla que corresponda.
  // Espera a que se vean las pestañas: antes no se puede navegar.
  useEffect(() => {
    if (!listo || !bienvenidaCompletada) return;
    return escucharRespuestas(async (respuesta) => {
      const destino = await atenderRespuesta(respuesta);
      if (destino.pantalla === 'evento') {
        router.push({ pathname: '/evento', params: { id: destino.id } });
      } else {
        router.navigate({
          pathname: '/',
          params: destino.movidas !== undefined ? { movidas: String(destino.movidas) } : {},
        });
      }
    });
  }, [listo, bienvenidaCompletada]);

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
          <Stack.Screen name="evento" />
        </Stack.Protected>
        <Stack.Protected guard={!bienvenidaCompletada}>
          <Stack.Screen name="bienvenida" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
