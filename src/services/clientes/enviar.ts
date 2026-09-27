import { Linking, Platform } from 'react-native';

import { apuntarEnvio } from '@/data/recordatorios';

import type { EnvioRecordatorio } from './index';

// Abre WhatsApp en el chat del cliente con el recordatorio escrito y apunta el envío
// (fase 10, parte A). Lo manda la persona: WhatsApp no deja que otra app envíe por ella.
//
// En la web hay que llamarlo justo al tocar (sin esperar nada antes): el navegador solo
// deja abrir otra pestaña en respuesta a un toque.
export async function mandarRecordatorio(clave: string, enlace: string): Promise<EnvioRecordatorio> {
  let envio: EnvioRecordatorio;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const pestana = window.open(enlace, '_blank');
    if (!pestana) window.location.href = enlace;
    envio = { estado: 'enviado', el: new Date().toISOString(), via: 'whatsapp' };
  } else {
    try {
      await Linking.openURL(enlace);
      envio = { estado: 'enviado', el: new Date().toISOString(), via: 'whatsapp' };
    } catch {
      envio = {
        estado: 'fallido',
        el: new Date().toISOString(),
        via: 'whatsapp',
        error: 'no se pudo abrir WhatsApp. ¿Lo tienes instalado?',
      };
    }
  }
  await apuntarEnvio(clave, envio);
  return envio;
}
