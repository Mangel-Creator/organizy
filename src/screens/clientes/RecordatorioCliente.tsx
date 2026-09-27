import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Boton, Tarjeta, Texto, Titulo } from '@/components';
import { guardarEvento, type DatosCliente, type Evento } from '@/data/eventos';
import type { Perfil } from '@/data/perfil';
import { olvidarEnvio, useRecordatorios } from '@/data/recordatorios';
import { avisosDisponibles } from '@/services/avisos';
import {
  claveEnvio,
  cuandoFue,
  proximaCita,
  recordatorioDe,
  telefonoWhatsapp,
  textoEstadoEnvio,
} from '@/services/clientes';
import { mandarRecordatorio } from '@/services/clientes/enviar';
import { fechaDesdeClave, minutosDesdeHora, sumarDias } from '@/services/fechas';
import { colores, espacio } from '@/theme';

import { useAhora } from '../calendario/useAhora';
import { BotonWhatsapp } from '../planes/piezas';

// Recordatorio por WhatsApp de una cita con un cliente (fase 10, parte A), en su ficha:
// cómo va ("Recordatorio enviado ayer a las 11:02"), el mensaje y el botón para
// mandarlo a mano. Usa la fecha y la hora guardadas de la cita y, del cliente, lo que
// haya ahora en la ficha (si ha cambiado, se guarda al enviar).

type Props = {
  evento: Evento; // la cita tal como está guardada
  cliente: DatosCliente; // lo que hay escrito en la ficha
  perfil: Perfil | null;
};

function mismoCliente(a: DatosCliente | null | undefined, b: DatosCliente): boolean {
  return !!a && a.nombre === b.nombre && a.telefono === b.telefono && a.acepta === b.acepta;
}

export function RecordatorioCliente({ evento, cliente, perfil }: Props) {
  const ahora = useAhora();
  const { ajustes, envios } = useRecordatorios();

  const proxima = proximaCita(evento, ahora);
  // Si la cita ya pasó (y no se repite), se enseña cómo fue su recordatorio.
  const dia = proxima ?? (evento.repeticion === 'nunca' ? evento.fecha : null);
  const clave = dia ? claveEnvio(evento.id, dia) : null;
  const envio = clave ? envios[clave] : undefined;
  const telefonoValido = telefonoWhatsapp(cliente.telefono) !== null;
  const recordatorio = proxima && telefonoValido ? recordatorioDe(evento, cliente, proxima, perfil, ahora) : null;

  // Cuándo llega el aviso del día antes, si aún no ha llegado.
  let proximoAviso: Date | null = null;
  if (proxima && avisosDisponibles && ajustes.activo) {
    const fecha = fechaDesdeClave(sumarDias(proxima, -1));
    const cuando = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, minutosDesdeHora(ajustes.hora));
    if (cuando > ahora) proximoAviso = cuando;
  }

  let estado: string;
  if (envio) estado = textoEstadoEnvio(envio, ahora);
  else if (!proxima) estado = 'Esta cita ya pasó.';
  else if (!cliente.acepta) estado = 'Sin su permiso no le mando nada. Marca «Acepta recordatorios por WhatsApp» si te ha dicho que sí.';
  else if (!cliente.telefono.trim()) estado = 'Pon su teléfono para poder recordárselo.';
  else if (!telefonoValido) estado = 'Revisa su teléfono para poder recordárselo.';
  else if (proximoAviso) estado = `Te aviso ${cuandoFue(proximoAviso, ahora)} para mandárselo.`;
  else estado = 'Aún no se lo has mandado.';

  const puedeEnviar = !!recordatorio && cliente.acepta;

  const enviar = async () => {
    if (!recordatorio || !clave) return;
    // Primero se abre WhatsApp (la web solo deja abrir otra pestaña justo al tocar).
    const abierto = mandarRecordatorio(clave, recordatorio.enlace);
    if (!mismoCliente(evento.cliente, cliente)) await guardarEvento({ ...evento, cliente });
    await abierto;
  };

  return (
    <Tarjeta style={estilos.caja}>
      <View style={estilos.cabecera}>
        <Ionicons
          name={envio?.estado === 'enviado' ? 'checkmark-done' : envio?.estado === 'fallido' ? 'alert-circle' : 'chatbubble-ellipses-outline'}
          size={22}
          color={envio?.estado === 'fallido' ? colores.aviso : colores.texto}
        />
        <Titulo nivel={3} style={estilos.flex}>
          Recordatorio por WhatsApp
        </Titulo>
      </View>
      <Texto
        fuerte={!!envio}
        style={envio?.estado === 'fallido' ? estilos.error : undefined}
        accessibilityLiveRegion="polite">
        {estado}
      </Texto>
      {puedeEnviar && recordatorio ? (
        <>
          <Texto pequeno secundario>
            «{recordatorio.texto}»
          </Texto>
          <BotonWhatsapp
            titulo={envio?.estado === 'enviado' ? 'Volver a enviarlo' : 'Enviar recordatorio por WhatsApp'}
            onPress={enviar}
          />
          <Texto pequeno secundario>
            Se abre su chat con el mensaje escrito. Lo envías tú.
          </Texto>
        </>
      ) : null}
      {envio?.estado === 'enviado' && clave && proxima ? (
        <Boton variante="secundario" titulo="No llegué a enviarlo" onPress={() => olvidarEnvio(clave)} />
      ) : null}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.s },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  flex: { flex: 1 },
  error: { color: colores.aviso },
});
