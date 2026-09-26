import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Interruptor, Pantalla, Tarjeta, Texto, Titulo } from '@/components';
import { marcarVotosVistos, usePlanes, type Plan } from '@/data/planes';
import { avisosDisponibles } from '@/services/avisos';
import { claveDia } from '@/services/fechas';
import {
  actualizarPlanes,
  borrarPlan,
  cambiarRecordar,
  cerrarPlan,
  contarVotos,
  enlaceVotacion,
  enlaceWhatsapp,
  ganadoras,
  situacionPlan,
  textoConfirmacion,
  textoGanan,
  textoInvitacion,
  textoRecordatorio,
} from '@/services/planes';
import { colores, espacio } from '@/theme';

import { MensajeError } from './formulario-perfil/MensajeError';
import { abrirWhatsapp, BaldosaTipo, BotonVolver, BotonWhatsapp, FilaVotos, textoDia } from './planes/piezas';

// Un plan (fase 8): los votos de cada hora, "Cerrar plan" (crea el evento en el
// calendario y prepara la confirmación para WhatsApp), el recordatorio y borrar.

export function PantallaPlan() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cargado, planes } = usePlanes();
  const plan = planes.find((p) => p.id === id) ?? null;

  if (!cargado) {
    return (
      <Pantalla>
        <Texto secundario>Cargando…</Texto>
      </Pantalla>
    );
  }
  if (!plan) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto>Este plan ya no existe.</Texto>
      </Pantalla>
    );
  }
  return <FichaPlan plan={plan} />;
}

