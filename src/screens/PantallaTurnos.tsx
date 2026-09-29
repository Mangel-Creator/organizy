import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Boton, Pantalla, Tarjeta, Texto, Titulo } from '@/components';
import type { CambioTurno, DatosEmpresa, Turno } from '@/data/empresa';
import { hacerEnEmpresa } from '@/services/empresa';
import { cruzaMedianoche, tituloTurno } from '@/services/empresa/calendario';
import { equiposQueLlevo, gestionoAlgo, gestionoEquipo, nombreDeUsuario, personasDe, soyAdmin } from '@/services/empresa/roles';
import { guardarTurnos, resolverCambio, retirarCambio, type TurnoNuevo } from '@/services/empresa/servidor';
import { textoFallo } from '@/services/empresa/textos';
import { claveDia, fechaDesdeClave, formatearDiaCorto, inicioDeSemana, numeroSemana, sumarDias } from '@/services/fechas';
import { alturaTactil, colores, espacio, radio } from '@/theme';

import { BotonVolver, Chip, Chips, FilaEmpresa, Mensaje, useDatosEmpresa } from './empresa/piezas';

// /empresa-turnos: los turnos de la semana. Cada uno ve los suyos y los de sus equipos;
// quien gestiona un equipo los reparte, copia la semana anterior y aprueba los cambios.

