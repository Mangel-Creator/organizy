import { StyleSheet, View } from 'react-native';

import { SelectorVisual, Texto, type OpcionVisual } from '@/components';
import type { Cuadrante } from '@/data/eventos';
import { CUADRANTES, DATOS_CUADRANTE } from '@/services/agenda';
import { colores, espacio } from '@/theme';

// Las cuatro casillas de la matriz de Eisenhower, colocadas como la matriz: arriba lo
// importante, a la izquierda lo que corre prisa. La usan la ficha de la tarea y la
// vista "Matriz" de Hoy.

const ICONO: Record<Cuadrante, OpcionVisual<Cuadrante>['icono']> = {
  hazlo: 'flash-outline',
  planifica: 'calendar-outline',
  delega: 'arrow-redo-outline',
  elimina: 'trash-outline',
};

export const OPCIONES_CUADRANTE: OpcionVisual<Cuadrante>[] = CUADRANTES.map((c) => ({
  valor: c,
  etiqueta: DATOS_CUADRANTE[c].nombre,
  icono: ICONO[c],
}));

export function iconoCuadrante(c: Cuadrante) {
  return ICONO[c];
}

type Props = {
  valor: Cuadrante | null;
  // Al tocar otra vez la elegida se quita (null = sin clasificar).
  alCambiar: (valor: Cuadrante | null) => void;
  etiqueta?: string;
};

export function SelectorCuadrante({ valor, alCambiar, etiqueta }: Props) {
  const datos = valor ? DATOS_CUADRANTE[valor] : null;
  return (
    <View style={estilos.grupo}>
      <SelectorVisual
        etiqueta={etiqueta}
        opciones={OPCIONES_CUADRANTE}
        valor={valor}
        columnas={2}
        alCambiar={(nuevo) => alCambiar(nuevo === valor ? null : nuevo)}
      />
      <Texto pequeno secundario accessibilityLiveRegion="polite">
        {datos ? (
          <>
            <Texto pequeno fuerte style={valor === 'hazlo' ? estilos.urgente : estilos.nombre}>
              {datos.descripcion}.
            </Texto>{' '}
            {datos.consejo}
          </>
        ) : (
          'Arriba, lo importante; a la izquierda, lo que corre prisa. Si no eliges, se queda sin clasificar.'
        )}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espacio.s },
  nombre: { color: colores.texto },
  // "Hazlo ya" va en granate: es un aviso, como los días cargados.
  urgente: { color: colores.aviso },
});
