import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colores, fuentes } from '@/theme';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

function icono(nombre: NombreIcono, nombreActivo: NombreIcono) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? nombreActivo : nombre} size={size} color={color} />
  );
}

// Barra inferior con las 5 pestañas de Organizy.
export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.principal,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarStyle: {
          backgroundColor: colores.tarjeta,
          borderTopColor: colores.borde,
          minHeight: 60,
        },
        tabBarLabelStyle: { fontFamily: fuentes.textoMedio, fontSize: 12 },
        sceneStyle: { backgroundColor: colores.fondo },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoy', tabBarIcon: icono('today-outline', 'today') }}
      />
      <Tabs.Screen
        name="semana"
        options={{ title: 'Semana', tabBarIcon: icono('calendar-outline', 'calendar') }}
      />
      <Tabs.Screen
        name="planes"
        options={{ title: 'Planes', tabBarIcon: icono('people-outline', 'people') }}
      />
      <Tabs.Screen
        name="mapa"
        options={{ title: 'Mapa', tabBarIcon: icono('map-outline', 'map') }}
      />
      <Tabs.Screen
        name="alarmas"
        options={{ title: 'Alarmas', tabBarIcon: icono('alarm-outline', 'alarm') }}
      />
    </Tabs>
  );
}
