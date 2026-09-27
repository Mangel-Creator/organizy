import * as DocumentPicker from 'expo-document-picker';

import type { ResultadoGuardar } from './archivo';

// El archivo de la copia en la web. En el móvil (pantalla táctil) se abre el menú de
// compartir del navegador, que en el iPhone deja "Guardar en Archivos"; en el
// ordenador, o si el navegador no puede compartir archivos, se descarga.

export type { ResultadoGuardar };

function descargar(archivo: globalThis.File) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function guardarArchivo(nombre: string, texto: string): Promise<ResultadoGuardar> {
  const archivo = new globalThis.File([texto], nombre, { type: 'application/json' });
  const tactil = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (tactil && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return 'compartido';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelado';
      // Otro fallo (por ejemplo, el navegador no lo deja sin un toque reciente): se descarga.
    }
  }
  descargar(archivo);
  return 'descargado';
}

export async function elegirArchivo(): Promise<string | null> {
  // Sin filtro: en el iPhone un filtro puede dejar gris la copia si llegó por WhatsApp o correo.
  const resultado = await DocumentPicker.getDocumentAsync({ type: '*/*', base64: false });
  if (resultado.canceled) return null;
  const elegido = resultado.assets[0];
  if (elegido.file) return elegido.file.text();
  return (await fetch(elegido.uri)).text();
}

export async function reiniciarApp(): Promise<void> {
  window.location.reload();
}
