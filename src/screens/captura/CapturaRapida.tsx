import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Texto, Titulo } from '@/components';
import type { Evento } from '@/data/eventos';
import { usePerfil } from '@/data/perfil';
import { MAX_FRASE, interpretarFrase, type Propuesta } from '@/services/captura';
import { dejarBorrador, type BorradorFicha } from '@/services/captura/borrador';
import { fechaDesdeClave, formatearDiaCorto, type ClaveDia } from '@/services/fechas';
import { alturaTactil, colores, espacio, fuentes, radio, tamanos } from '@/theme';

import { TarjetaConfirmacion } from './TarjetaConfirmacion';

// Captura rápida (fase 5): escribes (o dictas con el micrófono del teclado)
// «pádel con Javi el jueves a las 8» y la IA rellena el evento. Sale una tarjeta
// para confirmarlo: nada se guarda sin pulsar "Guardar". Si no hay conexión,
// algo falla o la IA no lo tiene claro, se abre la ficha normal con la frase
// como título.
//
// "accesorio" deja poner otro botón junto al de enviar (el micrófono de la fase 9).
// "plegada": en Hoy va escondida hasta que se toca el "+" (lo pidió el usuario para
// que Hoy respire). Sigue montada aunque no se vea, así que enviarFraseACaptura
// funciona igual: si llega una frase de fuera, se despliega sola mientras piensa.
// "alRellenarAMano" pone el enlace para abrir la ficha vacía.

type Props = { hoy: ClaveDia; accesorio?: ReactNode; plegada?: boolean; alRellenarAMano?: () => void };

// Para mandar una frase desde fuera (por ejemplo, la voz de la fase 9): la pone
// en el campo y la envía como si se hubiera escrito. Devuelve false si Hoy no
// está abierta.
let enviarDesdeFuera: ((frase: string) => void) | null = null;
export function enviarFraseACaptura(frase: string): boolean {
  if (!enviarDesdeFuera) return false;
  enviarDesdeFuera(frase);
  return true;
}

function abrirFicha(borrador: BorradorFicha, hoy: ClaveDia) {
  const propuesta = dejarBorrador(borrador);
  router.push({ pathname: '/evento', params: { fecha: borrador.fecha ?? hoy, propuesta } });
}

function textoGuardado(evento: Evento): string {
  const dia = formatearDiaCorto(fechaDesdeClave(evento.fecha)).toLocaleLowerCase('es-ES');
  const cuando = evento.horaInicio ? `${dia} a las ${evento.horaInicio}` : `${dia}, sin hora fija`;
  return `Apuntado: «${evento.titulo}», ${cuando}.`;
}

export function CapturaRapida({ hoy, accesorio, plegada = false, alRellenarAMano }: Props) {
  const { perfil } = usePerfil();
  const [frase, setFrase] = useState('');
  const [pensando, setPensando] = useState(false);
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const campo = useRef<TextInput>(null);

  const enviar = async (texto: string) => {
    const limpia = texto.trim();
    if (!limpia || pensando) return;
    setFrase(limpia);
    setHecho(null);
    setPropuesta(null);
    setPensando(true);
    campo.current?.blur();
    const resultado = await interpretarFrase(limpia, perfil);
    setPensando(false);
    if (resultado.estado === 'ok') {
      setPropuesta(resultado.propuesta);
      return;
    }
    // Sin conexión, error o poca confianza: la ficha normal con la frase como título.
    abrirFicha({ titulo: limpia.charAt(0).toLocaleUpperCase('es-ES') + limpia.slice(1), mensaje: resultado.mensaje }, hoy);
    setFrase('');
  };

  useEffect(() => {
    enviarDesdeFuera = (texto) => {
      setFrase(texto);
      enviar(texto);
    };
    return () => {
      enviarDesdeFuera = null;
    };
  });

  const terminar = (mensaje: string | null) => {
    setPropuesta(null);
    setFrase('');
    setHecho(mensaje);
  };

  const puedeEnviar = frase.trim().length > 0 && !pensando;

  // Plegada y sin nada en marcha: no enseña nada (pero sigue escuchando frases de fuera).
  if (plegada && !pensando && !propuesta && !hecho) return null;

  return (
    <View style={estilos.contenedor}>
      <Titulo nivel={3}>¿Qué apunto?</Titulo>
      <View style={estilos.fila}>
        <TextInput
          ref={campo}
          value={frase}
          onChangeText={(t) => {
            setFrase(t);
            setHecho(null);
          }}
          onSubmitEditing={() => enviar(frase)}
          placeholder="pádel con Javi el jueves a las 8"
          placeholderTextColor={colores.textoSecundario}
          accessibilityLabel="Captura rápida"
          accessibilityHint="Escribe o dicta lo que tienes que hacer y te preparo el evento."
          maxLength={MAX_FRASE}
          editable={!pensando}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          autoCapitalize="none"
          autoFocus={!plegada}
          style={estilos.campo}
        />
        {accesorio}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          accessibilityState={{ disabled: !puedeEnviar, busy: pensando }}
          disabled={!puedeEnviar}
          onPress={() => enviar(frase)}
          style={({ pressed }) => [
            estilos.enviar,
            !puedeEnviar && !pensando && estilos.enviarApagado,
            pressed && estilos.pulsado,
          ]}>
          {pensando ? (
            <ActivityIndicator color={colores.textoSobrePrincipal} />
          ) : (
            <Ionicons name="arrow-up" size={24} color={colores.textoSobrePrincipal} />
          )}
        </Pressable>
      </View>

      {pensando ? (
        <Texto pequeno secundario accessibilityLiveRegion="polite">
          Un segundo, lo estoy apuntando…
        </Texto>
      ) : hecho ? (
        <Texto pequeno accessibilityLiveRegion="polite">
          {hecho}
        </Texto>
      ) : !propuesta ? (
        <Texto pequeno secundario>Escríbelo como te salga, o díctalo con el micrófono del teclado.</Texto>
      ) : null}

      {alRellenarAMano && !propuesta && !pensando ? (
        <Pressable
          accessibilityRole="button"
          onPress={alRellenarAMano}
          style={({ pressed }) => [estilos.enlace, pressed && estilos.pulsado]}>
          <Ionicons name="create-outline" size={18} color={colores.principal} />
          <Texto fuerte style={estilos.textoEnlace}>
            Mejor lo relleno a mano
          </Texto>
        </Pressable>
      ) : null}

      {propuesta ? (
        <TarjetaConfirmacion
          key={`${propuesta.titulo}-${propuesta.fecha}-${propuesta.horaInicio}`}
          propuesta={propuesta}
          perfil={perfil}
          alGuardar={(evento) => terminar(textoGuardado(evento))}
          alCancelar={() => terminar(null)}
          alMasOpciones={(borrador) => {
            terminar(null);
            abrirFicha(borrador, hoy);
          }}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  campo: {
    flex: 1,
    minHeight: alturaTactil + 6,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radio.pequeno,
    paddingHorizontal: espacio.m,
    fontFamily: fuentes.texto,
    fontSize: tamanos.normal,
    color: colores.texto,
  },
  enviar: {
    width: alturaTactil + 6,
    height: alturaTactil + 6,
    borderRadius: radio.normal,
    backgroundColor: colores.principal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Apagado sin opacidad: el azul pasa a gris de borde, y el icono sigue viéndose.
  enviarApagado: { backgroundColor: colores.cargaNormal },
  pulsado: { transform: [{ scale: 0.94 }] },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, minHeight: alturaTactil, alignSelf: 'flex-start' },
  textoEnlace: { color: colores.principal },
});
