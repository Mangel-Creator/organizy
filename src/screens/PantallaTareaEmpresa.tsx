import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Boton, CampoTexto, Pantalla, Plegable, Selector, SelectorFecha, Tarjeta, Texto, Titulo } from '@/components';
import type { Cuadrante } from '@/data/eventos';
import type { DatosEmpresa, TareaEmpresa } from '@/data/empresa';
import { DATOS_CUADRANTE } from '@/services/agenda';
import { hacerEnEmpresa } from '@/services/empresa';
import { esTareaMia, paraQuien } from '@/services/empresa/calendario';
import { equiposQueLlevo, gestionoEquipo, nombreDe, nombreDeUsuario, personasDe, soyAdmin } from '@/services/empresa/roles';
import { borrarTarea, guardarTarea, marcarTarea } from '@/services/empresa/servidor';
import { textoFallo } from '@/services/empresa/textos';
import { claveDia, fechaDesdeClave, formatearDiaCorto, formatearDuracion, sumarDias } from '@/services/fechas';
import { colores, espacio } from '@/theme';

import { OPCIONES_DURACION } from './calendario/textos';
import { SelectorCuadrante } from './tareas/SelectorCuadrante';
import { BotonVolver, Chip, Chips, Confirmar, Mensaje, useDatosEmpresa, volver } from './empresa/piezas';

// /empresa-tarea?id=… (ver y marcarla; si la gestionas, cambiarla) o sin id (asignar una
// nueva a una persona o a un equipo, con fecha límite y la matriz de Eisenhower).

export function PantallaTareaEmpresa() {
  const datos = useDatosEmpresa();
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!datos) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Aún no estás dentro de una empresa.</Texto>
      </Pantalla>
    );
  }
  const tarea = id ? datos.tareas.find((t) => t.id === id) ?? null : null;
  if (id && !tarea) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Esta tarea ya no existe.</Texto>
      </Pantalla>
    );
  }
  const edita = tarea ? gestionoEquipo(datos, tarea.equipoId) : soyAdmin(datos) || equiposQueLlevo(datos).length > 0;
  return (
    <Pantalla>
      <BotonVolver />
      {tarea ? <Estado datos={datos} tarea={tarea} /> : null}
      {edita ? <Formulario datos={datos} tarea={tarea} /> : null}
    </Pantalla>
  );
}

function Estado({ datos, tarea }: { datos: DatosEmpresa; tarea: TareaEmpresa }) {
  const [error, setError] = useState<string | null>(null);
  const puedeMarcar = esTareaMia(datos, tarea) || gestionoEquipo(datos, tarea.equipoId);
  const hoy = claveDia(new Date());
  const marcar = async () => {
    const r = await hacerEnEmpresa(() => marcarTarea(tarea.id, !tarea.hecha));
    setError(r.ok ? null : textoFallo(r.motivo));
  };
  return (
    <>
      <Texto secundario>{paraQuien(datos, tarea)}</Texto>
      <Titulo>{tarea.titulo}</Titulo>
      <Texto fuerte style={!tarea.hecha && tarea.fechaLimite < hoy ? estilos.tarde : undefined}>
        {tarea.fechaLimite < hoy && !tarea.hecha ? 'Se pasó el ' : 'Para el '}
        {formatearDiaCorto(fechaDesdeClave(tarea.fechaLimite))} · {formatearDuracion(tarea.duracionMin)}
      </Texto>
      {tarea.cuadrante ? (
        <Texto style={tarea.cuadrante === 'hazlo' ? estilos.tarde : undefined}>{DATOS_CUADRANTE[tarea.cuadrante].nombre}</Texto>
      ) : null}
      {tarea.notas ? <Texto secundario>{tarea.notas}</Texto> : null}
      <Tarjeta style={estilos.caja}>
        <Texto fuerte>{tarea.hecha ? `Hecha por ${nombreDeUsuario(datos, tarea.hechaPor)}` : 'Sin hacer todavía'}</Texto>
        {puedeMarcar ? (
          <Boton variante={tarea.hecha ? 'secundario' : 'principal'} titulo={tarea.hecha ? 'No está hecha' : 'Marcar como hecha'} onPress={marcar} />
        ) : null}
      </Tarjeta>
      <Mensaje texto={error} />
    </>
  );
}

type Duracion = (typeof OPCIONES_DURACION)[number]['valor'];

