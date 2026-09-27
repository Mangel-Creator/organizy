import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Pantalla, Plegable, Tarjeta, Texto, Titulo } from '@/components';
import { useCorreos, type ConexionCorreo, type CorreoResumido } from '@/data/correos';
import {
  actualizarCorreos,
  conectarCorreo,
  desconectarCorreo,
  esPlazo,
  marcarCorreosVistos,
  ordenarCorreos,
  quitarPlazo,
  textoGrupo,
  textoVence,
} from '@/services/correo';
import { claveDia, formatearHora } from '@/services/fechas';
import { alturaTactil, colorTipo, colores, espacio, fuentes, radio } from '@/theme';

// Resúmenes de correo (fase 11): /resumenes, desde la casilla de Hoy o al tocar un
// aviso de correo. Arriba, lo que tiene fecha límite (ya está en las tareas); debajo,
// el resto de correos resumidos, por día. Sin conectar, explica cómo hacerlo.

const diaDe = (iso: string) => claveDia(new Date(iso));

export function PantallaResumenes() {
  const { cargado, conexion, correos } = useCorreos();
  const [actualizando, setActualizando] = useState(false);

  // Al entrar, trae lo nuevo. Los nuevos salen marcados mientras estás aquí y pasan
  // a vistos al salir.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      setActualizando(true);
      actualizarCorreos()
        .catch(() => {})
        .finally(() => vigente && setActualizando(false));
      return () => {
        vigente = false;
        marcarCorreosVistos().catch(() => {});
      };
    }, []),
  );

  const hoy = claveDia(new Date());
  const { plazos, grupos } = ordenarCorreos(correos, hoy, diaDe);

  return (
    <Pantalla>
      <BotonVolver />
      <Titulo>Resúmenes</Titulo>

      {!cargado ? null : !conexion ? (
        <Conectar />
      ) : (
        <>
          <EstadoConexion conexion={conexion} actualizando={actualizando} />

          {correos.length === 0 ? (
            <View style={estilos.vacio}>
              <Ionicons name="mail-open-outline" size={48} color={colores.textoSecundario} />
              <Texto secundario style={estilos.centrado}>
                Nada nuevo en tu correo. Cuando llegue algo a Principal, lo verás aquí resumido.
              </Texto>
            </View>
          ) : null}

          {plazos.length > 0 ? (
            <View style={estilos.seccion}>
              <Titulo nivel={3}>Con fecha límite</Titulo>
              <Texto pequeno secundario>
                Ya están en tus tareas, el día que vencen.
              </Texto>
              {plazos.map((c) => (
                <FilaCorreo key={c.id} correo={c} hoy={hoy} nuevo={!c.visto} />
              ))}
            </View>
          ) : null}

          {grupos.map((grupo) => (
            <View key={grupo.dia} style={estilos.seccion}>
              <Titulo nivel={3}>{textoGrupo(grupo.dia, hoy)}</Titulo>
              {grupo.correos.map((c) => (
                <FilaCorreo key={c.id} correo={c} hoy={hoy} nuevo={!c.visto} />
              ))}
            </View>
          ))}

          <Plegable titulo="Más ajustes" resumen="Otras cuentas y desconectar">
            <Texto pequeno secundario>
              Para ver aquí los correos de iCloud, Outlook o el trabajo, haz que se reenvíen solos a este Gmail. Los
              pasos están en tu guía «Fase 11 - Correo».
            </Texto>
            <Boton
              variante="secundario"
              titulo="Desconectar Gmail"
              onPress={() => desconectarCorreo().catch(() => {})}
            />
            <Texto pequeno secundario>
              Borra los resúmenes de este móvil (las tareas se quedan). Para que el ayudante deje de mirar tu correo,
              ejecuta «desinstalar» en script.google.com.
            </Texto>
          </Plegable>
        </>
      )}
    </Pantalla>
  );
}

function BotonVolver() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      style={({ pressed }) => [estilos.volver, pressed && estilos.pulsado]}>
      <Ionicons name="chevron-back" size={24} color={colores.texto} />
      <Texto fuerte>Hoy</Texto>
    </Pressable>
  );
}

function hace(iso: string | null): string | null {
  if (!iso) return null;
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const fecha = new Date(iso);
  return claveDia(fecha) === claveDia(new Date()) ? `a las ${formatearHora(fecha)}` : 'hace más de un día';
}

function EstadoConexion({ conexion, actualizando }: { conexion: ConexionCorreo; actualizando: boolean }) {
  const revisado = hace(conexion.ultimaRevision);
  let texto = revisado ? `Tu Gmail se revisó ${revisado}. Cada 10 min mira si hay algo nuevo.` : 'Conectado a tu Gmail.';
  if (actualizando) texto = 'Mirando si hay algo nuevo…';
  else if (conexion.error === 'sin-conexion') texto = 'Sin conexión: te enseño lo último que traje.';
  else if (conexion.error === 'no-responde') texto = 'El ayudante de Gmail no responde. Si sigue así, revisa en script.google.com que está implementado.';
  return (
    <View style={estilos.estado} accessibilityLiveRegion="polite">
      <Texto pequeno secundario style={conexion.error && !actualizando ? estilos.aviso : undefined}>
        {texto}
      </Texto>
      {Platform.OS === 'web' ? (
        <Texto pequeno secundario>
          En la web no llegan avisos: los correos nuevos salen marcados aquí.
        </Texto>
      ) : null}
    </View>
  );
}

