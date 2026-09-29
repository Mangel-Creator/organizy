import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Boton, LogoMarca, Tarjeta, Texto, Titulo } from '@/components';
import type { ConexionCorreo, CuentaCorreo } from '@/data/correos';
import { desconectarCorreo, NOMBRE_PROVEEDOR, quitarCuenta, vincularCuenta } from '@/services/correo';
import { claveDia, formatearHora } from '@/services/fechas';
import { colores, espacio, radio } from '@/theme';

// "Tus cuentas" en Resúmenes (fase 11): las vinculadas en el servidor y el ayudante de
// Gmail, con cuándo se miraron, "Volver a entrar" si la llave caducó y "Quitar".

function hace(iso: string | null): string | null {
  if (!iso) return null;
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const fecha = new Date(iso);
  return claveDia(fecha) === claveDia(new Date()) ? `a las ${formatearHora(fecha)}` : 'hace más de un día';
}

type Props = {
  cuentas: CuentaCorreo[];
  conexion: ConexionCorreo | null;
  actualizando: boolean;
  alTerminar: (mensaje: { bien: boolean; texto: string }) => void;
};

export function CuentasCorreo({ cuentas, conexion, actualizando, alTerminar }: Props) {
  // Qué se está a punto de quitar: el id de una cuenta o "ayudante".
  const [quitando, setQuitando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const confirmarQuitar = async () => {
    const id = quitando;
    if (!id) return;
    setOcupado(true);
    if (id === 'ayudante') {
      await desconectarCorreo().catch(() => {});
      alTerminar({ bien: true, texto: 'He desconectado el ayudante. Para que deje de mirar tu correo, ejecuta «desinstalar» en script.google.com.' });
    } else {
      const cuenta = cuentas.find((c) => c.id === id);
      const ok = cuenta ? await quitarCuenta(cuenta).catch(() => false) : true;
      alTerminar(
        ok
          ? { bien: true, texto: `Hecho: ${cuenta?.email ?? 'la cuenta'} ya no está vinculada. Tus tareas se quedan.` }
          : { bien: false, texto: 'No se ha podido quitar. Prueba otra vez cuando tengas conexión.' },
      );
    }
    setOcupado(false);
    setQuitando(null);
  };

  const volverAEntrar = async (cuenta: CuentaCorreo) => {
    const r = await vincularCuenta(cuenta.proveedor).catch(() => ({ ok: false as const, motivo: 'error' as const }));
    if (r.ok === 'redirigiendo') return;
    alTerminar(
      r.ok
        ? { bien: true, texto: `Listo: ${r.email ?? cuenta.email} vuelve a estar vinculado.` }
        : { bien: false, texto: 'No se ha podido volver a entrar. Prueba otra vez.' },
    );
  };

  const nombreQuitando =
    quitando === 'ayudante' ? 'el ayudante de Gmail' : cuentas.find((c) => c.id === quitando)?.email ?? '';

  return (
    <View style={estilos.contenedor}>
      <Titulo nivel={3}>Tus cuentas</Titulo>
      {cuentas.map((c) => {
        const caducada = c.estado === 'caducada';
        const revisada = hace(c.ultimaRevision);
        return (
          <View key={c.id} style={estilos.fila}>
            <View style={estilos.cabecera}>
              <View accessible accessibilityLabel={NOMBRE_PROVEEDOR[c.proveedor]}>
                <LogoMarca proveedor={c.proveedor === 'gmail' ? 'google' : 'microsoft'} tamano={20} />
              </View>
              <View style={estilos.textos}>
                <Texto fuerte numberOfLines={1}>
                  {c.email}
                </Texto>
                <Texto pequeno secundario style={caducada ? estilos.aviso : undefined}>
                  {caducada
                    ? `Tienes que volver a entrar en ${NOMBRE_PROVEEDOR[c.proveedor]}`
                    : actualizando
                      ? 'Mirando si hay algo nuevo…'
                      : revisada
                        ? `Revisado ${revisada} · cada 5 min`
                        : 'Vinculado · lo reviso cada 5 min'}
                </Texto>
              </View>
            </View>
            <View style={estilos.botones}>
              {caducada ? <Boton titulo="Volver a entrar" onPress={() => volverAEntrar(c)} style={estilos.boton} /> : null}
              <Boton variante="secundario" titulo="Quitar" onPress={() => setQuitando(c.id)} style={estilos.boton} />
            </View>
          </View>
        );
      })}
      {conexion ? (
        <View style={estilos.fila}>
          <View style={estilos.cabecera}>
            <Ionicons name="code-slash-outline" size={20} color={colores.texto} />
            <View style={estilos.textos}>
              <Texto fuerte>Ayudante de Gmail</Texto>
              <Texto pequeno secundario style={conexion.error && !actualizando ? estilos.aviso : undefined}>
                {actualizando
                  ? 'Mirando si hay algo nuevo…'
                  : conexion.error === 'sin-conexion'
                    ? 'Sin conexión: te enseño lo último que traje.'
                    : conexion.error === 'no-responde'
                      ? 'No responde. Revisa en script.google.com que está implementado.'
                      : hace(conexion.ultimaRevision)
                        ? `Revisado ${hace(conexion.ultimaRevision)} · cada 10 min`
                        : 'Conectado · lo reviso cada 10 min'}
              </Texto>
            </View>
          </View>
          <View style={estilos.botones}>
            <Boton variante="secundario" titulo="Quitar" onPress={() => setQuitando('ayudante')} style={estilos.boton} />
          </View>
        </View>
      ) : null}

      {quitando ? (
        <Tarjeta style={estilos.confirmar}>
          <Texto fuerte>¿Desvinculo {nombreQuitando}?</Texto>
          <Texto pequeno secundario>
            {quitando === 'ayudante'
              ? 'Dejo de pedirle correos y borro sus resúmenes de este móvil. Las tareas se quedan.'
              : 'Borro del servidor el permiso para leer tu correo y sus resúmenes. Las tareas se quedan.'}
          </Texto>
          <Boton titulo={ocupado ? 'Quitando…' : 'Sí, desvincular'} onPress={confirmarQuitar} disabled={ocupado} />
          <Boton variante="secundario" titulo="Cancelar" onPress={() => setQuitando(null)} disabled={ocupado} />
        </Tarjeta>
      ) : null}

      {Platform.OS === 'web' ? (
        <Texto pequeno secundario>
          En la web no llegan avisos: los correos nuevos salen marcados aquí.
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.s },
  fila: {
    gap: espacio.s,
    padding: espacio.m,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.grande,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  textos: { flex: 1, gap: 2 },
  aviso: { color: colores.aviso },
  botones: { flexDirection: 'row', gap: espacio.s, justifyContent: 'flex-end' },
  boton: { flexGrow: 0 },
  confirmar: { gap: espacio.s },
});
