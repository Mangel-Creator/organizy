import { setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// Voz de la app (indicaciones de la navegación). En el móvil usa la voz del sistema
// (expo-speech) y en la web la del navegador. En español de España.
//
// En el iPhone se pide sonar aunque el interruptor de silencio esté puesto y bajar un
// poco la música mientras habla (como los navegadores). Si aun así no suena en
// silencio, es una limitación de Expo Go: en la app propia sí.

let preparada: Promise<void> | null = null;

export function prepararVoz(): Promise<void> {
  if (!preparada) {
    preparada =
      Platform.OS === 'web'
        ? Promise.resolve()
        : setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'duckOthers' }).catch(
            () => {},
          );
  }
  return preparada;
}

// Dice el texto. Si ya está hablando, lo pone a la cola (no corta la frase anterior).
export function hablar(texto: string): void {
  Speech.speak(texto, { language: 'es-ES' });
}

export function callar(): void {
  Speech.stop();
}
