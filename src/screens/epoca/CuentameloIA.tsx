import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Plegable, Texto } from '@/components';
import type { Perfil } from '@/data/perfil';
import type { PropuestaEpoca } from '@/services/epoca';
import { prepararEpocaConIA } from '@/services/epoca/ia';
import { MAX_TEXTO_EPOCA } from '@/services/epoca/validarIA';
import { colores, espacio } from '@/theme';

type Props = {
  perfil: Perfil | null;
  alPreparar: (propuesta: PropuestaEpoca) => void;
};

const EJEMPLO =
  'Exámenes de enero: Estadística el 15 a las 9, que me cuesta, y Álgebra el 22. Voy a la biblioteca de lunes a viernes, unas 5 horas, mejor por la mañana. Los domingos, libres, y el gimnasio lunes y miércoles a las 19.';

// "Cuéntamelo y lo preparo": escribe (o dicta con el micro del teclado) cómo va a
// ser la época y la IA rellena el formulario. Todo queda a la vista para revisarlo
// en los tres pasos antes de guardar.
export function CuentameloIA({ perfil, alPreparar }: Props) {
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const [notas, setNotas] = useState<string | null>(null);

  const preparar = async () => {
    setOcupado(true);
    setMensaje(null);
    setNotas(null);
    const r = await prepararEpocaConIA(texto, perfil);
    setOcupado(false);
    if (r.estado === 'fallo') {
      setMensaje({ texto: r.mensaje, error: r.motivo !== 'sin-clave' && r.motivo !== 'sin-configurar' });
      return;
    }
    alPreparar(r.datos);
    const n = r.datos.hitos.length;
    setMensaje({
      texto: `Hecho. ${n === 0 ? 'He rellenado lo que me has contado' : `He apuntado ${n} ${n === 1 ? 'examen o entrega' : 'exámenes o entregas'}`}: revisa los tres pasos antes de empezar.`,
      error: false,
    });
    setNotas(r.datos.notas);
    setTexto('');
  };

  return (
    <Plegable
      titulo="Cuéntamelo y lo preparo"
      resumen="Escribe cómo va a ser tu época y relleno el formulario por ti."
      abierto={!!mensaje}>
      <CampoTexto
        etiqueta="Qué se viene, cuándo y cómo quieres organizarte"
        placeholder={EJEMPLO}
        value={texto}
        onChangeText={setTexto}
        multiline
        maxLength={MAX_TEXTO_EPOCA}
        autoCapitalize="sentences"
        style={estilos.campo}
        ayuda="También puedes dictarlo con el micro del teclado."
      />
      <Boton
        titulo={ocupado ? 'Preparándolo…' : 'Prepararlo'}
        disabled={ocupado || !texto.trim()}
        onPress={preparar}
      />
      {mensaje ? (
        <View style={estilos.resultado} accessibilityLiveRegion="polite">
          <Texto fuerte style={mensaje.error ? estilos.error : null}>
            {mensaje.texto}
          </Texto>
          {notas ? <Texto secundario>{notas}</Texto> : null}
        </View>
      ) : null}
      <Texto pequeno secundario>
        Lo que escribas se envía a la IA (Claude, de Anthropic) solo para prepararlo. No se guarda en ningún
        servidor.
      </Texto>
    </Plegable>
  );
}

const estilos = StyleSheet.create({
  campo: { minHeight: 120, paddingVertical: espacio.s, textAlignVertical: 'top' },
  resultado: { gap: espacio.xs },
  error: { color: colores.aviso },
});
