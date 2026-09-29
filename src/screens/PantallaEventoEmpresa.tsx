import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Boton,
  CampoTexto,
  Interruptor,
  Pantalla,
  Plegable,
  SelectorFecha,
  SelectorHora,
  SelectorVisual,
  Tarjeta,
  Texto,
  Titulo,
  type OpcionVisual,
} from '@/components';
import type { ClaseEvento, DatosEmpresa, EventoEmpresa, Respuesta } from '@/data/empresa';
import { hacerEnEmpresa } from '@/services/empresa';
import { equiposQueLlevo, gestionoEquipo, nombreDe, nombreEquipo, personasDe, soyAdmin } from '@/services/empresa/roles';
import { borrarEventoEmpresa, guardarEventoEmpresa, responder } from '@/services/empresa/servidor';
import { NOMBRE_CLASE, textoFallo } from '@/services/empresa/textos';
import { claveDia, fechaDesdeClave, formatearDiaCorto, horaDesdeMinutos, minutosDesdeHora } from '@/services/fechas';
import { ATRIBUCION_OPENSTREETMAP, buscarCoordenadas, usaOpenStreetMap } from '@/services/lugares';
import { espacio } from '@/theme';

import { BotonVolver, Chip, Chips, Confirmar, Mensaje, useDatosEmpresa, volver } from './empresa/piezas';

// /empresa-evento?id=… (ver, responder y, si lo gestionas, cambiar) o ?fecha=… (nuevo).

const OPCIONES_CLASE: OpcionVisual<ClaseEvento>[] = [
  { valor: 'reunion', etiqueta: 'Reunión', icono: 'people-outline' },
  { valor: 'formacion', etiqueta: 'Formación', icono: 'school-outline' },
  { valor: 'festivo', etiqueta: 'Festivo', icono: 'sunny-outline' },
  { valor: 'cierre', etiqueta: 'Cierre', icono: 'lock-closed-outline' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'ellipsis-horizontal' },
];

export function PantallaEventoEmpresa() {
  const datos = useDatosEmpresa();
  const { id, fecha, inicio } = useLocalSearchParams<{ id?: string; fecha?: string; inicio?: string }>();
  if (!datos) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Aún no estás dentro de una empresa.</Texto>
      </Pantalla>
    );
  }
  const evento = id ? datos.eventos.find((e) => e.id === id) ?? null : null;
  if (id && !evento) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Este evento ya no existe.</Texto>
      </Pantalla>
    );
  }
  const edita = evento ? gestionoEquipo(datos, evento.equipoId) : equiposQueLlevo(datos).length > 0 || soyAdmin(datos);
  return (
    <Pantalla>
      <BotonVolver />
      {evento && !edita ? <Detalle datos={datos} evento={evento} /> : null}
      {edita ? <Formulario datos={datos} evento={evento} fecha={fecha} inicio={inicio} /> : null}
      {evento?.pideRespuesta && edita ? <Respuestas datos={datos} evento={evento} /> : null}
    </Pantalla>
  );
}

