import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Pantalla,
  Plegable,
  SelectorDias,
  SelectorFecha,
  SelectorHora,
  Tarjeta,
  Texto,
  Titulo,
} from '@/components';
import type { DatosEmpresa, Turno } from '@/data/empresa';
import { hacerEnEmpresa } from '@/services/empresa';
import { cruzaMedianoche, duracionTurno, tituloTurno } from '@/services/empresa/calendario';
import { equiposQueLlevo, gestionoEquipo, nombreDe, nombreDeUsuario, personasDe, soyAdmin } from '@/services/empresa/roles';
import { borrarTurno, guardarTurnos, pedirCambio, type TurnoNuevo } from '@/services/empresa/servidor';
import { textoFallo } from '@/services/empresa/textos';
import { claveDia, diaSemanaDesdeLunes, fechaDesdeClave, formatearDiaCorto, formatearDuracion, inicioDeSemana, sumarDias } from '@/services/fechas';
import { ATRIBUCION_OPENSTREETMAP, buscarCoordenadas, usaOpenStreetMap } from '@/services/lugares';
import { espacio } from '@/theme';

import { textoCambio } from './PantallaTurnos';
import { BotonVolver, Chip, Chips, Confirmar, Mensaje, useDatosEmpresa, volver } from './empresa/piezas';

// /empresa-turno?id=… (ver o, si lo gestionas, cambiar) o ?fecha=…&equipo=… (nuevo).
// El del turno puede pedir un cambio (otro día u horas, o que lo haga otra persona).

export function PantallaTurno() {
  const datos = useDatosEmpresa();
  const { id, fecha, equipo } = useLocalSearchParams<{ id?: string; fecha?: string; equipo?: string }>();
  if (!datos) {
    return (
      <Pantalla>
        <BotonVolver texto="Turnos" destino="/empresa-turnos" />
        <Texto secundario>Aún no estás dentro de una empresa.</Texto>
      </Pantalla>
    );
  }
  const turno = id ? datos.turnos.find((t) => t.id === id) ?? null : null;
  if (id && !turno) {
    return (
      <Pantalla>
        <BotonVolver texto="Turnos" destino="/empresa-turnos" />
        <Texto secundario>Este turno ya no existe.</Texto>
      </Pantalla>
    );
  }
  const edita = turno ? gestionoEquipo(datos, turno.equipoId) : soyAdmin(datos) || equiposQueLlevo(datos).length > 0;
  return (
    <Pantalla>
      <BotonVolver texto="Turnos" destino="/empresa-turnos" />
      {edita ? (
        <Formulario datos={datos} turno={turno} fecha={fecha} equipo={equipo} />
      ) : turno ? (
        <Detalle datos={datos} turno={turno} />
      ) : null}
    </Pantalla>
  );
}

