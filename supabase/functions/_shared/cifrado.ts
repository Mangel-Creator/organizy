// Organizy · Cifrado de las llaves de correo (fase 11). AES-GCM con una clave de 32
// bytes en base64 (secreto CORREO_CLAVE_CIFRADO). Lo guardado es "iv.cifrado", los dos
// en base64. Solo usa WebCrypto: funciona en Deno y en las pruebas de Jest.

function aBase64(bytes: Uint8Array): string {
  let binario = '';
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario);
}

function deBase64(texto: string): Uint8Array<ArrayBuffer> {
  const binario = atob(texto);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

async function importar(claveBase64: string): Promise<CryptoKey> {
  const bytes = deBase64(claveBase64);
  if (bytes.length !== 32) throw new Error('La clave de cifrado tiene que tener 32 bytes');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function cifrar(texto: string, claveBase64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const datos = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importar(claveBase64), new TextEncoder().encode(texto));
  return `${aBase64(iv)}.${aBase64(new Uint8Array(datos))}`;
}

export async function descifrar(guardado: string, claveBase64: string): Promise<string> {
  const [iv, datos] = guardado.split('.');
  if (!iv || !datos) throw new Error('Llave guardada con un formato desconocido');
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(iv) }, await importar(claveBase64), deBase64(datos));
  return new TextDecoder().decode(claro);
}
