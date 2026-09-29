import { useState } from 'react';

import { Interruptor, Texto, Titulo } from '@/components';
import type { AvisosEmpresa as Avisos } from '@/data/empresa';
import { cambiarAvisosEmpresa } from '@/services/empresa';
import { soyAdmin } from '@/services/empresa/roles';
import { textoFallo } from '@/services/empresa/textos';

import { Mensaje, useDatosEmpresa } from './piezas';

// Perfil > Avisos, con el plan empresa: qué avisos de la empresa quieres. Los manda el
// servidor (push), así que se guardan allí.
export function AvisosEmpresa() {
  const datos = useDatosEmpresa();
  const [error, setError] = useState<string | null>(null);
  if (!datos) return null;
  const cambiar = async (cambios: Partial<Avisos>) => {
    const r = await cambiarAvisosEmpresa(cambios);
    setError(r.ok ? null : textoFallo(r.motivo));
  };
  const a = datos.avisos;
  return (
    <>
      <Titulo nivel={3}>De la empresa</Titulo>
      <Texto pequeno secundario>
        Te llegan al momento, aunque tengas Organizy cerrado (en la web no hay avisos).
      </Texto>
      <Interruptor etiqueta="Turno nuevo o cambiado" valor={a.turnos} alCambiar={(v) => cambiar({ turnos: v })} />
      <Interruptor etiqueta="Tarea asignada" valor={a.tareas} alCambiar={(v) => cambiar({ tareas: v })} />
      <Interruptor etiqueta="Evento de empresa nuevo" valor={a.eventos} alCambiar={(v) => cambiar({ eventos: v })} />
      <Interruptor
        etiqueta="Cambios de turno"
        ayuda="Si te aprueban o rechazan un cambio (y, si organizas un equipo, cuando alguien lo pide)."
        valor={a.cambios}
        alCambiar={(v) => cambiar({ cambios: v })}
      />
      {soyAdmin(datos) ? (
        <Interruptor etiqueta="Alguien quiere entrar en la empresa" valor={a.altas} alCambiar={(v) => cambiar({ altas: v })} />
      ) : null}
      <Mensaje texto={error} />
    </>
  );
}
