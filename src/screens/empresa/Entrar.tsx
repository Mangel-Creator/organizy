import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet } from 'react-native';

import { Boton, CampoTexto, Plegable, SelectorVisual, Tarjeta, Texto, Titulo } from '@/components';
import { usePerfil } from '@/data/perfil';
import {
  cambiarDeCuenta,
  crearMiEmpresa,
  ejemploPosible,
  entrarDePrueba,
  entrarEnEmpresa,
  invitacionGuardada,
  modoPruebaEmpresa,
  PERSONAS_PRUEBA,
  unirmeAMiEmpresa,
  verEmpresaDeEjemplo,
  type ProveedorEmpresa,
} from '@/services/empresa';
import { proveedoresActivos, type ProveedoresActivos } from '@/services/empresa/proveedores';
import { TEXTO_INFORMATICO, textoFallo } from '@/services/empresa/textos';
import { alturaTactil, colores, espacio, radio } from '@/theme';

import { Mensaje } from './piezas';

export const FRASE_PRIVACIDAD = 'Tu empresa solo ve lo de trabajo. Lo personal no sale de tu móvil.';

// Sin sesión: "Entrar con Google" / "Entrar con Microsoft" (cuenta del trabajo).
export function Entrar({ invitado }: { invitado: boolean }) {
  const prueba = modoPruebaEmpresa();
  const [proveedores, setProveedores] = useState<ProveedoresActivos | null | undefined>(
    prueba ? { google: true, microsoft: true } : undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<ProveedorEmpresa | 'ejemplo' | null>(null);

  // Qué ha activado el dueño en Supabase (en el modo de prueba, los dos).
  useEffect(() => {
    if (!prueba) proveedoresActivos().then(setProveedores);
  }, [prueba]);

  const entrar = async (proveedor: ProveedorEmpresa) => {
    setError(null);
    setOcupado(proveedor);
    const r = await entrarEnEmpresa(proveedor);
    setOcupado(null);
    if (r.ok === false && r.motivo === 'aprobacion-admin') {
      setError('Tu empresa pide que el informático apruebe Organizy antes. Abajo tienes cómo.');
    } else if (r.ok === false && r.motivo !== 'cancelado') {
      setError('No he podido entrar. Prueba otra vez en un momento.');
    }
  };

  const verEjemplo = async () => {
    setOcupado('ejemplo');
    await verEmpresaDeEjemplo();
    setOcupado(null);
  };

  const nadaActivo = proveedores !== undefined && (!proveedores || (!proveedores.google && !proveedores.microsoft));

  return (
    <>
      <Texto>
        {invitado
          ? 'Te han invitado a una empresa. Entra con la cuenta de Google o Microsoft del trabajo.'
          : 'Entra con la cuenta de Google o Microsoft del trabajo. Si eres el jefe, después creas la empresa.'}
      </Texto>
      <Tarjeta style={estilos.privacidad}>
        <Ionicons name="lock-closed-outline" size={18} color={colores.texto} />
        <Texto style={estilos.flex}>{FRASE_PRIVACIDAD}</Texto>
      </Tarjeta>

      {ejemploPosible() && !invitado ? (
        <Tarjeta style={estilos.caja}>
          <Texto fuerte>¿Quieres verlo antes?</Texto>
          <Texto pequeno secundario>
            Abre un bar de ejemplo ya montado, con su gente, turnos, tareas, chat y avisos. Sin cuentas y sin que nada salga de tu
            móvil. Puedes verlo como el jefe, como una responsable o como un empleado.
          </Texto>
          <Boton
            titulo={ocupado === 'ejemplo' ? 'Abriendo…' : 'Ver una empresa de ejemplo'}
            disabled={ocupado !== null}
            onPress={verEjemplo}
          />
        </Tarjeta>
      ) : null}

      {prueba ? (
        <Tarjeta style={estilos.caja}>
          <Texto fuerte>Modo de prueba (solo en el ordenador)</Texto>
          <Texto pequeno secundario>
            Entra como una de estas personas para probar sin cuentas de verdad. Todo se guarda en este navegador.
          </Texto>
          {PERSONAS_PRUEBA.map((p) => (
            <Boton key={p.id} variante="secundario" titulo={`Entrar como ${p.nombre} (${p.correo})`} onPress={() => entrarDePrueba(p.id)} />
          ))}
        </Tarjeta>
      ) : (
        <>
          <BotonProveedor
            icono="logo-google"
            titulo="Entrar con Google"
            activo={proveedores?.google === true}
            cargando={ocupado === 'google'}
            onPress={() => entrar('google')}
          />
          <BotonProveedor
            icono="logo-microsoft"
            titulo="Entrar con Microsoft"
            activo={proveedores?.microsoft === true}
            cargando={ocupado === 'azure'}
            onPress={() => entrar('azure')}
          />
          {nadaActivo ? (
            <Texto pequeno secundario>
              Aún no está activado: falta que el dueño de Organizy registre la app en Google y Microsoft (lo explica su guía).
            </Texto>
          ) : null}
        </>
      )}
      <Mensaje texto={error} />

      <Plegable titulo="¿Te sale «Se necesita aprobación del administrador»?" resumen="Pasa en empresas con Microsoft restringido">
        <Texto>
          Algunas empresas no dejan aceptar apps por tu cuenta. Entonces el informático aprueba Organizy una sola vez y ya puede
          entrar todo el mundo:
        </Texto>
        <Texto>1. Reenvíale el texto de abajo.</Texto>
        <Texto>
          2. Él entra en Microsoft Entra y, en Aplicaciones empresariales {'>'} Organizy {'>'} Permisos, pulsa «Conceder
          consentimiento de administrador».
        </Texto>
        <Texto>3. Vuelve a pulsar «Entrar con Microsoft».</Texto>
        <Texto pequeno secundario>
          Organizy solo pide tu nombre y tu correo: no lee tu correo ni tus archivos.
        </Texto>
        <Boton variante="secundario" titulo="Mandar el texto al informático" onPress={() => Share.share({ message: TEXTO_INFORMATICO })} />
      </Plegable>
    </>
  );
}

function BotonProveedor({
  icono,
  titulo,
  activo,
  cargando,
  onPress,
}: {
  icono: 'logo-google' | 'logo-microsoft';
  titulo: string;
  activo: boolean;
  cargando: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !activo }}
      disabled={!activo || cargando}
      onPress={onPress}
      style={({ pressed }) => [estilos.proveedor, !activo && estilos.apagado, pressed && estilos.pulsado]}>
      <Ionicons name={icono} size={22} color={colores.texto} />
      <Texto fuerte style={!activo && estilos.textoApagado}>
        {cargando ? 'Abriendo…' : titulo}
      </Texto>
      {!activo ? (
        <Texto pequeno secundario>
          · Aún no está activado
        </Texto>
      ) : null}
    </Pressable>
  );
}