export function PantallaTurnos() {
  const datos = useDatosEmpresa();
  const [lunes, setLunes] = useState(() => claveDia(inicioDeSemana(new Date())));
  const [equipo, setEquipo] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  if (!datos) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Aún no estás dentro de una empresa.</Texto>
      </Pantalla>
    );
  }

  const gestiona = gestionoAlgo(datos);
  const equipos = soyAdmin(datos) ? datos.equipos : gestiona ? equiposQueLlevo(datos) : datos.equipos.filter((e) => datos.enEquipos.some((m) => m.equipoId === e.id && m.usuario === datos.yo));
  // Qué equipo se ve (por defecto, el primero que llevo; el administrador puede ver "Todos").
  const elegido = equipo === undefined ? (soyAdmin(datos) ? null : equipos[0]?.id ?? null) : equipo;
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const hoy = claveDia(new Date());

  const deLaSemana = (t: Turno) => t.fecha >= lunes && t.fecha < sumarDias(lunes, 7);
  const mios = datos.turnos.filter((t) => t.usuario === datos.yo && deLaSemana(t)).sort(ordenTurno);
  const delEquipo = datos.turnos
    .filter((t) => deLaSemana(t) && (elegido === null ? soyAdmin(datos) : t.equipoId === elegido))
    .sort(ordenTurno);
  const puedoEditar = gestionoEquipo(datos, elegido);
  const misCambios = datos.cambios.filter((c) => c.usuario === datos.yo && c.estado === 'pendiente');
  const porResolver = datos.cambios.filter((c) => {
    const t = datos.turnos.find((x) => x.id === c.turnoId);
    return c.estado === 'pendiente' && c.usuario !== datos.yo && !!t && gestionoEquipo(datos, t.equipoId);
  });

  const hacer = async (accion: () => Promise<unknown>, bien?: string) => {
    setError(null);
    setHecho(null);
    const r = await hacerEnEmpresa(accion);
    if (!r.ok) setError(textoFallo(r.motivo));
    else if (bien) setHecho(bien);
  };

  // Copia los turnos de la semana anterior (del equipo que se ve) a esta, menos los que
  // ya estén (misma persona, mismo día y misma hora).
  const copiarSemanaAnterior = () => {
    const antes = sumarDias(lunes, -7);
    const nuevos: TurnoNuevo[] = datos.turnos
      .filter((t) => t.fecha >= antes && t.fecha < lunes && (elegido === null || t.equipoId === elegido))
      .map((t) => ({ ...t, id: undefined, fecha: sumarDias(t.fecha, 7) }))
      .filter((n) => !datos.turnos.some((t) => t.usuario === n.usuario && t.fecha === n.fecha && t.entrada === n.entrada));
    if (nuevos.length === 0) {
      setHecho('No había nada que copiar: la semana anterior está vacía o ya está copiada.');
      return;
    }
    hacer(() => guardarTurnos(datos.empresa.id, nuevos), `Copiados ${nuevos.length} turnos. Les llega un aviso.`);
  };

  return (
    <Pantalla>
      <BotonVolver />
      <View style={estilos.cabecera}>
        <View style={estilos.flex}>
          <Titulo>Turnos</Titulo>
          <Texto secundario>
            Semana {numeroSemana(fechaDesdeClave(lunes))} · {formatearDiaCorto(fechaDesdeClave(lunes))}
          </Texto>
        </View>
        <Flecha icono="chevron-back" etiqueta="Semana anterior" onPress={() => setLunes(sumarDias(lunes, -7))} />
        <Flecha icono="chevron-forward" etiqueta="Semana siguiente" onPress={() => setLunes(sumarDias(lunes, 7))} />
      </View>
      <Mensaje texto={error} />
      <Mensaje texto={hecho} bien />

      <Titulo nivel={2}>Los tuyos</Titulo>
      {mios.length === 0 ? <Texto secundario>Esta semana no tienes turnos.</Texto> : null}
      {mios.map((t) => (
        <FilaTurno key={t.id} datos={datos} turno={t} conPersona={false} />
      ))}
      {misCambios.map((c) => (
        <Tarjeta key={c.id} style={estilos.caja}>
          <Texto>Has pedido: {textoCambio(datos, c)}</Texto>
          <Texto pequeno secundario>
            Esperando respuesta.
          </Texto>
          <Boton variante="secundario" titulo="Retirar la petición" onPress={() => hacer(() => retirarCambio(c.id))} />
        </Tarjeta>
      ))}

      {porResolver.length > 0 ? (
        <>
          <Titulo nivel={2}>Cambios por mirar</Titulo>
          {porResolver.map((c) => (
            <Tarjeta key={c.id} style={estilos.caja}>
              <Texto fuerte>{nombreDeUsuario(datos, c.usuario)}</Texto>
              <Texto>{textoCambio(datos, c)}</Texto>
              {c.motivo ? <Texto secundario>«{c.motivo}»</Texto> : null}
              <View style={estilos.botones}>
                <View style={estilos.flex}>
                  <Boton titulo="Aprobar" onPress={() => hacer(() => resolverCambio(c.id, true), 'Aprobado. Le llega un aviso.')} />
                </View>
                <View style={estilos.flex}>
                  <Boton variante="secundario" titulo="Rechazar" onPress={() => hacer(() => resolverCambio(c.id, false))} />
                </View>
              </View>
            </Tarjeta>
          ))}
        </>
      ) : null}

      {equipos.length > 0 || soyAdmin(datos) ? (
        <>
          <Titulo nivel={2}>{gestiona ? 'Repartir' : 'Tu equipo'}</Titulo>
          {equipos.length > 1 || soyAdmin(datos) ? (
            <Chips>
              {soyAdmin(datos) ? <Chip texto="Todos" elegido={elegido === null} onPress={() => setEquipo(null)} /> : null}
              {equipos.map((e) => (
                <Chip key={e.id} texto={e.nombre} elegido={elegido === e.id} onPress={() => setEquipo(e.id)} />
              ))}
            </Chips>
          ) : null}
          {puedoEditar ? <Boton variante="secundario" titulo="Copiar la semana anterior" onPress={copiarSemanaAnterior} /> : null}
          {dias.map((dia) => {
            const delDia = delEquipo.filter((t) => t.fecha === dia);
            return (
              <View key={dia} style={estilos.dia}>
                <Texto fuerte style={dia === hoy ? estilos.hoy : undefined}>
                  {formatearDiaCorto(fechaDesdeClave(dia))}
                </Texto>
                {delDia.length === 0 && !puedoEditar ? <Texto pequeno secundario>Nadie</Texto> : null}
                {delDia.map((t) => (
                  <FilaTurno key={t.id} datos={datos} turno={t} conPersona />
                ))}
                {puedoEditar ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Añadir turno el ${formatearDiaCorto(fechaDesdeClave(dia))}`}
                    onPress={() => router.push({ pathname: '/empresa-turno', params: { fecha: dia, ...(elegido ? { equipo: elegido } : {}) } })}
                    style={({ pressed }) => [estilos.anadir, pressed && estilos.pulsado]}>
                    <Ionicons name="add" size={18} color={colores.principal} />
                    <Texto pequeno fuerte style={estilos.azul}>
                      Añadir turno
                    </Texto>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
          {personasDe(datos, elegido).length === 0 ? (
            <Texto pequeno secundario>
              En este equipo aún no hay nadie. Mételes desde Equipo.
            </Texto>
          ) : null}
        </>
      ) : null}
    </Pantalla>
  );
}

function ordenTurno(a: Turno, b: Turno) {
  return `${a.fecha} ${a.entrada}`.localeCompare(`${b.fecha} ${b.entrada}`);
}

// "Pasar al mar 6 oct, de 10:00 a 18:00, que lo haga Javi"
export function textoCambio(datos: DatosEmpresa, c: CambioTurno): string {
  const t = datos.turnos.find((x) => x.id === c.turnoId);
  const partes = [
    c.fecha && c.fecha !== t?.fecha ? `pasar al ${formatearDiaCorto(fechaDesdeClave(c.fecha))}` : null,
    c.entrada || c.salida ? `de ${c.entrada ?? t?.entrada} a ${c.salida ?? t?.salida}` : null,
    c.cubre ? `que lo haga ${nombreDeUsuario(datos, c.cubre)}` : null,
  ].filter(Boolean);
  const cual = t ? `el turno del ${formatearDiaCorto(fechaDesdeClave(t.fecha))}` : 'un turno';
  return `${cual}: ${partes.join(', ') || 'cambiarlo'}.`;
}

function FilaTurno({ datos, turno, conPersona }: { datos: DatosEmpresa; turno: Turno; conPersona: boolean }) {
  const cambioPendiente = datos.cambios.some((c) => c.turnoId === turno.id && c.estado === 'pendiente');
  return (
    <FilaEmpresa
      titulo={conPersona ? nombreDeUsuario(datos, turno.usuario) : tituloTurno(datos, turno)}
      hora={turno.entrada}
      horaFin={turno.salida}
      detalle={[
        conPersona ? null : formatearDiaCorto(fechaDesdeClave(turno.fecha)),
        cruzaMedianoche(turno) ? 'acaba al día siguiente' : null,
        turno.sitio || null,
        cambioPendiente ? 'Cambio pedido' : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      onPress={() => router.push({ pathname: '/empresa-turno', params: { id: turno.id } })}
    />
  );
}

function Flecha({ icono, etiqueta, onPress }: { icono: 'chevron-back' | 'chevron-forward'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [estilos.flecha, pressed && estilos.pulsado]}>
      <Ionicons name={icono} size={22} color={colores.texto} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  flex: { flex: 1 },
  caja: { gap: espacio.s },
  botones: { flexDirection: 'row', gap: espacio.s },
  dia: { gap: espacio.xs },
  hoy: { color: colores.principal },
  anadir: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, minHeight: alturaTactil, alignSelf: 'flex-start' },
  azul: { color: colores.principal },
  pulsado: { opacity: 0.7 },
  flecha: {
    width: alturaTactil,
    height: alturaTactil,
    borderRadius: radio.normal,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