function Detalle({ datos, evento }: { datos: DatosEmpresa; evento: EventoEmpresa }) {
  const [error, setError] = useState<string | null>(null);
  const mia = datos.respuestas.find((r) => r.eventoId === evento.id && r.usuario === datos.yo)?.respuesta ?? null;
  const contestar = async (r: Respuesta) => {
    const res = await hacerEnEmpresa(() => responder(datos.empresa.id, datos.yo, evento.id, mia === r ? null : r));
    setError(res.ok ? null : textoFallo(res.motivo));
  };
  return (
    <>
      <Texto secundario>
        {NOMBRE_CLASE[evento.clase]} · {nombreEquipo(datos, evento.equipoId)}
      </Texto>
      <Titulo>{evento.titulo}</Titulo>
      <Texto fuerte>
        {formatearDiaCorto(fechaDesdeClave(evento.fecha))}
        {evento.inicio ? ` · ${evento.inicio} – ${evento.fin}` : ' · Todo el día'}
      </Texto>
      {evento.lugar ? <Texto>{evento.lugar}</Texto> : null}
      {evento.notas ? <Texto secundario>{evento.notas}</Texto> : null}
      <Texto pequeno secundario>
        Es de la empresa: sale en tu calendario y no se cambia desde ahí.
      </Texto>
      {evento.pideRespuesta ? (
        <Tarjeta style={estilos.caja}>
          <Texto fuerte>¿Vienes?</Texto>
          <View style={estilos.fila}>
            <View style={estilos.flex}>
              <Boton variante={mia === 'voy' ? 'principal' : 'secundario'} titulo={mia === 'voy' ? 'Voy ✓' : 'Voy'} onPress={() => contestar('voy')} />
            </View>
            <View style={estilos.flex}>
              <Boton
                variante={mia === 'no-voy' ? 'principal' : 'secundario'}
                titulo={mia === 'no-voy' ? 'No voy ✓' : 'No voy'}
                onPress={() => contestar('no-voy')}
              />
            </View>
          </View>
          <Texto pequeno secundario>
            {mia === 'no-voy' ? 'No te lo cuento en tu día.' : 'Cuenta en tu día y te aviso antes, como tus eventos.'}
          </Texto>
        </Tarjeta>
      ) : null}
      <Mensaje texto={error} />
      {evento.pideRespuesta ? <Respuestas datos={datos} evento={evento} /> : null}
    </>
  );
}

function Respuestas({ datos, evento }: { datos: DatosEmpresa; evento: EventoEmpresa }) {
  const para = personasDe(datos, evento.equipoId);
  const de = (r: Respuesta) =>
    datos.respuestas.filter((x) => x.eventoId === evento.id && x.respuesta === r).map((x) => nombreDe(datos.miembros.find((m) => m.usuario === x.usuario)));
  const van = de('voy');
  const noVan = de('no-voy');
  const sinContestar = para.length - van.length - noVan.length;
  return (
    <Tarjeta style={estilos.caja}>
      <Texto fuerte>Respuestas</Texto>
      <Texto>Van ({van.length}): {van.join(', ') || 'nadie aún'}</Texto>
      <Texto>No van ({noVan.length}): {noVan.join(', ') || 'nadie'}</Texto>
      {sinContestar > 0 ? <Texto secundario>Sin contestar: {sinContestar}</Texto> : null}
    </Tarjeta>
  );
}

