import { Texto } from '@/components';
import { useCalendarios } from '@/data/calendarios';
import type { Evento } from '@/data/eventos';
import { cambiadoAqui } from '@/services/calendarios';

// En la ficha de un evento traído de otro calendario: de dónde viene y qué pasa si
// lo cambias (lo tuyo manda y ya no se actualiza desde allí).
export function OrigenEvento({ evento }: { evento: Evento }) {
  const { calendarios } = useCalendarios();
  if (!evento.origen) return null;
  const calendario = calendarios.find((c) => c.id === evento.origen?.fuente);
  const nombre = calendario?.nombre ?? 'otro calendario';
  return (
    <Texto pequeno secundario>
      {cambiadoAqui(evento) || !calendario
        ? `Vino de ${nombre}. Ya es solo tuyo: lo de allí no lo cambia.`
        : `Viene de ${nombre} y se actualiza desde allí. Si lo cambias aquí, manda lo tuyo.`}
    </Texto>
  );
}
