import { StyleSheet, View } from 'react-native';

import { Selector, SelectorDias, SelectorHora } from '@/components';
import { espacio } from '@/theme';

import { OPCIONES_ANTELACION, OPCIONES_MOMENTO, type Borrador, type Errores } from './borrador';
import { MensajeError } from './MensajeError';

type Props = {
  borrador: Borrador;
  cambiar: (cambios: Partial<Borrador>) => void;
  errores: Errores;
};

// Paso 2: horas de levantarse, acostarse y trabajo, días de trabajo, cuándo rindes más
// y con cuánta antelación avisar.
export function CamposRitmo({ borrador, cambiar, errores }: Props) {
  return (
    <>
      <View style={estilos.fila}>
        <SelectorHora
          etiqueta="Me levanto"
          valor={borrador.levantarse}
          alCambiar={(levantarse) => cambiar({ levantarse })}
        />
        <SelectorHora
          etiqueta="Me acuesto"
          valor={borrador.acostarse}
          alCambiar={(acostarse) => cambiar({ acostarse })}
        />
      </View>

      <View>
        <View style={estilos.fila}>
          <SelectorHora
            etiqueta="Empiezo a trabajar"
            valor={borrador.empiezoTrabajo}
            alCambiar={(empiezoTrabajo) => cambiar({ empiezoTrabajo })}
          />
          <SelectorHora
            etiqueta="Termino de trabajar"
            valor={borrador.terminoTrabajo}
            alCambiar={(terminoTrabajo) => cambiar({ terminoTrabajo })}
          />
        </View>
        <MensajeError texto={errores.terminoTrabajo} />
      </View>

      <SelectorDias
        etiqueta="¿Qué días trabajas?"
        valor={borrador.diasTrabajo}
        alCambiar={(diasTrabajo) => cambiar({ diasTrabajo })}
      />

      <View>
        <Selector
          etiqueta="¿Cuándo rindes más?"
          opciones={OPCIONES_MOMENTO}
          valor={borrador.rindeMas}
          alCambiar={(rindeMas) => cambiar({ rindeMas })}
        />
        <MensajeError texto={errores.rindeMas} />
      </View>

      <View>
        <Selector
          etiqueta="¿Con cuánta antelación te aviso?"
          opciones={OPCIONES_ANTELACION}
          valor={borrador.antelacion}
          alCambiar={(antelacion) => cambiar({ antelacion })}
        />
        <MensajeError texto={errores.antelacion} />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', gap: espacio.s },
});
