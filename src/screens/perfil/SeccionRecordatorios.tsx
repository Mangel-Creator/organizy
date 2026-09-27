import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Interruptor, Plegable, SelectorHora, Texto } from '@/components';
import { cambiarAjustesRecordatorios, useRecordatorios } from '@/data/recordatorios';
import { avisosDisponibles, probarRecordatorioCliente } from '@/services/avisos';
import type { EstadoPermiso } from '@/services/permisos';
import { colores, espacio } from '@/theme';

type Props = {
  permiso?: EstadoPermiso; // permiso de notificaciones
  alActivarPermiso: () => void;
};

// Lo básico del RGPD al guardar teléfonos de clientes (pedido en la fase 10).
const RGPD = [
  'Guarda solo lo que necesitas: nombre y teléfono, para recordarle la cita.',
  'Mándale recordatorios solo si te ha dicho que sí (la casilla de la cita). Si lo retira, desmárcala.',
  'Si te pide ver, corregir o borrar sus datos, hazlo: están en la ficha de sus citas.',
  'Aquí se quedan en tu móvil y no se envían a ningún servidor. Protege el móvil con código.',
  'Si tienes un negocio, cuéntalo en tu información de privacidad (quién eres, para qué y cuánto tiempo los guardas).',
];

// Perfil > Recordatorios a clientes (fase 10): el interruptor general y la hora del
// aviso del día antes. En la web no hay avisos: se explica que queda el botón de la ficha.
export function SeccionRecordatorios({ permiso, alActivarPermiso }: Props) {
  const { ajustes } = useRecordatorios();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const probar = async () => {
    if (permiso !== 'concedido') {
      alActivarPermiso();
      return;
    }
    const hay = await probarRecordatorioCliente();
    setMensaje(
      hay
        ? 'Listo. Te llegará en 5 segundos, como el día antes de la cita.'
        : 'Primero guarda una cita de Clientes con su teléfono y la casilla «Acepta recordatorios» marcada.',
    );
  };

  return (
    <>
      <Texto secundario>
        El día antes de cada cita con un cliente que lo haya aceptado, le recuerdas la cita por
        WhatsApp con el mensaje ya escrito. Lo envías tú, desde tu WhatsApp: gratis.
      </Texto>
      {avisosDisponibles ? (
        <>
          <Interruptor
            etiqueta="Avisarme para recordárselo"
            ayuda="Un aviso con el botón «Enviar por WhatsApp», que abre su chat. Si lo apagas, sigue el botón de la ficha de cada cita."
            valor={ajustes.activo}
            alCambiar={(activo) => cambiarAjustesRecordatorios({ activo })}
          />
          {ajustes.activo ? (
            <SelectorHora
              etiqueta="A qué hora, el día antes"
              valor={ajustes.hora}
              alCambiar={(hora) => cambiarAjustesRecordatorios({ hora })}
            />
          ) : null}
          <Boton variante="secundario" titulo="Probar el recordatorio a un cliente" onPress={probar} />
          {mensaje ? (
            <Texto fuerte style={estilos.mensaje} accessibilityLiveRegion="polite">
              {mensaje}
            </Texto>
          ) : null}
        </>
      ) : (
        <Texto secundario>
          En la web no hay avisos: el botón «Enviar recordatorio por WhatsApp» está en la ficha de
          cada cita con cliente.
        </Texto>
      )}
      <Plegable titulo="Lo básico de la protección de datos" resumen="Qué tienes que cumplir al guardar sus teléfonos">
        <View style={estilos.lista}>
          {RGPD.map((linea) => (
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
  mensaje: { color: colores.texto }, // el verde es solo de Amigos
  lista: { gap: espacio.s },
});
