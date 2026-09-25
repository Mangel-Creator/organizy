import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, SelectorDias, SelectorHora, Tarjeta, Texto, Titulo } from '@/components';
import { nuevoIdEpoca, type Imprescindible } from '@/data/epocas';
import type { DiaSemana } from '@/data/perfil';
import { DIAS_SEMANA_LETRA, minutosDesdeHora } from '@/services/fechas';
import { alturaTactil, colores, espacio } from '@/theme';

import { MensajeError } from '../formulario-perfil/MensajeError';

type Props = {
  lista: Imprescindible[];
  alCambiar: (lista: Imprescindible[]) => void;
};

function textoDias(dias: DiaSemana[]): string {
  return dias.map((d) => DIAS_SEMANA_LETRA[d]).join(' ');
}

// Cosas que no quiere dejar de hacer (deporte, comer con la familia...): nombre,
// días y hora. Se respetan como eventos con hora fija. Se pueden añadir, editar y quitar.
export function EditorImprescindibles({ lista, alCambiar }: Props) {
  const [editando, setEditando] = useState<Imprescindible | null>(null);
  const [nombre, setNombre] = useState('');
  const [dias, setDias] = useState<DiaSemana[]>([]);
  const [inicio, setInicio] = useState('19:00');
  const [fin, setFin] = useState('20:00');
  const [error, setError] = useState<string | null>(null);

  const limpiar = () => {
    setEditando(null);
    setNombre('');
    setDias([]);
    setInicio('19:00');
    setFin('20:00');
    setError(null);
  };

  const editar = (i: Imprescindible) => {
    setEditando(i);
    setNombre(i.nombre);
    setDias(i.dias);
    setInicio(i.horaInicio);
    setFin(i.horaFin);
    setError(null);
  };

  const guardar = () => {
    if (!nombre.trim()) return setError('Ponle un nombre, por ejemplo «Gimnasio».');
    if (dias.length === 0) return setError('Elige al menos un día.');
    if (minutosDesdeHora(fin) <= minutosDesdeHora(inicio)) {
      return setError('La hora de terminar tiene que ser después de la de empezar.');
    }
    const nuevo: Imprescindible = {
      id: editando?.id ?? nuevoIdEpoca(),
      nombre: nombre.trim(),
      dias,
      horaInicio: inicio,
      horaFin: fin,
    };
    alCambiar(editando ? lista.map((i) => (i.id === editando.id ? nuevo : i)) : [...lista, nuevo]);
    limpiar();
  };

  return (
    <View style={estilos.seccion}>
      <View>
        <Titulo nivel={3}>Lo que no quieres dejar de hacer</Titulo>
        <Texto pequeno secundario>
          Opcional. Deporte, comer con tu familia... Lo respeto como algo con hora fija.
        </Texto>
      </View>

      {lista.map((i) => (
        <Tarjeta key={i.id} style={estilos.fila}>
          <View style={estilos.textos}>
            <Texto fuerte>{i.nombre}</Texto>
            <Texto pequeno secundario>
              {textoDias(i.dias)} · {i.horaInicio} – {i.horaFin}
            </Texto>
          </View>
          <BotonIcono icono="create-outline" etiqueta={`Editar ${i.nombre}`} alPulsar={() => editar(i)} />
          <BotonIcono
            icono="close"
            etiqueta={`Quitar ${i.nombre}`}
            alPulsar={() => {
              if (editando?.id === i.id) limpiar();
              alCambiar(lista.filter((x) => x.id !== i.id));
            }}
          />
        </Tarjeta>
      ))}

      <Tarjeta>
        {editando ? <Texto fuerte>Cambiando «{editando.nombre}»</Texto> : null}
        <CampoTexto
          etiqueta="¿Qué es?"
          placeholder="Gimnasio"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            setError(null);
          }}
          autoCapitalize="sentences"
        />
        <SelectorDias etiqueta="Qué días" valor={dias} alCambiar={(d) => setDias(d as DiaSemana[])} />
        <View style={estilos.horas}>
          <SelectorHora etiqueta="Empieza" valor={inicio} alCambiar={setInicio} />
          <SelectorHora etiqueta="Termina" valor={fin} alCambiar={setFin} />
        </View>
        <MensajeError texto={error} />
        <Boton variante="secundario" titulo={editando ? 'Guardar cambios' : 'Añadir'} onPress={guardar} />
        {editando ? <Boton variante="secundario" titulo="Cancelar" onPress={limpiar} /> : null}
      </Tarjeta>
    </View>
  );
}

type PropsIcono = {
  icono: 'create-outline' | 'close';
  etiqueta: string;
  alPulsar: () => void;
};

export function BotonIcono({ icono, etiqueta, alPulsar }: PropsIcono) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alPulsar}
      style={({ pressed }) => [estilos.icono, pressed && estilos.pulsado]}>
      <Ionicons name={icono} size={22} color={colores.textoSecundario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  textos: { flex: 1 },
  horas: { flexDirection: 'row', gap: espacio.m },
  icono: { width: alturaTactil, height: alturaTactil, alignItems: 'center', justifyContent: 'center' },
  pulsado: { transform: [{ scale: 0.94 }] },
});