function FilaCorreo({ correo, hoy, nuevo }: { correo: CorreoResumido; hoy: string; nuevo: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const plazo = esPlazo(correo) ? correo.fechaLimite : null;
  const hora = formatearHora(new Date(correo.recibido));
  return (
    <View style={[estilos.fila, plazo && estilos.filaPlazo]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        accessibilityLabel={[
          nuevo ? 'Nuevo.' : '',
          `${correo.titulo}.`,
          `De ${correo.de}, a las ${hora}.`,
          plazo ? `${textoVence(plazo, hoy)}.` : '',
          abierta ? '' : correo.resumen,
        ].join(' ')}
        onPress={() => setAbierta((a) => !a)}
        style={({ pressed }) => [estilos.cabeceraFila, pressed && estilos.pulsado]}>
        <View style={estilos.lineaDe}>
          <Texto pequeno secundario numberOfLines={1} style={estilos.de}>
            {correo.de}
          </Texto>
          {nuevo ? (
            <View style={estilos.nuevo}>
              <Texto pequeno fuerte style={estilos.textoNuevo}>
                Nuevo
              </Texto>
            </View>
          ) : null}
          <Texto pequeno secundario style={estilos.hora}>
            {hora}
          </Texto>
        </View>
        <Texto fuerte numberOfLines={abierta ? undefined : 2}>
          {correo.titulo}
        </Texto>
        {plazo ? (
          <Texto pequeno fuerte style={plazo <= hoy ? estilos.aviso : undefined}>
            {textoVence(plazo, hoy)}
            {correo.tarea && correo.tarea !== correo.titulo ? ` · ${correo.tarea}` : ''}
          </Texto>
        ) : null}
        {correo.resumen ? (
          <Texto pequeno secundario numberOfLines={abierta ? undefined : 3}>
            {correo.resumen}
          </Texto>
        ) : null}
      </Pressable>
      {abierta ? (
        <View style={estilos.acciones}>
          {correo.enlace ? (
            <Boton
              variante="secundario"
              titulo="Abrir en Gmail"
              onPress={() => Linking.openURL(correo.enlace).catch(() => {})}
            />
          ) : null}
          {plazo && correo.eventoId ? (
            <Boton
              variante="secundario"
              titulo="Ver la tarea"
              onPress={() => router.push({ pathname: '/evento', params: { id: correo.eventoId ?? '' } })}
            />
          ) : null}
          {plazo ? (
            <Boton variante="secundario" titulo="No es un plazo" onPress={() => quitarPlazo(correo.id).catch(() => {})} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Conectar() {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);

  const conectar = async () => {
    setConectando(true);
    setError(null);
    const resultado = await conectarCorreo(texto).catch(() => ({ ok: false as const, motivo: 'no-responde' as const }));
    setConectando(false);
    if (resultado.ok) return;
    setError(
      resultado.motivo === 'enlace'
        ? 'Eso no parece el enlace del ayudante. Empieza por https://script.google.com/macros/s/ y acaba en /exec.'
        : resultado.motivo === 'sin-conexion'
          ? 'Sin conexión. Prueba otra vez cuando tengas internet.'
          : 'El ayudante no responde. Revisa que lo implementaste como «Aplicación web» con acceso para «Cualquier usuario».',
    );
  };

  return (
    <Tarjeta style={estilos.conectar}>
      <View style={estilos.icono}>
        <Ionicons name="mail-outline" size={28} color={colores.texto} />
      </View>
      <Titulo nivel={2}>Conecta tu Gmail</Titulo>
      <Texto secundario>
        Te aviso de cada correo nuevo con un resumen, y lo que tenga fecha límite te lo apunto en las tareas.
      </Texto>
      <Texto pequeno secundario>
        Lo hace un ayudante que vive en tu propia cuenta de Google: tus correos no pasan por Organizy. Se monta una vez,
        en unos 15 minutos, con la guía «Fase 11 - Correo».
      </Texto>
      <CampoTexto
        etiqueta="Enlace del ayudante"
        ayuda="La URL de la «Aplicación web» que te da Google al implementarlo."
        placeholder="https://script.google.com/macros/s/…/exec"
        value={texto}
        onChangeText={setTexto}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={error}
      />
      <Boton titulo={conectando ? 'Conectando…' : 'Conectar'} onPress={conectar} disabled={conectando || !texto.trim()} />
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  volver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    minHeight: alturaTactil,
    alignSelf: 'flex-start',
  },
  pulsado: { opacity: 0.8 },
  vacio: { alignItems: 'center', gap: espacio.m, paddingVertical: espacio.xl, paddingHorizontal: espacio.l },
  centrado: { textAlign: 'center' },
  estado: { gap: espacio.xs },
  aviso: { color: colores.aviso },
  seccion: { gap: espacio.s, marginTop: espacio.s },
  fila: { backgroundColor: colores.tarjeta },
  // Los plazos son tareas tuyas: barra del color de "Yo".
  filaPlazo: { borderLeftWidth: 4, borderLeftColor: colorTipo.yo },
  cabeceraFila: { gap: 2, minHeight: alturaTactil, paddingHorizontal: espacio.m, paddingVertical: espacio.s },
  lineaDe: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  de: { flexShrink: 1 },
  hora: { marginLeft: 'auto', fontFamily: fuentes.hora },
  nuevo: {
    paddingHorizontal: espacio.s,
    paddingVertical: 1,
    borderRadius: radio.chip,
    backgroundColor: colores.principal,
  },
  textoNuevo: { color: colores.textoSobrePrincipal },
  acciones: { gap: espacio.s, paddingHorizontal: espacio.m, paddingBottom: espacio.m },
  conectar: { gap: espacio.m },
  icono: {
    width: 48,
    height: 48,
    borderRadius: radio.normal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.fondo,
  },
});
