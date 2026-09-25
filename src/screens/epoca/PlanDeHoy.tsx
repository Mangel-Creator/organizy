import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Casilla, Tarjeta, Texto, Titulo } from '@/components';
import { marcarBloque, type Epoca, type RegistroBloque } from '@/data/epocas';
import type { Perfil } from '@/data/perfil';
import { resolverLugar, type Energia } from '@/services/agenda';
import {
  cuentaAtras,
  esDiaLibre,
  lugarDelDia,
  progresoHitos,
  progresoSemana,
  textoHoras,
  type BloquePlan,
  type PlanEpoca,
} from '@/services/epoca';
import { claveDia, horaDesdeMinutos, minutosDelDia } from '@/services/fechas';
import { alturaTactil, colores, espacio } from '@/theme';

import { BarraHoras } from './BarraHoras';

type Props = {
  epoca: Epoca;
  plan: PlanEpoca;
  registro: RegistroBloque[];
  perfil: Perfil | null;
  ahora: Date;
  energia: Energia;
};

// Lo que Hoy enseña durante una época dorada: cuenta atrás al siguiente hito,
// los bloques de hoy con sus descansos (con casilla y "Saltar"), avisos si algo
// ya no cabe y el progreso de la semana y de cada hito.
export function PlanDeHoy({ epoca, plan, registro, perfil, ahora, energia }: Props) {
  const hoy = claveDia(ahora);
  const minuto = minutosDelDia(ahora);
  const bloques = plan.bloques.filter((b) => b.dia === hoy);
  const siguiente = cuentaAtras(epoca, ahora);
  const lugar = resolverLugar(lugarDelDia(epoca, hoy), perfil);
  const nombreLugar = lugar ? (lugar.nombre ?? lugar.direccion) : null;
  const semana = progresoSemana(epoca, registro, plan, hoy);
  const hitos = progresoHitos(epoca, registro, plan).filter((p) => p.hito.fecha >= hoy);
  const nombreHito = (id: string) => epoca.hitos.find((h) => h.id === id)?.nombre ?? 'Estudio';

  return (
    <View style={estilos.contenedor}>
      {siguiente ? (
        <View style={estilos.cuenta}>
          <Ionicons name="hourglass-outline" size={20} color={colores.texto} />
          <Titulo nivel={3}>{siguiente.texto}</Titulo>
        </View>
      ) : null}

      <Titulo nivel={2} style={estilos.seccion}>
        Plan de hoy
      </Titulo>
      {energia === 'tranqui' && bloques.length > 0 ? (
        <Texto pequeno secundario>Hoy vas tranqui: el plan baja a la mitad y el resto pasa a otros días.</Texto>
      ) : null}
      {esDiaLibre(epoca, hoy) ? (
        <Texto secundario>Hoy es tu día libre. Descansar también es parte del plan.</Texto>
      ) : bloques.length === 0 ? (
        <Texto secundario>Hoy no hay bloques de estudio.</Texto>
      ) : (
        bloques.map((bloque) => (
          <FilaBloque
            key={bloque.id}
            bloque={bloque}
            titulo={nombreHito(bloque.hitoId)}
            lugar={nombreLugar}
            pasado={bloque.fin <= minuto}
          />
        ))
      )}

      {hitos
        .filter((p) => p.faltanMin > 0)
        .map((p) => (
          <Texto key={p.hito.id} pequeno fuerte style={estilos.aviso}>
            No caben {textoHoras(p.faltanMin)} de {p.hito.nombre} antes de su fecha. Sube las horas al día o
            quita algo del calendario.
          </Texto>
        ))}

      <Tarjeta style={estilos.progreso}>
        <BarraHoras etiqueta="Esta semana" hechoMin={semana.hechoMin} totalMin={semana.planeadoMin} />
        {hitos.map((p) => (
          <BarraHoras key={p.hito.id} etiqueta={p.hito.nombre} hechoMin={p.hechoMin} totalMin={p.totalMin} />
        ))}
      </Tarjeta>
    </View>
  );
}

type PropsFila = { bloque: BloquePlan; titulo: string; lugar: string | null; pasado: boolean };

function FilaBloque({ bloque, titulo, lugar, pasado }: PropsFila) {
  const descanso = bloque.descansoFin - bloque.fin;
  const saltado = bloque.estado === 'saltado';
  const detalle = saltado
    ? 'Saltado · sus horas pasan a otros días'
    : [`${horaDesdeMinutos(bloque.inicio)} – ${horaDesdeMinutos(bloque.fin)}`, lugar].filter(Boolean).join(' · ');
  const marcar = (estado: 'hecho' | 'saltado' | null) => marcarBloque(bloque, estado);

  return (
    <View style={estilos.bloqueYDescanso}>
      <View style={[estilos.bloque, (saltado || (pasado && bloque.estado === 'pendiente')) && estilos.apagado]}>
        <Casilla
          marcada={bloque.estado === 'hecho'}
          alCambiar={(hecho) => marcar(hecho ? 'hecho' : null)}
          etiqueta={`Marcar como hecho: ${titulo}, ${horaDesdeMinutos(bloque.inicio)}`}
        />
        <View style={estilos.textos}>
          <Texto fuerte style={[saltado && estilos.tachado, saltado && estilos.secundario]}>
            {titulo}
          </Texto>
          <Texto pequeno secundario>
            {detalle}
          </Texto>
        </View>
        {bloque.estado === 'pendiente' ? (
          <BotonTexto texto="Saltar" etiqueta={`Saltar el bloque de ${titulo}`} alPulsar={() => marcar('saltado')} />
        ) : saltado ? (
          <BotonTexto texto="Deshacer" etiqueta={`Deshacer: no saltar ${titulo}`} alPulsar={() => marcar(null)} />
        ) : null}
      </View>
      {descanso > 0 && !saltado ? (
        <Texto pequeno secundario style={estilos.descanso}>
          Descanso · {descanso} min ({horaDesdeMinutos(bloque.fin)} – {horaDesdeMinutos(bloque.descansoFin)})
        </Texto>
      ) : null}
    </View>
  );
}

function BotonTexto({ texto, etiqueta, alPulsar }: { texto: string; etiqueta: string; alPulsar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alPulsar}
      style={({ pressed }) => [estilos.botonTexto, pressed && estilos.pulsado]}>
      <Texto pequeno fuerte style={estilos.enlace}>
        {texto}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.s },
  cuenta: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  seccion: { marginTop: espacio.s },
  bloqueYDescanso: { gap: espacio.xs },
  bloque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: alturaTactil + 12,
    paddingRight: espacio.s,
    // Fila plana con la barra dorada, como las filas de eventos de Hoy.
    backgroundColor: colores.tarjeta,
    borderLeftWidth: 4,
    borderLeftColor: colores.dorado,
  },
  // Sin opacidad: sin fondo blanco y con texto secundario (ver CLAUDE.md > Diseño).
  apagado: { backgroundColor: 'transparent' },
  textos: { flex: 1, paddingVertical: espacio.xs },
  tachado: { textDecorationLine: 'line-through' },
  secundario: { color: colores.textoSecundario },
  descanso: { paddingLeft: alturaTactil + espacio.xs },
  aviso: { color: colores.aviso },
  progreso: { gap: espacio.m, marginTop: espacio.s },
  botonTexto: { minHeight: alturaTactil, paddingHorizontal: espacio.s, justifyContent: 'center' },
  enlace: { color: colores.principal },
  pulsado: { transform: [{ scale: 0.96 }] },
});
