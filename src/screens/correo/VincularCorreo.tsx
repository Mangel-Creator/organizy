import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Plegable, Texto } from '@/components';
import type { ProveedorCorreo, ProveedoresCorreo } from '@/data/correos';
import { conectarCorreo, vincularCuenta, type ResultadoVincular } from '@/services/correo';
import { alturaTactil, colores, espacio, radio } from '@/theme';

// "Vincular con…" (fase 11): una fila por cada correo. Gmail y Outlook solo piden
// iniciar sesión; iCloud (y la app Mail del iPhone) no se puede vincular y se explica
// cómo reenviarlo. Plegado, el ayudante de Gmail (sin guardar nada en el servidor), que
// se vincula escaneando su QR o pegando su enlace.

type NombreIcono = ComponentProps<typeof Ionicons>['name'];
type Opcion = ProveedorCorreo | 'icloud' | 'otro';

const OPCIONES: { valor: Opcion; icono: NombreIcono; titulo: string; ayuda: string }[] = [
  { valor: 'gmail', icono: 'logo-google', titulo: 'Vincular con Gmail', ayuda: 'Entras con tu cuenta de Google' },
  { valor: 'outlook', icono: 'logo-microsoft', titulo: 'Vincular con Outlook', ayuda: 'Outlook, Hotmail o Live' },
  { valor: 'icloud', icono: 'logo-apple', titulo: 'iCloud o Mail del iPhone', ayuda: 'Apple no deja vincularlo: te digo cómo' },
  { valor: 'otro', icono: 'mail-outline', titulo: 'Otro correo', ayuda: 'Trabajo, Yahoo…' },
];

const EXPLICACION: Record<'icloud' | 'otro', string> = {
  icloud:
    'Apple no deja que ninguna app lea el correo de iCloud ni la app Mail. Haz que iCloud reenvíe tus correos a tu Gmail u Outlook y vincula ese: en icloud.com/mail, Ajustes > Reenvío > «Reenviar mi correo a». Puedes seguir leyéndolos en Mail como siempre.',
  otro:
    'Si tu correo del trabajo es de Google o de Microsoft (muchos lo son), usa su botón. Si no, reenvíalo solo a tu Gmail u Outlook desde sus ajustes y vincula ese. Algunas empresas no dejan reenviar: pregunta a quien lleve los ordenadores.',
};

function textoFallo(r: Exclude<ResultadoVincular, { ok: true } | { ok: 'redirigiendo' }>, proveedor: ProveedorCorreo) {
  switch (r.motivo) {
    case 'cancelado':
      return 'No se ha vinculado: cancelaste el inicio de sesión.';
    case 'sin-configurar':
      return `Aún no está activado: falta registrar Organizy en ${proveedor === 'gmail' ? 'Google' : 'Microsoft'}. Los pasos están en la guía «Fase 11 - Correo».`;
    case 'sin-servidor':
      return 'Esta versión no está conectada al servidor de Organizy.';
    case 'sin-conexion':
      return 'Sin conexión. Prueba otra vez cuando tengas internet.';
    case 'demasiadas':
      return 'Ya tienes 5 cuentas vinculadas. Quita una para añadir otra.';
    case 'limite':
      return 'Demasiados intentos por hoy. Prueba mañana.';
    default:
      return 'No se ha podido vincular. Prueba otra vez en un rato.';
  }
}

type Props = {
  proveedores: ProveedoresCorreo | null;
  alTerminar: (mensaje: { bien: boolean; texto: string }) => void;
};