function Formulario({ datos, tarea }: { datos: DatosEmpresa; tarea: TareaEmpresa | null }) {
  const admin = soyAdmin(datos);
  const equipos = equiposQueLlevo(datos);
  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [equipoId, setEquipoId] = useState<string | null>(tarea ? tarea.equipoId : admin ? null : equipos[0]?.id ?? null);
  const [usuario, setUsuario] = useState<string | null>(tarea ? tarea.usuario : null);
  const [limite, setLimite] = useState(tarea?.fechaLimite ?? sumarDias(claveDia(new Date()), 2));
  const [cuadrante, setCuadrante] = useState<Cuadrante | null>(tarea?.cuadrante ?? null);
  const [duracion, setDuracion] = useState<Duracion>(
    (['15', '30', '60', '120'].includes(String(tarea?.duracionMin)) ? String(tarea?.duracionMin) : '30') as Duracion,
  );
  const [notas, setNotas] = useState(tarea?.notas ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [borrar, setBorrar] = useState(false);
  const personas = personasDe(datos, equipoId);

  const guardar = async () => {
    setError(null);
    if (!titulo.trim()) return setError('Ponle un título.');
    if (!usuario && !equipoId) return setError('Elige a quién va (una persona o un equipo).');
    setOcupado(true);
    const r = await hacerEnEmpresa(() =>
      guardarTarea(datos.empresa.id, {
        id: tarea?.id,
        equipoId,
        usuario,
        titulo: titulo.trim(),
        notas: notas.trim(),
        fechaLimite: limite,
        cuadrante,
        duracionMin: Number(duracion),
      }),
    );
    setOcupado(false);
    if (!r.ok) return setError(textoFallo(r.motivo));
    volver('/empresa');
  };

  return (
    <>
      <Titulo nivel={tarea ? 2 : 1}>{tarea ? 'Cambiar la tarea' : 'Asignar una tarea'}</Titulo>
      <CampoTexto etiqueta="¿Qué hay que hacer?" value={titulo} onChangeText={setTitulo} placeholder="Hacer inventario" maxLength={120} />
      {admin || equipos.length > 1 ? (
        <>
          <Texto pequeno secundario>
            Equipo
          </Texto>
          <Chips>
            {admin ? (
              <Chip
                texto="Sin equipo"
                elegido={equipoId === null}
                onPress={() => {
                  setEquipoId(null);
                  setUsuario(null);
                }}
              />
            ) : null}
            {equipos.map((e) => (
              <Chip
                key={e.id}
                texto={e.nombre}
                elegido={equipoId === e.id}
                onPress={() => {
                  setEquipoId(e.id);
                  setUsuario(null);
                }}
              />
            ))}
          </Chips>
        </>
      ) : null}
      <Texto pequeno secundario>
        ¿Para quién?
      </Texto>
      <Chips>
        {equipoId ? <Chip texto="Todo el equipo" elegido={usuario === null} onPress={() => setUsuario(null)} /> : null}
        {personas.map((m) => (
          <Chip key={m.usuario} texto={nombreDe(m)} elegido={usuario === m.usuario} onPress={() => setUsuario(m.usuario)} />
        ))}
      </Chips>
      <SelectorFecha etiqueta="Fecha límite" valor={limite} alCambiar={setLimite} />
      <SelectorCuadrante etiqueta="¿Qué prioridad tiene?" valor={cuadrante} alCambiar={setCuadrante} />
      <Plegable titulo="Más ajustes" resumen={[`${formatearDuracion(Number(duracion))}`, notas.trim() ? 'con notas' : null].filter(Boolean).join(' · ')}>
        <Selector etiqueta="Cuánto lleva" opciones={OPCIONES_DURACION} valor={duracion} alCambiar={setDuracion} />
        <CampoTexto etiqueta="Notas" value={notas} onChangeText={setNotas} multiline maxLength={1000} />
      </Plegable>
      <Boton titulo={ocupado ? 'Guardando…' : tarea ? 'Guardar' : 'Asignar'} disabled={ocupado} onPress={guardar} />
      <Mensaje texto={error} />
      {tarea ? <Boton variante="secundario" titulo="Borrar la tarea" onPress={() => setBorrar(true)} /> : null}
      {borrar && tarea ? (
        <Confirmar
          texto="Se borra para quien la tenía."
          si="Borrar la tarea"
          alSi={async () => {
            setBorrar(false);
            const r = await hacerEnEmpresa(() => borrarTarea(tarea.id));
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
  tarde: { color: colores.aviso },
});
