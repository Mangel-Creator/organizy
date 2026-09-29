import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { matrizQR } from '@/services/empresa/qr';
import { colores } from '@/theme';

// Código QR dibujado con cuadritos (sin librerías): cada fila son tramos negros seguidos.
// Negro sobre blanco, con su margen blanco alrededor (hace falta para leerlo).
export function CodigoQR({ texto, lado = 220 }: { texto: string; lado?: number }) {
  const matriz = useMemo(() => matrizQR(texto), [texto]);
  if (!matriz) return null;
  const n = matriz.length + 8; // 4 cuadritos de margen a cada lado
  const celda = Math.max(2, Math.floor(lado / n));
  const tamano = celda * n;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Código QR del enlace de invitación"
      style={[estilos.fondo, { width: tamano, height: tamano, padding: celda * 4 }]}>
      {matriz.map((fila, y) => (
        <View key={y} style={[estilos.fila, { height: celda }]}>
          {tramos(fila).map(([x, largo]) => (
            <View key={x} style={{ position: 'absolute', left: x * celda, width: largo * celda, height: celda, backgroundColor: colores.texto }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// [[inicio, largo], ...] de cada tramo negro de una fila.
function tramos(fila: boolean[]): [number, number][] {
  const r: [number, number][] = [];
  let inicio = -1;
  fila.forEach((negro, x) => {
    if (negro && inicio < 0) inicio = x;
    if (!negro && inicio >= 0) {
      r.push([inicio, x - inicio]);
      inicio = -1;
    }
  });
  if (inicio >= 0) r.push([inicio, fila.length - inicio]);
  return r;
}

const estilos = StyleSheet.create({
  fondo: { backgroundColor: colores.tarjeta, alignSelf: 'center' },
  fila: { position: 'relative' },
});
