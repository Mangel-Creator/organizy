import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Tarjeta, Texto } from '@/components';
import { guardarEpoca, type Epoca, type RegistroBloque } from '@/data/epocas';
import { aplicarPropuesta, textoPropuesta, type PlanEpoca, type Repaso } from '@/services/epoca';
import { repasoConIA } from '@/services/epoca/ia';
import { colores, espacio } from '@/theme';

type Props = { epoca: Epoca; registro: RegistroBloque[]; plan: PlanEpoca };

// "Repaso de cómo vas": la IA mira lo hecho y lo que falta (solo números y los
// nombres de los exámenes) y propone como mucho 3 cambios. Nada cambia hasta que
// tocas "Aplicar"; al aplicarlo, el plan se recalcula solo.
export function RepasoIA({ epoca, registro, plan }: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [repaso, setRepaso] = useState<Repaso | null>(null);
  // El texto de cada propuesta se fija al llegar ("de 5 h a 6 h"): después de
  // aplicarla, la época ya ha cambiado y diría "de 6 h a 6 h".
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [aplicadas, setAplicadas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const repasar = async () => {
    setOcupado(true);
    setMensaje(null);
    setRepaso(null);
    setAplicadas([]);
    const r = await repasoConIA(epoca, registro, plan);
    setOcupado(false);
    if (r.estado === 'fallo') {
      setMensaje({ texto: r.mensaje, error: r.motivo !== 'sin-clave' && r.motivo !== 'sin-configurar' });
      return;
    }
    setTextos(Object.fromEntries(r.datos.propuestas.map((p) => [p.id, textoPropuesta(epoca, p)])));
    setRepaso(r.datos);
  };

  const pendientes = repaso?.propuestas.filter((p) => !aplicadas.includes(p.id)) ?? [];

  const aplicar = async (ids: string[]) => {
    let nueva = epoca;
    for (const p of pendientes.filter((x) => ids.includes(x.id))) nueva = aplicarPropuesta(nueva, p);
    await guardarEpoca(nueva);
    setAplicadas((actuales) => [...actuales, ...ids]);
  };

  return (
    <Tarjeta style={estilos.caja}>
      <Texto secundario>
        La IA mira lo que llevas hecho y lo que te falta, y te propone ajustes si hacen falta.
      </Texto>
      <Boton
        variante={repaso ? 'secundario' : 'principal'}
        titulo={ocupado ? 'Repasando…' : repaso ? 'Repasar otra vez' : 'Repasar cómo voy'}
        disabled={ocupado}
        onPress={repasar}
      />
      {mensaje ? (
        <Texto fuerte style={mensaje.error ? estilos.error : null} accessibilityLiveRegion="polite">
          {mensaje.texto}
        </Texto>
      ) : null}

      {repaso ? (
        <View style={estilos.caja} accessibilityLiveRegion="polite">
          <Texto>{repaso.resumen}</Texto>
          {repaso.propuestas.length === 0 ? (
            <Texto secundario>No te propongo cambios: sigue así.</Texto>
          ) : null}
          {repaso.propuestas.map((p) => {
            const hecha = aplicadas.includes(p.id);
            return (
              <View key={p.id} style={estilos.propuesta}>
                <Texto fuerte>{textos[p.id] ?? textoPropuesta(epoca, p)}</Texto>
                {p.motivo ? <Texto pequeno secundario>{p.motivo}</Texto> : null}
                {hecha ? (
                  <View style={estilos.hecho}>
                    <Ionicons name="checkmark" size={18} color={colores.texto} />
                    <Texto pequeno fuerte>
                      Aplicado. El plan ya está recalculado.
                    </Texto>
                  </View>
                ) : (
                  <Boton variante="secundario" titulo="Aplicar" onPress={() => aplicar([p.id])} />
                )}
              </View>
            );
          })}
          {pendientes.length > 1 ? (
            <Boton titulo="Aplicar todo" onPress={() => aplicar(pendientes.map((p) => p.id))} />
          ) : null}
        </View>
      ) : null}

      <Texto pequeno secundario>
        Se envían a la IA (Claude, de Anthropic) tus horas y los nombres de tus exámenes, nada más. No se guarda en
        ningún servidor.
      </Texto>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.s },
  propuesta: {
    gap: espacio.xs,
    paddingTop: espacio.s,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  hecho: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, minHeight: 32 },
  error: { color: colores.aviso },
});
