import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Boton, Plegable, Tarjeta, Texto } from '@/components';
import { apuntarCopiaHecha, recuperarCopia, reunirDatos, useUltimaCopia } from '@/data/copia';
import { elegirArchivo, guardarArchivo, reiniciarApp } from '@/services/copia/archivo';
import {
  copiaAntigua,
  cuandoFueLaCopia,
  leerCopia,
  montarCopia,
  nombreArchivoCopia,
  resumenCopia,
  type CopiaSeguridad,
} from '@/services/copia/formato';
import { colores, espacio } from '@/theme';

import { MensajeError } from '../formulario-perfil/MensajeError';

const DONDE = [
  'En el iPhone: «Guardar en Archivos» y elige iCloud Drive. Así sigue ahí aunque pierdas el móvil.',
  'También puedes mandártela por correo o a tu propio chat de WhatsApp.',
  'En el ordenador se descarga en la carpeta Descargas.',
  'Lleva los teléfonos de tus clientes y tus direcciones: no la compartas con nadie.',
  'No lleva lo que se calcula solo (tráfico, horas de salida): se vuelve a calcular.',
];

const MENSAJE_GUARDADO: Record<string, string> = {
  compartido: 'Listo. Si la has guardado en Archivos o te la has mandado, ya la tienes a salvo.',
  descargado: 'Descargada. Guárdala en un sitio seguro (una carpeta en la nube, por ejemplo).',
};

// Perfil > Copia de seguridad: guardar todo en un archivo y recuperarlo en otro
// móvil o en la web. El archivo lo guarda la persona; no pasa por el servidor.
export function SeccionCopia() {
  const { cargada, ultima } = useUltimaCopia();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [propuesta, setPropuesta] = useState<CopiaSeguridad | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ahora = new Date();

  const guardar = async () => {
    setMensaje(null);
    setError(null);
    setPropuesta(null);
    try {
      const copia = montarCopia(await reunirDatos(), new Date());
      const resultado = await guardarArchivo(nombreArchivoCopia(new Date()), JSON.stringify(copia));
      if (resultado === 'no-disponible') {
        setError('Este dispositivo no deja compartir archivos.');
        return;
      }
      if (resultado === 'cancelado') return;
      await apuntarCopiaHecha(new Date());
      setMensaje(MENSAJE_GUARDADO[resultado]);
    } catch (e) {
      console.warn('No se pudo guardar la copia', e);
      setError('No he podido preparar la copia. Vuelve a probar.');
    }
  };

  const elegir = async () => {
    setMensaje(null);
    setError(null);
    setPropuesta(null);
    try {
      const texto = await elegirArchivo();
      if (texto === null) return;
      const lectura = leerCopia(texto);
      if (lectura.ok) setPropuesta(lectura.copia);
      else setError(lectura.error);
    } catch (e) {
      console.warn('No se pudo leer el archivo', e);
      setError('No he podido abrir ese archivo. Prueba con otro.');
    }
  };

  const recuperar = async () => {
    if (!propuesta) return;
    setOcupado(true);
    try {
      await recuperarCopia(propuesta);
      await reiniciarApp();
    } catch (e) {
      console.warn('No se pudo recuperar la copia', e);
      setOcupado(false);
      setError('No he podido recuperar la copia. Tus datos de antes siguen como estaban.');
    }
  };

  const resumen = propuesta ? resumenCopia(propuesta) : null;
  const antigua = cargada && copiaAntigua(ultima, ahora);

  return (
    <>
      <Texto secundario>
        Guarda todo lo tuyo en un archivo: eventos, tareas, épocas, alarmas, planes y tu perfil. Con él
        pasas tus cosas a otro móvil, o de la web a la app. El archivo es tuyo: no pasa por ningún
        servidor.
      </Texto>
      {cargada ? (
        <Texto fuerte={antigua} style={antigua ? estilos.avisoTexto : undefined}>
          {ultima
            ? `Última copia: ${cuandoFueLaCopia(ultima, ahora).toLowerCase()}.${antigua ? ' Toca hacer otra.' : ''}`
            : 'Aún no has guardado ninguna copia en este dispositivo.'}
        </Texto>
      ) : null}
      <Boton titulo="Guardar una copia" onPress={guardar} />
      {mensaje ? (
        <Texto fuerte accessibilityLiveRegion="polite">
          {mensaje}
        </Texto>
      ) : null}
      <Boton variante="secundario" titulo="Recuperar una copia" onPress={elegir} disabled={ocupado} />
      <MensajeError texto={error} />

      {resumen ? (
        <Tarjeta accessibilityLiveRegion="polite">
          <Texto fuerte>
            Copia del {resumen.creada}
            {resumen.nombre ? `, de ${resumen.nombre}` : ''}
          </Texto>
          <View style={estilos.lista}>
            {resumen.lineas.map((linea) => (
              <Texto key={linea} pequeno>
                · {linea}
              </Texto>
            ))}
          </View>
          <Texto fuerte style={estilos.avisoTexto}>
            Lo que hay ahora en {Platform.OS === 'web' ? 'esta web' : 'este móvil'} se cambia por lo de la
            copia y se pierde. Si quieres conservarlo, guarda antes una copia.
          </Texto>
          {resumen.planesAbiertos > 0 ? (
            <Texto pequeno secundario>
              Los votos de los planes abiertos solo se siguen viendo en el dispositivo donde los creaste.
            </Texto>
          ) : null}
          <Boton titulo={ocupado ? 'Recuperando…' : 'Sí, recuperar'} onPress={recuperar} disabled={ocupado} />
          <Boton variante="secundario" titulo="Cancelar" onPress={() => setPropuesta(null)} disabled={ocupado} />
        </Tarjeta>
      ) : null}

      <Plegable titulo="Dónde guardarla" resumen="iCloud Drive, tu correo o el ordenador">
        <View style={estilos.lista}>
          {DONDE.map((linea) => (
            <Texto key={linea} pequeno>
              · {linea}
            </Texto>
          ))}
        </View>
      </Plegable>
    </>
  );
}

const estilos = StyleSheet.create({
  avisoTexto: { color: colores.aviso },
  lista: { gap: espacio.s },
});
