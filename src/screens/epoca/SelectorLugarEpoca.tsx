import { StyleSheet, View } from 'react-native';

import { CampoTexto, Selector, Texto, type Opcion } from '@/components';
import type { Perfil } from '@/data/perfil';
import { NOMBRE_CASA, resolverLugar } from '@/services/agenda';
import { ATRIBUCION_OPENSTREETMAP, usaOpenStreetMap } from '@/services/lugares';
import { espacio } from '@/theme';

import type { EleccionLugar } from './borrador';

type Props = {
  etiqueta: string;
  valor: EleccionLugar;
  alCambiar: (valor: EleccionLugar) => void;
  perfil: Perfil | null;
  direccion: string; // la dirección escrita si valor = "otro"
  alCambiarDireccion: (direccion: string) => void;
  error?: string | null;
  conNinguno?: boolean; // añade "Sin lugar" (para los hitos)
};

// Elige dónde: Casa, uno de los sitios habituales del perfil u "Otro sitio"
// con la dirección exacta (biblioteca, oficina...). Casa y los sitios se guardan
// como referencia al perfil, igual que en los eventos.
export function SelectorLugarEpoca({
  etiqueta,
  valor,
  alCambiar,
  perfil,
  direccion,
  alCambiarDireccion,
  error,
  conNinguno,
}: Props) {
  const opciones: Opcion<EleccionLugar>[] = [
    ...(conNinguno ? [{ valor: 'ninguno', etiqueta: 'Sin lugar' }] : []),
    { valor: 'casa', etiqueta: NOMBRE_CASA },
    ...(perfil?.sitios ?? []).map((s) => ({ valor: `sitio:${s.id}`, etiqueta: s.nombre })),
    { valor: 'otro', etiqueta: 'Otro sitio' },
  ];
  const elegido =
    valor === 'casa'
      ? resolverLugar({ tipo: 'casa' }, perfil)
      : valor.startsWith('sitio:')
        ? resolverLugar({ tipo: 'sitio', sitioId: valor.slice('sitio:'.length) }, perfil)
        : null;

  return (
    <View style={estilos.grupo}>
      <Selector etiqueta={etiqueta} opciones={opciones} valor={valor} alCambiar={alCambiar} />
      {elegido ? (
        <Texto pequeno secundario>
          {elegido.direccion}
        </Texto>
      ) : null}
      {valor === 'otro' ? (
        <>
          <CampoTexto
            placeholder="Biblioteca, calle, número y municipio"
            value={direccion}
            onChangeText={alCambiarDireccion}
            autoCapitalize="sentences"
            accessibilityLabel={`${etiqueta}: dirección exacta`}
            error={error}
          />
          {usaOpenStreetMap ? (
            <Texto pequeno secundario>
              {ATRIBUCION_OPENSTREETMAP}
            </Texto>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espacio.s },
});
