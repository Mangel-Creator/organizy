import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { guardarAjuste, leerAjuste } from '@/data/ajustes';
import { alturaTactil, colores, espacio } from '@/theme';

import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

type Sistema = 'ios' | 'android';

const CLAVE_CERRADO = 'avisoPantallaInicioCerrado';

// ¿Se está viendo la web en el navegador de un móvil, sin haberla añadido
// a la pantalla de inicio? Devuelve el sistema o null si no hay que avisar.
function sistemaParaAvisar(): Sistema | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const yaInstalada =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (yaInstalada) return null;
  const agente = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(agente)) return 'ios';
  if (/Android/.test(agente)) return 'android';
  return null; // ordenador: no hace falta
}

const PASOS: Record<Sistema, string> = {
  ios: 'En Safari, toca el botón Compartir (el cuadrado con la flecha) y elige «Añadir a pantalla de inicio».',
  android: 'En Chrome, toca el menú ⋮ y elige «Añadir a pantalla de inicio» o «Instalar aplicación».',
};

// Aviso para la versión web: explica cómo añadir Organizy a la pantalla de inicio.
// Así se abre a pantalla completa y el navegador no borra los datos guardados.
export function AvisoPantallaInicio() {
  const [sistema, setSistema] = useState<Sistema | null>(null);

  useEffect(() => {
    const posible = sistemaParaAvisar();
    if (!posible) return;
    leerAjuste(CLAVE_CERRADO, false).then((cerrado) => {
      if (!cerrado) setSistema(posible);
    });
  }, []);

  if (!sistema) return null;

  const cerrar = () => {
    setSistema(null);
    guardarAjuste(CLAVE_CERRADO, true);
  };

  return (
    <Tarjeta>
      <View style={estilos.cabecera}>
        <Ionicons name="phone-portrait-outline" size={22} color={colores.principal} />
        <Texto fuerte style={estilos.titulo}>
          Añádela a tu pantalla de inicio
        </Texto>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          onPress={cerrar}
          style={({ pressed }) => [estilos.cerrar, pressed && estilos.pulsado]}>
          <Ionicons name="close" size={22} color={colores.textoSecundario} />
        </Pressable>
      </View>
      <Texto secundario>
        Se abrirá como una app y tus datos no se borrarán aunque pases días sin usarla.
      </Texto>
      <Texto pequeno>{PASOS[sistema]}</Texto>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  titulo: { flex: 1 },
  cerrar: {
    width: alturaTactil,
    height: alturaTactil,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -espacio.s,
    marginVertical: -espacio.s,
  },
  pulsado: { opacity: 0.6 },
});
