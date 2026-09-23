import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BotonInicial, Pantalla, Tarjeta, Texto, Titulo } from '@/components';
import { usePerfil } from '@/data/perfil';
import { capitalizar, formatearFechaLarga, saludoSegunHora } from '@/services/fechas';
import { espacio } from '@/theme';

export function PantallaHoy() {
  const { perfil } = usePerfil();
  const ahora = new Date();
  const nombre = perfil?.nombre ?? '';
  const saludo = saludoSegunHora(ahora) + (nombre ? `, ${nombre}` : '');

  return (
    <Pantalla>
      <View style={estilos.cabecera}>
        <View style={estilos.textos}>
          <Texto secundario>{capitalizar(formatearFechaLarga(ahora))}</Texto>
          <Titulo>{saludo}</Titulo>
        </View>
        <BotonInicial nombre={nombre} onPress={() => router.push('/perfil')} />
      </View>
      <Tarjeta>
        <Texto>Aquí verás tu día. Próximamente.</Texto>
      </Tarjeta>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.m },
  textos: { flex: 1 },
});