function Detalle({ datos, turno }: { datos: DatosEmpresa; turno: Turno }) {
  const mio = turno.usuario === datos.yo;
  const [pedir, setPedir] = useState(false);
  const [dia, setDia] = useState(turno.fecha);
  const [entrada, setEntrada] = useState(turno.entrada);
  const [salida, setSalida] = useState(turno.salida);
  const [cubre, setCubre] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const pendiente = datos.cambios.find((c) => c.turnoId === turno.id && c.estado === 'pendiente');
  const companeros = personasDe(datos, turno.equipoId).filter((m) => m.usuario !== datos.yo);

  const enviar = async () => {
    setError(null);
    if (dia === turno.fecha && entrada === turno.entrada && salida === turno.salida && !cubre) {
      setError('Cambia el día, las horas o elige quién lo hace.');
      return;
    }
    const r = await hacerEnEmpresa(() =>
      pedirCambio(datos.empresa.id, datos.yo, {
        turnoId: turno.id,
        fecha: dia !== turno.fecha ? dia : null,
        entrada: entrada !== turno.entrada ? entrada : null,
        salida: salida !== turno.salida ? salida : null,
        cubre,
        motivo: motivo.trim(),
      }),
    );
    if (!r.ok) return setError(textoFallo(r.motivo));
    setPedir(false);
    setHecho('Pedido. Te aviso cuando te respondan.');
  };

  return (
    <>
      <Texto secundario>{mio ? 'Tu turno' : `Turno de ${nombreDeUsuario(datos, turno.usuario)}`}</Texto>
      <Titulo>{tituloTurno(datos, turno)}</Titulo>
      <Texto fuerte>
        {formatearDiaCorto(fechaDesdeClave(turno.fecha))} · {turno.entrada} – {turno.salida}
        {cruzaMedianoche(turno) ? ' (acaba al día siguiente)' : ''}
      </Texto>
      <Texto secundario>{formatearDuracion(duracionTurno(turno))}</Texto>
      <Texto>{turno.sitio || (mio ? 'En tu sitio «Trabajo»' : 'En el sitio de siempre')}</Texto>
      {turno.notas ? <Texto secundario>{turno.notas}</Texto> : null}
      {mio ? (
        <Texto pequeno secundario>
          Sale en tu calendario y cuenta para la hora de salida y la alarma inteligente, como el trabajo.
        </Texto>
      ) : null}
      <Mensaje texto={hecho} bien />
      {mio && pendiente ? (
        <Tarjeta style={estilos.caja}>
          <Texto>Has pedido: {textoCambio(datos, pendiente)}</Texto>
          <Texto pequeno secundario>
            Esperando respuesta.
          </Texto>
        </Tarjeta>
      ) : null}
      {mio && !pendiente && !pedir ? <Boton variante="secundario" titulo="Pedir un cambio" onPress={() => setPedir(true)} /> : null}
      {pedir ? (
        <Tarjeta style={estilos.caja}>
          <Titulo nivel={3}>Pedir un cambio</Titulo>
          <SelectorFecha etiqueta="Día" valor={dia} alCambiar={setDia} />
          <View style={estilos.fila}>
            <SelectorHora etiqueta="Entrada" valor={entrada} alCambiar={setEntrada} />
            <SelectorHora etiqueta="Salida" valor={salida} alCambiar={setSalida} />
          </View>
          {companeros.length > 0 ? (
            <>
              <Texto pequeno secundario>
                ¿Lo hace otra persona? (opcional)
              </Texto>
              <Chips>
                {companeros.map((m) => (
                  <Chip key={m.usuario} texto={nombreDe(m)} elegido={cubre === m.usuario} onPress={() => setCubre(cubre === m.usuario ? null : m.usuario)} />
                ))}
              </Chips>
            </>
          ) : null}
          <CampoTexto etiqueta="¿Por qué? (opcional)" value={motivo} onChangeText={setMotivo} maxLength={300} />
          <Boton titulo="Pedir el cambio" onPress={enviar} />
          <Boton variante="secundario" titulo="Cancelar" onPress={() => setPedir(false)} />
          <Mensaje texto={error} />
        </Tarjeta>
      ) : null}
    </>
  );
}

