import { useEffect, useState } from 'react';

// La hora actual, que se actualiza sola cada minuto (para que "Siguiente",
// los huecos libres y los eventos pasados cambien sin tocar nada).
export function useAhora(): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);
  return ahora;
}
