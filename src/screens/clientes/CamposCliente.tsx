import { CampoTexto, Interruptor, Plegable, Texto } from '@/components';
import { ERROR_SIN_TELEFONO, ERROR_TELEFONO, telefonoWhatsapp } from '@/services/clientes';

// Ficha de una cita con un cliente (fase 10): nombre, teléfono y si acepta
// recordatorios por WhatsApp. Plegado, como todo lo opcional; se abre solo si hay
// un error dentro. Todo se queda en el dispositivo.

export type BorradorCliente = {
  clienteNombre: string;
  clienteTelefono: string;
  clienteAcepta: boolean;
};

type Props = BorradorCliente & {
  cambiar: (cambios: Partial<BorradorCliente>) => void;
  error?: string;
};

// "Laura · 612 34 56 78 · acepta recordatorios"
function resumen({ clienteNombre, clienteTelefono, clienteAcepta }: BorradorCliente): string {
  const partes = [clienteNombre.trim(), clienteTelefono.trim()].filter(Boolean);
  if (partes.length === 0) return 'Nombre y teléfono para recordarle la cita por WhatsApp';
  return [...partes, clienteAcepta ? 'acepta recordatorios' : 'sin recordatorios'].join(' · ');
}

export function CamposCliente({ cambiar, error, ...borrador }: Props) {
  const { clienteNombre, clienteTelefono, clienteAcepta } = borrador;
  return (
    <Plegable titulo="Cliente y recordatorio" resumen={resumen(borrador)} abierto={!!error}>
      <CampoTexto
        etiqueta="Nombre del cliente"
        placeholder="Laura"
        value={clienteNombre}
        onChangeText={(texto) => cambiar({ clienteNombre: texto })}
        autoCapitalize="words"
        textContentType="name"
      />
      <CampoTexto
        etiqueta="Teléfono"
        placeholder="612 34 56 78"
        value={clienteTelefono}
        onChangeText={(texto) => cambiar({ clienteTelefono: texto })}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        ayuda="Si no es de España, con su prefijo: +351 912 345 678."
        error={error}
      />
      <Interruptor
        etiqueta="Acepta recordatorios por WhatsApp"
        ayuda="Márcalo solo si te ha dicho que sí. Si cambia de idea, lo desmarcas y no le llega nada más."
        valor={clienteAcepta}
        alCambiar={(acepta) => cambiar({ clienteAcepta: acepta })}
      />
      <Texto pequeno secundario>
        Su nombre y su teléfono se quedan solo en tu móvil. Guárdalos solo si te ha dado permiso.
      </Texto>
    </Plegable>
  );
}

// Error del teléfono al guardar: vacío con la casilla marcada, o mal escrito.
export function errorTelefono({ clienteTelefono, clienteAcepta }: BorradorCliente): string | undefined {
  const telefono = clienteTelefono.trim();
  if (!telefono) return clienteAcepta ? ERROR_SIN_TELEFONO : undefined;
  return telefonoWhatsapp(telefono) ? undefined : ERROR_TELEFONO;
}
