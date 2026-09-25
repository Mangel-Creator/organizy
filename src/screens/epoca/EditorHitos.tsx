import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Selector,
  SelectorCantidad,
  SelectorFecha,
  SelectorHora,
  Tarjeta,
  Texto,
} from '@/components';
import { nuevoIdEpoca, type Dificultad, type Hito } from '@/data/epocas';
import type { Perfil } from '@/data/perfil';
import { resolverLugar } from '@/services/agenda';
import { fechaDesdeClave, formatearDiaCorto, type ClaveDia } from '@/services/fechas';
import { espacio } from '@/theme';

import { MensajeError } from '../formulario-perfil/MensajeError';
import { eleccionDesdeLugar, lugarDesdeEleccion, type EleccionLugar } from './borrador';
import { BotonIcono } from './EditorImprescindibles';
import { SelectorLugarEpoca } from './SelectorLugarEpoca';
import { formatoHoras, NOMBRE_DIFICULTAD, OPCIONES_DIFICULTAD } from './textos';

type Props = {
  hitos: Hito[];
  alCambiar: (hitos: Hito[]) => void;
  perfil: Perfil | null;
  inicio: ClaveDia; // fechas de la época: los hitos tienen que caer dentro
  fin: ClaveDia;
};

// Lista de hitos (exámenes o entregas): se pueden añadir, editar y quitar,
// también durante la época. Cada uno con fecha, hora, lugar, dificultad y horas
// de preparación.
export function EditorHitos({ hitos, alCambiar, perfil, inicio, fin }: Props) {
  const [editando, setEditando] = useState<Hito | null>(null);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState<ClaveDia>(fin);
  const [hora, setHora] = useState('09:00');
  const [lugar, setLugar] = useState<EleccionLugar>('ninguno');
  const [direccion, setDireccion] = useState('');
  const [dificultad, setDificultad] = useState<Dificultad>('media');
  const [horas, setHoras] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const limpiar = () => {
    setEditando(null);
    setNombre('');
    setFecha(fin);
    setHora('09:00');
    setLugar('ninguno');
    setDireccion('');
    setDificultad('media');
    setHoras(6);
    setError(null);
  };

  const editar = (h: Hito) => {
    setEditando(h);
    setNombre(h.nombre);
    setFecha(h.fecha);
    setHora(h.hora);
    setLugar(eleccionDesdeLugar(h.lugar));
    setDireccion(h.lugar?.tipo === 'otro' ? h.lugar.direccion : '');
    setDificultad(h.dificultad);
    setHoras(h.horasPreparacion);
    setError(null);
  };

  const guardar = async () => {
    if (!nombre.trim()) return setError('Escribe el nombre o la asignatura.');
    if (fecha < inicio || fecha > fin) return setError('La fecha tiene que caer dentro de la época.');
    if (lugar === 'otro' && !direccion.trim()) return setError('Escribe la dirección o elige otro lugar.');
    setOcupado(true);
    const resuelto = await lugarDesdeEleccion(lugar, direccion, editando?.lugar ?? null);
    setOcupado(false);
    if (typeof resuelto === 'string') return setError(resuelto);
    const nuevo: Hito = {
      id: editando?.id ?? nuevoIdEpoca(),
      nombre: nombre.trim(),
      fecha,
      hora,
      lugar: resuelto,
      dificultad,
      horasPreparacion: horas,
    };
    alCambiar(editando ? hitos.map((h) => (h.id === editando.id ? nuevo : h)) : [...hitos, nuevo]);
    limpiar();
  };

  const ordenados = [...hitos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

  return (
    <View style={estilos.seccion}>
      {ordenados.length === 0 ? (
        <Texto secundario>Aún no hay hitos. Añade tus exámenes o entregas para que prepare el plan.</Texto>
      ) : null}
      {ordenados.map((h) => {
        const sitio = resolverLugar(h.lugar, perfil);
        return (
          <Tarjeta key={h.id} style={estilos.fila}>
            <View style={estilos.textos}>
              <Texto fuerte>{h.nombre}</Texto>
              <Texto pequeno secundario>
                {formatearDiaCorto(fechaDesdeClave(h.fecha))} · {h.hora}
                {sitio ? ` · ${sitio.nombre ?? sitio.direccion}` : ''}
              </Texto>
              <Texto pequeno secundario>
                Dificultad {NOMBRE_DIFICULTAD[h.dificultad]} · {formatoHoras(h.horasPreparacion)} de preparación
              </Texto>
            </View>
            <BotonIcono icono="create-outline" etiqueta={`Editar ${h.nombre}`} alPulsar={() => editar(h)} />
            <BotonIcono
              icono="close"
              etiqueta={`Quitar ${h.nombre}`}
              alPulsar={() => {
                if (editando?.id === h.id) limpiar();
                alCambiar(hitos.filter((x) => x.id !== h.id));
              }}
            />
          </Tarjeta>
        );
      })}

      <Tarjeta style={estilos.formulario}>
        {editando ? <Texto fuerte>Cambiando «{editando.nombre}»</Texto> : <Texto fuerte>Nuevo hito</Texto>}
        <CampoTexto
          etiqueta="Nombre o asignatura"
          placeholder="Estadística"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            setError(null);
          }}
          autoCapitalize="sentences"
        />
        <SelectorFecha etiqueta="Fecha" valor={fecha} alCambiar={setFecha} />
        <SelectorHora etiqueta="Hora" valor={hora} alCambiar={setHora} />
        <SelectorLugarEpoca
          etiqueta="Lugar"
          valor={lugar}
          alCambiar={setLugar}
          perfil={perfil}
          direccion={direccion}
          alCambiarDireccion={setDireccion}
          conNinguno
        />
        <Selector etiqueta="Dificultad" opciones={OPCIONES_DIFICULTAD} valor={dificultad} alCambiar={setDificultad} />
        <SelectorCantidad
          etiqueta="Horas de preparación que calculas"
          valor={horas}
          alCambiar={setHoras}
          minimo={1}
          maximo={200}
          paso={1}
          formato={formatoHoras}
        />
        <MensajeError texto={error} />
        <Boton
          variante="secundario"
          titulo={ocupado ? 'Buscando la dirección…' : editando ? 'Guardar hito' : 'Añadir hito'}
          disabled={ocupado}
          onPress={guardar}
        />
        {editando ? <Boton variante="secundario" titulo="Cancelar" onPress={limpiar} /> : null}
      </Tarjeta>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  textos: { flex: 1 },
  formulario: { gap: espacio.m },
});