function FichaPlan({ plan }: { plan: Plan }) {
  const hoy = claveDia(new Date());
  const situacion = situacionPlan(plan, hoy);
  const filas = contarVotos(plan.horas, plan.votos);
  const primeras = ganadoras(filas);
  const total = Math.max(plan.invitados.length, plan.votos.length, 1);
  const [elegida, setElegida] = useState<string | null>(null);
  const [recienCerrado, setRecienCerrado] = useState(false);
  const [sinServidor, setSinServidor] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  // Al entrar (y al volver a la pantalla) se traen los votos nuevos.
  useFocusEffect(
    useCallback(() => {
      actualizarPlanes().catch(() => {});
    }, []),
  );
  // Lo que se ve ya no es "nuevo".
  useEffect(() => {
    marcarVotosVistos(plan.id);
  }, [plan.id, plan.votos.length]);

  // La hora para cerrar: la que elijas o, si no, la que gana (la primera si hay empate).
  const horaParaCerrar = elegida ?? primeras[0]?.hora.id ?? filas[0]?.hora.id ?? null;
  const horaCerrada = plan.horas.find((h) => h.id === plan.horaElegida) ?? null;
  const enlace = enlaceVotacion(plan.codigo);

  const cerrar = async () => {
    if (!horaParaCerrar) return;
    setOcupado(true);
    const { servidorAlDia } = await cerrarPlan(plan, horaParaCerrar);
    setSinServidor(!servidorAlDia);
    setRecienCerrado(true);
    setOcupado(false);
  };

  const borrar = async () => {
    setOcupado(true);
    await borrarPlan(plan);
    router.replace('/planes');
  };

  const textoCerrar = (() => {
    const hora = plan.horas.find((h) => h.id === horaParaCerrar);
    return hora ? `Cerrar: ${textoDia(hora.dia).toLocaleLowerCase('es-ES')} a las ${hora.hora}` : 'Cerrar plan';
  })();

  return (
    <Pantalla>
      <BotonVolver />
      <View style={estilos.cabecera}>
        <BaldosaTipo tipo={plan.tipo} grande />
        <View style={estilos.textos}>
          <Titulo>{plan.titulo}</Titulo>
          <Texto secundario>
            {plan.tipo === 'amigos' ? 'Con amigos' : 'Con un cliente'}
            {plan.invitados.length > 0 ? ` · ${plan.invitados.join(', ')}` : ''}
          </Texto>
        </View>
      </View>

      {horaCerrada ? (
        <Tarjeta>
          <Texto pequeno secundario>
            {situacion === 'pasado' ? 'Fue' : 'Queda'}
          </Texto>
          <Titulo nivel={2}>
            {textoDia(horaCerrada.dia)} · {horaCerrada.hora}
          </Titulo>
          {recienCerrado ? <Texto>Hecho: ya está en tu calendario.</Texto> : null}
          {sinServidor ? (
            <Texto pequeno secundario>
              Sin conexión: la página de votación aún no enseña la hora elegida.
            </Texto>
          ) : null}
        </Tarjeta>
      ) : (
        <Texto fuerte>
          {textoGanan(plan.horas, plan.votos, plan.invitados.length) ?? 'Nadie ha votado aún. Manda el enlace.'}
        </Texto>
      )}

      <View style={estilos.lista}>
        {filas.map((f) => {
          const eligiendo = situacion === 'votando';
          return (
            <FilaVotos
              key={f.hora.id}
              dia={f.hora.dia}
              hora={f.hora.hora}
              votos={f.votos}
              total={total}
              nombres={f.nombres}
              gana={horaCerrada ? f.hora.id === horaCerrada.id : primeras.includes(f)}
              modo={eligiendo ? 'elegir' : undefined}
              marcada={eligiendo && f.hora.id === horaParaCerrar}
              onPress={eligiendo ? () => setElegida(f.hora.id) : undefined}
            />
          );
        })}
      </View>

      {situacion === 'votando' ? (
        <>
          {!plan.enServidor ? (
            <MensajeError texto="Este plan ya no está en el servidor: no se puede votar más." />
          ) : null}
          <Boton titulo={ocupado ? 'Cerrando…' : textoCerrar} onPress={cerrar} disabled={ocupado || !horaParaCerrar} />
          <Texto pequeno secundario style={estilos.centrado}>
            Lo pongo en tu calendario y te preparo el mensaje para el grupo.
          </Texto>
          {plan.enServidor ? (
            <BotonWhatsapp
              titulo="Volver a mandar el enlace"
              onPress={() => abrirWhatsapp(enlaceWhatsapp(textoInvitacion(plan.organizador, plan.titulo, enlace)))}
            />
          ) : null}
        </>
      ) : null}

      {horaCerrada && situacion === 'cerrado' ? (
        <>
          <BotonWhatsapp
            titulo="Enviar la confirmación"
            onPress={() => abrirWhatsapp(enlaceWhatsapp(textoConfirmacion(plan.titulo, horaCerrada)))}
          />
          <Tarjeta style={estilos.vistaPrevia}>
            <Texto pequeno secundario>
              Así les llega
            </Texto>
            <Texto>{textoConfirmacion(plan.titulo, horaCerrada)}</Texto>
          </Tarjeta>
          {avisosDisponibles ? (
            <Interruptor
              etiqueta="Recordar a todos 3 h antes"
              ayuda="Te aviso con el mensaje ya escrito para el grupo."
              valor={plan.recordar}
              alCambiar={(valor) => cambiarRecordar(plan, valor)}
            />
          ) : null}
          <Boton
            titulo="Recordar ahora por WhatsApp"
            variante="secundario"
            onPress={() => abrirWhatsapp(enlaceWhatsapp(textoRecordatorio(plan.titulo, horaCerrada, new Date())))}
          />
          {plan.eventoId ? (
            <Boton
              titulo="Ver en el calendario"
              variante="secundario"
              onPress={() => router.push({ pathname: '/evento', params: { id: plan.eventoId! } })}
            />
          ) : null}
        </>
      ) : null}

      {confirmarBorrado ? (
        <Tarjeta>
          <Texto fuerte>¿Borro este plan?</Texto>
          <Texto secundario>
            Se borra de aquí y del servidor, y el enlace deja de funcionar.
            {plan.eventoId ? ' El evento del calendario se queda.' : ''}
          </Texto>
          <Boton titulo="Sí, borrar" onPress={borrar} disabled={ocupado} style={estilos.borrar} />
          <Boton titulo="No" variante="secundario" onPress={() => setConfirmarBorrado(false)} />
        </Tarjeta>
      ) : (
        <Boton titulo="Borrar plan" variante="secundario" onPress={() => setConfirmarBorrado(true)} />
      )}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  textos: { flex: 1, gap: 2 },
  lista: { gap: espacio.s },
  centrado: { textAlign: 'center', marginTop: -espacio.s },
  vistaPrevia: { gap: espacio.xs },
  borrar: { backgroundColor: colores.aviso },
});