export function VincularCorreo({ proveedores, alTerminar }: Props) {
  const [explicando, setExplicando] = useState<'icloud' | 'otro' | null>(null);
  const [ocupado, setOcupado] = useState<ProveedorCorreo | null>(null);

  const pulsar = async (opcion: Opcion) => {
    if (opcion === 'icloud' || opcion === 'otro') {
      setExplicando((actual) => (actual === opcion ? null : opcion));
      return;
    }
    setOcupado(opcion);
    const r = await vincularCuenta(opcion).catch(() => ({ ok: false as const, motivo: 'error' as const }));
    setOcupado(null);
    if (r.ok === 'redirigiendo') return;
    if (r.ok) alTerminar({ bien: true, texto: `Listo: ${r.email ?? 'tu correo'} ya está vinculado. Te aviso en cuanto llegue algo.` });
    else alTerminar({ bien: false, texto: textoFallo(r, opcion) });
  };

  return (
    <View style={estilos.contenedor}>
      {OPCIONES.map((o) => {
        const desactivado = (o.valor === 'gmail' || o.valor === 'outlook') && proveedores?.[o.valor] === false;
        return (
          <View key={o.valor}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${o.titulo}. ${desactivado ? 'Aún no está activado.' : o.ayuda}`}
              accessibilityState={{ busy: ocupado === o.valor, expanded: explicando === o.valor }}
              disabled={ocupado !== null}
              onPress={() => pulsar(o.valor)}
              style={({ pressed }) => [estilos.fila, pressed && estilos.pulsado]}>
              <View style={estilos.icono}>
                <Ionicons name={o.icono} size={22} color={colores.texto} />
              </View>
              <View style={estilos.textos}>
                <Texto fuerte>{ocupado === o.valor ? 'Abriendo…' : o.titulo}</Texto>
                <Texto pequeno secundario>
                  {desactivado ? 'Aún no está activado' : o.ayuda}
                </Texto>
              </View>
              <Ionicons
                name={explicando === o.valor ? 'chevron-up' : 'chevron-forward'}
                size={20}
                color={colores.textoSecundario}
              />
            </Pressable>
            {explicando === o.valor && (o.valor === 'icloud' || o.valor === 'otro') ? (
              <Texto pequeno secundario style={estilos.explicacion}>
                {EXPLICACION[o.valor]}
              </Texto>
            ) : null}
          </View>
        );
      })}
      <Texto pequeno secundario>
        Solo inicias sesión en Google o Microsoft: Organizy nunca ve tu contraseña. Para avisarte en cuanto llega algo,
        guarda en su servidor, cifrado, el permiso para leer tu correo (solo leer) y 7 días de resúmenes. Si activas la
        IA, el texto de cada correo se envía a la IA (Claude, de Anthropic) para resumirlo y no se guarda. Lo quitas
        cuando quieras.
      </Texto>
      {proveedores?.gmail ? (
        <Texto pequeno secundario>
          Con Gmail, Google te pedirá volver a entrar cada semana mientras no haya revisado Organizy. Te aviso cuando toque.
        </Texto>
      ) : null}
    </View>
  );
}

// El ayudante de Gmail: se vincula solo al escanear su QR (abre la web de Organizy
// con "#ayudante=…") o pegando aquí su enlace.
export function VincularAyudante({ alTerminar }: { alTerminar: (mensaje: { bien: boolean; texto: string }) => void }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);

  const conectar = async () => {
    setConectando(true);
    setError(null);
    const r = await conectarCorreo(texto).catch(() => ({ ok: false as const, motivo: 'no-responde' as const }));
    setConectando(false);
    if (r.ok) {
      setTexto('');
      alTerminar({ bien: true, texto: 'Listo: el ayudante de Gmail ya está conectado.' });
      return;
    }
    setError(
      r.motivo === 'enlace'
        ? 'Eso no parece el enlace del ayudante. Empieza por https://script.google.com/macros/s/ y acaba en /exec.'
        : r.motivo === 'sin-conexion'
          ? 'Sin conexión. Prueba otra vez cuando tengas internet.'
          : 'El ayudante no responde. Revisa que lo implementaste como «Aplicación web» con acceso para «Cualquier usuario».',
    );
  };

  return (
    <Plegable titulo="Sin guardar nada en el servidor" resumen="Ayudante de Gmail, con QR" abierto={!!error}>
      <Texto pequeno secundario>
        Montas un ayudante en tu propia cuenta de Google (guía «Fase 11 - Correo», unos 15 minutos) y tus correos no pasan
        por Organizy. Al terminar te enseña un QR: escanéalo con la cámara del iPhone y se vincula solo. También puedes
        pegar aquí su enlace.
      </Texto>
      <CampoTexto
        etiqueta="Enlace del ayudante"
        placeholder="https://script.google.com/macros/s/…/exec"
        value={texto}
        onChangeText={setTexto}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={error}
      />
      <Boton
        variante="secundario"
        titulo={conectando ? 'Conectando…' : 'Conectar el ayudante'}
        onPress={conectar}
        disabled={conectando || !texto.trim()}
      />
    </Plegable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.s },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    minHeight: alturaTactil + 16,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.s,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.grande,
  },
  pulsado: { transform: [{ scale: 0.99 }] },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radio.normal,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.fondo,
  },
  textos: { flex: 1, gap: 2 },
  explicacion: { paddingHorizontal: espacio.m, paddingTop: espacio.s },
});
