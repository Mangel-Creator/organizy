import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import { useDensidad } from '@/data/densidad';
import type { Evento } from '@/data/eventos';
import { usePerfil } from '@/data/perfil';
import { resolverLugar } from '@/services/agenda';
import { colorTipo, colores, espacio, fuentes } from '@/theme';

import { abrirEvento } from './textos';

type Props = {
  evento: Evento;
  pasado?: boolean; // ya ha terminado: sin fondo blanco y con el texto en gris
  focoEnNegro?: boolean; // en Semana, los bloques de foco van en negro con "Protegido"
};

// Un evento con hora fija: barra del color de su tipo, hora, título y lugar.
// Al pulsarlo se abre su ficha.
export function FilaEvento({ evento, pasado, focoEnNegro }: Props) {
  const { perfil } = usePerfil();
  const { medidas } = useDensidad();
  const textoFila = { fontSize: medidas.texto, lineHeight: medidas.interlineado };
  const negro = focoEnNegro && evento.foco;
  const apagado = pasado && !negro;
  const lugar = resolverLugar(evento.lugar, perfil);
  const detalle = [lugar?.nombre ?? lugar?.direccion, evento.foco && !negro ? 'Bloque de foco' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${evento.horaInicio}, ${evento.titulo}${negro ? ', protegido' : ''}`}
      onPress={() => abrirEvento(evento.id)}
      style={({ pressed }) => [
        estilos.fila,
        { minHeight: medidas.altoFila, paddingVertical: medidas.rellenoFila },
        { borderLeftColor: apagado ? colores.cargaNormal : colorTipo[evento.tipo] },
        negro && estilos.filaNegra,
        apagado && estilos.pasado,
        pressed && estilos.pulsado,
      ]}>
      <View style={estilos.horas}>
        <Texto style={[textoFila, estilos.hora, apagado && estilos.textoApagado, negro && estilos.textoClaro]}>
          {evento.horaInicio}
        </Texto>
        <Texto pequeno secundario style={[estilos.horaFin, negro && estilos.textoClaro]}>
          {evento.horaFin}
        </Texto>
      </View>
      <View style={estilos.textos}>
        <Texto
          fuerte
          style={[textoFila, apagado && estilos.textoApagado, negro && estilos.textoClaro]}
          numberOfLines={2}>
          {evento.titulo}
        </Texto>
        {negro ? (
          <View style={estilos.protegido}>
            <Ionicons name="lock-closed" size={13} color={colores.fondo} />
            <Texto pequeno style={estilos.textoClaro}>
              Protegido
            </Texto>
          </View>
        ) : null}
        {detalle ? (
          <Texto pequeno secundario style={negro && estilos.textoClaro} numberOfLines={1}>
            {detalle}
          </Texto>
        ) : null}
      </View>
      {evento.repeticion !== 'nunca' ? (
        <Ionicons name="repeat" size={16} color={negro ? colores.fondo : colores.textoSecundario} />
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.m,
    backgroundColor: colores.tarjeta,
    borderLeftWidth: 4, // barra del color de su tipo
  },
  filaNegra: { backgroundColor: colores.texto, borderLeftColor: colores.texto },
  // Sin opacidad: así el texto sigue pasando el contraste mínimo.
  pasado: { backgroundColor: 'transparent' },
  textoApagado: { color: colores.textoSecundario },
  pulsado: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  horas: { width: 48 },
  // Horas en letra de reloj: las cifras quedan alineadas de una fila a otra.
  hora: { fontFamily: fuentes.horaFuerte },
  horaFin: { fontFamily: fuentes.hora },
  textos: { flex: 1, gap: 2 },
  textoClaro: { color: colores.fondo },
  protegido: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
});