function Formulario({
  datos,
  evento,
  fecha,
  inicio,
}: {
  datos: DatosEmpresa;
  evento: EventoEmpresa | null;
  fecha?: string;
  inicio?: string;
}) {
  const admin = soyAdmin(datos);
  const equipos = equiposQueLlevo(datos);
  const [titulo, setTitulo] = useState(evento?.titulo ?? '');
  const [clase, setClase] = useState<ClaseEvento>(evento?.clase ?? 'reunion');
  const [equipoId, setEquipoId] = useState<string | null>(evento ? evento.equipoId : admin ? null : equipos[0]?.id ?? null);
  const [dia, setDia] = useState(evento?.fecha ?? fecha ?? claveDia(new Date()));
  const [todoElDia, setTodoElDia] = useState(evento ? !evento.inicio : false);
  const [desde, setDesde] = useState(evento?.inicio ?? inicio ?? '10:00');
  const [hasta, setHasta] = useState(evento?.fin ?? horaDesdeMinutos(Math.min(minutosDesdeHora(inicio ?? '10:00') + 60, 23 * 60 + 45)));
  const [lugar, setLugar] = useState(evento?.lugar ?? '');
  const [notas, setNotas] = useState(evento?.notas ?? '');
  const [pide, setPide] = useState(evento?.pideRespuesta ?? true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [borrar, setBorrar] = useState(false);

  const cambiarClase = (c: ClaseEvento) => {
    setClase(c);
    // Festivos y cierres suelen ser de todo el día y sin "¿Vienes?".
    if (!evento && (c === 'festivo' || c === 'cierre')) {
      setTodoElDia(true);
      setPide(false);
    }
  };

  const guardar = async () => {
    setError(null);
    if (!titulo.trim()) return setError('Ponle un título.');
    if (!todoElDia && minutosDesdeHora(hasta) <= minutosDesdeHora(desde)) return setError('La hora de acabar tiene que ser después de la de empezar.');
    setOcupado(true);
    let coordenadas = evento?.lugar === lugar.trim() ? evento.coordenadas : null;
    if (lugar.trim() && !coordenadas) {
      const r = await buscarCoordenadas(lugar.trim());
      if (r.estado === 'encontrado') coordenadas = r.coordenadas;
    }
    const r = await hacerEnEmpresa(() =>
      guardarEventoEmpresa(datos.empresa.id, {
        id: evento?.id,
        equipoId,
        titulo: titulo.trim(),
        clase,
        fecha: dia,
        inicio: todoElDia ? null : desde,
        fin: todoElDia ? null : hasta,
        lugar: lugar.trim(),
        coordenadas,
        notas: notas.trim(),
        pideRespuesta: pide,
      }),
    );
    setOcupado(false);
    if (!r.ok) return setError(textoFallo(r.motivo));
    volver('/empresa');
  };

  return (
    <>
      <Titulo>{evento ? 'Evento de empresa' : 'Nuevo evento de empresa'}</Titulo>
      <CampoTexto etiqueta="¿Qué es?" value={titulo} onChangeText={setTitulo} placeholder="Reunión de equipo" maxLength={80} />
      <SelectorVisual etiqueta="Tipo" opciones={OPCIONES_CLASE} valor={clase} alCambiar={cambiarClase} />
      <Texto pequeno secundario>
        ¿Para quién?
      </Texto>
      <Chips>
        {admin ? <Chip texto="Toda la empresa" elegido={equipoId === null} onPress={() => setEquipoId(null)} /> : null}
        {equipos.map((e) => (
          <Chip key={e.id} texto={e.nombre} elegido={equipoId === e.id} onPress={() => setEquipoId(e.id)} />
        ))}
      </Chips>
      <SelectorFecha etiqueta="Día" valor={dia} alCambiar={setDia} />
      <Interruptor etiqueta="Todo el día" valor={todoElDia} alCambiar={setTodoElDia} />
      {!todoElDia ? (
        <View style={estilos.fila}>
          <SelectorHora etiqueta="Empieza" valor={desde} alCambiar={setDesde} />
          <SelectorHora etiqueta="Acaba" valor={hasta} alCambiar={setHasta} />
        </View>
      ) : null}
      <Interruptor
        etiqueta="Preguntar «¿Vienes?»"
        ayuda="Cada uno contesta Voy o No voy, y tú ves quién va."
        valor={pide}
        alCambiar={setPide}
      />
      <Plegable titulo="Más ajustes" resumen={[lugar.trim() || 'Sin lugar', notas.trim() ? 'con notas' : null].filter(Boolean).join(' · ')}>
        <CampoTexto etiqueta="Dónde" value={lugar} onChangeText={setLugar} placeholder="Calle Mayor 3, Zaragoza" maxLength={200} />
        {usaOpenStreetMap ? (
          <Texto pequeno secundario>
            {ATRIBUCION_OPENSTREETMAP}
          </Texto>
        ) : null}
        <CampoTexto etiqueta="Notas" value={notas} onChangeText={setNotas} multiline maxLength={1000} />
      </Plegable>
      <Boton titulo={ocupado ? 'Guardando…' : 'Guardar'} disabled={ocupado} onPress={guardar} />
      <Mensaje texto={error} />
      {evento ? <Boton variante="secundario" titulo="Borrar el evento" onPress={() => setBorrar(true)} /> : null}
      {borrar && evento ? (
        <Confirmar
          texto="Se borra para todos los que lo tenían en su calendario."
          si="Borrar el evento"
          alSi={async () => {
            setBorrar(false);
            const r = await hacerEnEmpresa(() => borrarEventoEmpresa(evento.id));
            if (r.ok) volver('/empresa');
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
  flex: { flex: 1 },
});