type Camino = 'crear' | 'unirme';

// Con sesión y sin empresa: crear una (el jefe) o unirse a la suya (los empleados).
export function CrearOUnirme({ correo, invitado }: { correo: string; invitado: boolean }) {
  const { perfil } = usePerfil();
  const [camino, setCamino] = useState<Camino>('unirme');
  const [empresa, setEmpresa] = useState('');
  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [enlace, setEnlace] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hayInvitacion, setHayInvitacion] = useState(false);

  useEffect(() => {
    invitacionGuardada().then((c) => setHayInvitacion(!!c));
  }, []);

  const seguir = async () => {
    setError(null);
    if (camino === 'crear' && !empresa.trim()) {
      setError('Pon el nombre de la empresa.');
      return;
    }
    setOcupado(true);
    const r = camino === 'crear' ? await crearMiEmpresa(empresa, nombre) : await unirmeAMiEmpresa(nombre, enlace || null);
    setOcupado(false);
    if (!r.ok) setError(textoFallo(r.motivo));
  };

  return (
    <>
      <Texto secundario>Has entrado como {correo}.</Texto>
      <SelectorVisual<Camino>
        etiqueta="¿Qué quieres hacer?"
        opciones={[
          { valor: 'unirme', etiqueta: 'Unirme a mi empresa', icono: 'enter-outline' },
          { valor: 'crear', etiqueta: 'Crear una empresa', icono: 'business-outline' },
        ]}
        valor={camino}
        alCambiar={setCamino}
      />
      {camino === 'crear' ? (
        <>
          <CampoTexto etiqueta="Nombre de la empresa" value={empresa} onChangeText={setEmpresa} placeholder="Bar Pepe" maxLength={80} />
          <Texto pequeno secundario>
            Serás su administrador. Después invitas a tu gente con un enlace, una lista de correos o, si tenéis correo propio
            (@tuempresa.com), dejando entrar a cualquiera de ese dominio.
          </Texto>
        </>
      ) : (
        <>
          {hayInvitacion ? (
            <Texto>Tienes una invitación guardada: pulsa «Unirme».</Texto>
          ) : (
            <CampoTexto
              etiqueta="Enlace de invitación (si te lo han mandado)"
              ayuda="Si tu jefe añadió tu correo o tenéis correo de empresa, déjalo vacío."
              value={enlace}
              onChangeText={setEnlace}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://mangel-creator.github.io/organizy/empresa#invitacion=…"
            />
          )}
        </>
      )}
      <CampoTexto etiqueta="Tu nombre en la empresa" value={nombre} onChangeText={setNombre} maxLength={60} />
      <Boton titulo={ocupado ? 'Un momento…' : camino === 'crear' ? 'Crear la empresa' : 'Unirme'} disabled={ocupado} onPress={seguir} />
      <Mensaje texto={error} />
      <Boton variante="secundario" titulo="Usar otra cuenta" onPress={() => cambiarDeCuenta()} />
    </>
  );
}

// Esperando a que el administrador acepte.
export function Pendiente({ empresa, alComprobar }: { empresa: string; alComprobar: () => void }) {
  return (
    <>
      <Tarjeta style={estilos.caja}>
        <Titulo nivel={3}>Esperando que te acepten</Titulo>
        <Texto>
          Ya has pedido entrar en {empresa || 'tu empresa'}. En cuanto te acepten, te llega un aviso y aquí saldrán tus turnos,
          tareas y el calendario de la empresa.
        </Texto>
      </Tarjeta>
      <Boton variante="secundario" titulo="Comprobar ahora" onPress={alComprobar} />
      <Boton variante="secundario" titulo="Cancelar la petición" onPress={() => cambiarDeCuenta()} />
    </>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  privacidad: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  caja: { gap: espacio.s },
  proveedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    minHeight: alturaTactil + 4,
    paddingHorizontal: espacio.m,
    borderRadius: radio.normal,
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    backgroundColor: colores.tarjeta,
  },
  apagado: { backgroundColor: 'transparent', borderColor: colores.borde },
  textoApagado: { color: colores.textoSecundario },
  pulsado: { transform: [{ scale: 0.98 }] },
});
