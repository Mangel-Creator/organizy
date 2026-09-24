import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components';
import type { Evento } from '@/data/eventos';
import { usePerfil } from '@/data/perfil';
import { resolverLugar } from '@/services/agenda';
import { colorTipo, colores, espacio, radio } from '@/theme';

import { abrirEvento } from './textos';

type Props = {
  evento: Evento;
  pasado?: boolean; // ya ha terminado: sale más apagado
  focoEnNegro?: boolean; // en Semana, los bloques de foco van en negro con "Protegido"
};

// Un evento con hora fija: hora, punto del color de su tipo, título y lugar.
// Al pulsarlo se abre su ficha.
export function FilaEvento({ evento, pasado, focoEnNegro }: Props) {
  const { perfil } = usePerfil();
  const negro = focoEnNegro && evento.foco;
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
        negro && estilos.filaNegra,
        pasado && estilos.pasado,
        pressed && estilos.pulsado,
      ]}>
      <View style={estilos.horas}>
        <Texto fuerte style={negro && estilos.textoClaro}>
          {evento.horaInicio}
        </Texto>
        <Texto pequeno secundario style={negro && estilos.textoClaro}>
          {evento.horaFin}
        </Texto>
      </View>
      <View style={[estilos.punto, { backgroundColor: negro ? colores.fondo : colorTipo[evento.tipo] }]} />
      <View style={estilos.textos}>
        <Texto fuerte style={negro && estilos.textoClaro} numberOfLines={2}>
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
    minHeight: 64,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.normal,
  },
  filaNegra: { backgroundColor: colores.texto, borderColor: colores.texto },
  pasado: { opacity: 0.5 },
  pulsado: { opacity: 0.75 },
  horas: { width: 48 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  textos: { flex: 1, gap: 2 },
  textoClaro: { color: colores.fondo },
  protegido: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
});