function Formulario({ datos, turno, fecha, equipo }: { datos: DatosEmpresa; turno: Turno | null; fecha?: string; equipo?: string }) {
  const admin = soyAdmin(datos);
  const equipos = equiposQueLlevo(datos);
  const [equipoId, setEquipoId] = useState<string | null>(turno ? turno.equipoId : equipo ?? (admin ? null : equipos[0]?.id ?? null));
  const [usuario, setUsuario] = useState<string | null>(turno?.usuario ?? null);
  const [dia, setDia] = useState(turno?.fecha ?? fecha ?? claveDia(new Date()));
  const [dias, setDias] = useState<number[]>(() => [diaSemanaDesdeLunes(fechaDesdeClave(turno?.fecha ?? fecha ?? claveDia(new Date())))]);
  const [entrada, setEntrada] = useState(turno?.entrada ?? '09:00');
  const [salida, setSalida] = useState(turno?.salida ?? '17:00');
  const [sitio, setSitio] = useState(turno?.sitio ?? '');
  const [notas, setNotas] = useState(turno?.notas ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const personas = personasDe(datos, equipoId);

  const guardar = async () => {
    setError(null);
    if (!usuario) return setError('Elige a quién va el turno.');
    if (entrada === salida) return setError('La entrada y la salida no pueden ser a la misma hora.');
    setOcupado(true);
    let coordenadas = turno?.sitio === sitio.trim() ? turno.coordenadas : null;
    if (sitio.trim() && !coordenadas) {
      const r = await buscarCoordenadas(sitio.trim());
      if (r.estado === 'encontrado') coordenadas = r.coordenadas;
    }
    const comun = { equipoId, usuario, entrada, salida, sitio: sitio.trim(), coordenadas, notas: notas.trim() };
    // Nuevo: uno por cada día marcado de esa semana (llega un solo aviso: "5 turnos nuevos").
    const lunes = claveDia(inicioDeSemana(fechaDesdeClave(dia)));
    const turnos: TurnoNuevo[] = turno
      ? [{ ...comun, id: turno.id, fecha: dia }]
      : [...dias].sort().map((d) => ({ ...comun, fecha: sumarDias(lunes, d) }));
    const r = await hacerEnEmpresa(() => guardarTurnos(datos.empresa.id, turnos));
    setOcupado(false);
    if (!r.ok) return setError(textoFallo(r.motivo));
    volver('/empresa-turnos');
  };

  return (
    <>
      <Titulo>{turno ? 'Turno' : 'Nuevo turno'}</Titulo>
      {admin || equipos.length > 1 ? (
        <>
          <Texto pequeno secundario>
            Equipo
          </Texto>
          <Chips>
            {admin ? <Chip texto="Sin equipo" elegido={equipoId === null} onPress={() => setEquipoId(null)} /> : null}
            {equipos.map((e) => (
              <Chip key={e.id} texto={e.nombre} elegido={equipoId === e.id} onPress={() => setEquipoId(e.id)} />
            ))}
          </Chips>
        </>
      ) : null}
      <Texto pequeno secundario>
        ¿Para quién?
      </Texto>
      <Chips>
        {personas.map((m) => (
          <Chip key={m.usuario} texto={nombreDe(m)} elegido={usuario === m.usuario} onPress={() => setUsuario(m.usuario)} />
        ))}
      </Chips>
      {personas.length === 0 ? <Texto secundario>En este equipo aún no hay nadie.</Texto> : null}
      {turno ? (
        <SelectorFecha etiqueta="Día" valor={dia} alCambiar={setDia} />
      ) : (
        <>
          <Texto secundario>Semana del {formatearDiaCorto(inicioDeSemana(fechaDesdeClave(dia)))}</Texto>
          <SelectorDias etiqueta="Qué días (puedes marcar varios)" valor={dias} alCambiar={setDias} />
        </>
      )}
      <View style={estilos.fila}>
        <SelectorHora etiqueta="Entrada" valor={entrada} alCambiar={setEntrada} />
        <SelectorHora etiqueta="Salida" valor={salida} alCambiar={setSalida} />
      </View>
      {entrada !== salida && cruzaMedianoche({ entrada, salida }) ? (
        <Texto pequeno secundario>
          Acaba al día siguiente ({formatearDuracion(duracionTurno({ entrada, salida }))}).
        </Texto>
      ) : null}
      <Plegable titulo="Más ajustes" resumen={[sitio.trim() || 'En su sitio «Trabajo»', notas.trim() ? 'con notas' : null].filter(Boolean).join(' · ')}>
        <CampoTexto
          etiqueta="Dónde"
          ayuda="Vacío: en el sitio «Trabajo» de cada uno. Sirve para su hora de salida y su alarma."
          value={sitio}
          onChangeText={setSitio}
          maxLength={200}
        />
        {usaOpenStreetMap ? (
          <Texto pequeno secundario>
            {ATRIBUCION_OPENSTREETMAP}
          </Texto>
        ) : null}
        <CampoTexto etiqueta="Notas" value={notas} onChangeText={setNotas} maxLength={300} />
      </Plegable>
      <Boton titulo={ocupado ? 'Guardando…' : 'Guardar'} disabled={ocupado || (!turno && dias.length === 0)} onPress={guardar} />
      <Mensaje texto={error} />
      {turno ? <Boton variante="secundario" titulo="Quitar el turno" onPress={() => setBorrar(true)} /> : null}
      {borrar && turno ? (
        <Confirmar
          texto={`Se quita el turno de ${nombreDeUsuario(datos, turno.usuario)} y le llega un aviso.`}
          si="Quitar el turno"
          alSi={async () => {
            setBorrar(false);
            const r = await hacerEnEmpresa(() => borrarTurno(turno.id));
            if (r.ok) volver('/empresa-turnos');
            else setError(textoFallo(r.motivo));
          }}
          alNo={() => setBorrar(false)}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.s },
  fila: { flexDirection: 'row', gap: espacio.m },
});
