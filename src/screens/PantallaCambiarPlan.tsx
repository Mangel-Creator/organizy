import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Pantalla, Texto, Titulo } from '@/components';
import { useEmpresa } from '@/data/empresa';
import { activarModoEmpresa, apagarModoEmpresa, salirDeLaEmpresa } from '@/services/empresa';
import { NOMBRE_PLAN } from '@/services/empresa/plan';
import { textoFallo } from '@/services/empresa/textos';
import { alturaTactil, colorBaldosa, colores, espacio, radio } from '@/theme';

import { BotonVolver, Confirmar, Mensaje } from './empresa/piezas';

// "Cambiar de plan" (Perfil): Plan personal (Organizy de siempre) o Plan empresa
// (Organizy grupal: calendario de empresa, turnos, tareas asignadas y disponibilidad del
// equipo). Al cambiar sale un momento "Cambiando de plan…".

type Plan = 'personal' | 'empresa';

const QUE_TRAE: Record<Plan, string[]> = {
  personal: ['Tu calendario, avisos, mapa, alarmas y planes con amigos', 'Todo se queda en tu móvil'],
  empresa: [
    'Tu calendario, avisos, mapa y alarmas, como siempre',
    'Pestaña Empresa en lugar de los planes con amigos',
    'Calendario de la empresa, turnos y tareas asignadas',
    'Chat del equipo y avisos de los superiores',
    'Disponibilidad del equipo y "Buscar hueco" para reuniones',
    'Entras con la cuenta de Google o Microsoft del trabajo',
  ],
};

export function PantallaCambiarPlan() {
  const { modo, situacion } = useEmpresa();
  const actual: Plan = modo ? 'empresa' : 'personal';
  const [cambiando, setCambiando] = useState<Plan | null>(null);
  const [preguntar, setPreguntar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pasarA = async (plan: Plan) => {
    setError(null);
    setCambiando(plan);
    // Un momento para que se vea que cambia (y dé tiempo a guardarlo).
    const espera = new Promise((r) => setTimeout(r, 900));
    if (plan === 'empresa') {
      await Promise.all([activarModoEmpresa(), espera]);
      router.replace('/trabajo');
      return;
    }
    const dentro = situacion.fase === 'dentro' || situacion.fase === 'pendiente';
    const [r] = await Promise.all([dentro ? salirDeLaEmpresa() : apagarModoEmpresa().then(() => ({ ok: true as const })), espera]);
    setCambiando(null);
    if (!r.ok) {
      setError(textoFallo(r.motivo));
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  const elegir = (plan: Plan) => {
    if (plan === actual) return;
    // Volver al personal saliendo de una empresa: se pregunta antes.
    if (plan === 'personal' && (situacion.fase === 'dentro' || situacion.fase === 'pendiente')) setPreguntar(true);
    else pasarA(plan);
  };

  if (cambiando) {
    return (
      <Pantalla contentContainerStyle={estilos.cambiando}>
        <Animated.View entering={FadeIn.duration(200)} style={estilos.cambiandoCaja}>
          <ActivityIndicator color={colores.principal} size="large" />
          <Titulo nivel={2}>Cambiando de plan…</Titulo>
          <Texto secundario style={estilos.centro}>
            {cambiando === 'empresa' ? `Pasando al ${NOMBRE_PLAN.empresa}.` : `Volviendo al ${NOMBRE_PLAN.personal}. Lo tuyo se queda.`}
          </Texto>
        </Animated.View>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <BotonVolver texto="Perfil" destino="/perfil" />
      <Titulo>Cambiar de plan</Titulo>
      <Texto secundario>Elige cómo quieres usar Organizy. Puedes volver cuando quieras.</Texto>

      {(['personal', 'empresa'] as Plan[]).map((plan) => (
        <TarjetaPlan key={plan} plan={plan} actual={plan === actual} alElegir={() => elegir(plan)} />
      ))}

      <Texto pequeno secundario>
        Tu empresa solo ve lo de trabajo. Lo personal no sale de tu móvil.
      </Texto>

      {preguntar ? (
        <Confirmar
          texto="Si vuelves al plan personal, sales de tu empresa: se borra del móvil y del servidor todo lo de la empresa (turnos, tareas, eventos de empresa). Lo tuyo no se toca."
          si="Salir y volver al personal"
          alSi={() => {
            setPreguntar(false);
            pasarA('personal');
          }}
          alNo={() => setPreguntar(false)}
        />
      ) : null}
      <Mensaje texto={error} />
    </Pantalla>
  );
}

function TarjetaPlan({ plan, actual, alElegir }: { plan: Plan; actual: boolean; alElegir: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: actual }}
      accessibilityLabel={`${NOMBRE_PLAN[plan]}${actual ? ', el que tienes' : ''}`}
      onPress={alElegir}
      style={({ pressed }) => [estilos.plan, actual && estilos.planActual, pressed && !actual && estilos.pulsado]}>
      <View style={estilos.planCabecera}>
        <View style={[estilos.icono, { backgroundColor: plan === 'empresa' ? colorBaldosa.empresa.fondo : colorBaldosa.yo.fondo }]}>
          <Ionicons
            name={plan === 'empresa' ? 'business-outline' : 'person-outline'}
            size={22}
            color={plan === 'empresa' ? colorBaldosa.empresa.icono : colorBaldosa.yo.icono}
          />
        </View>
        <Titulo nivel={3} style={[estilos.planTitulo, actual && estilos.textoClaro]}>
          {NOMBRE_PLAN[plan]}
        </Titulo>
        <Texto pequeno fuerte style={actual ? estilos.textoClaro : estilos.elegir}>
          {actual ? 'El tuyo' : 'Elegir'}
        </Texto>
      </View>
      {QUE_TRAE[plan].map((linea) => (
        <View key={linea} style={estilos.linea}>
          <Ionicons name="checkmark" size={16} color={actual ? colores.textoSobreTinta : colores.texto} />
          <Texto pequeno style={[estilos.lineaTexto, actual && estilos.textoClaroSecundario]}>
            {linea}
          </Texto>
        </View>
      ))}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cambiando: { flexGrow: 1, justifyContent: 'center' },
  cambiandoCaja: { alignItems: 'center', gap: espacio.m },
  centro: { textAlign: 'center' },
  plan: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.grande + 4,
    padding: espacio.m,
    gap: espacio.s,
    minHeight: alturaTactil,
  },
  planActual: { backgroundColor: colores.tinta },
  pulsado: { transform: [{ scale: 0.98 }] },
  planCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  icono: { width: 40, height: 40, borderRadius: radio.normal, alignItems: 'center', justifyContent: 'center' },
  planTitulo: { flex: 1 },
  elegir: { color: colores.principal },
  textoClaro: { color: colores.textoSobreTinta },
  textoClaroSecundario: { color: colores.textoSecundarioSobreTinta },
  linea: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.s },
  lineaTexto: { flex: 1 },
});
