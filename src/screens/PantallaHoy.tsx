import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AvisoPantallaInicio,
  Boton,
  BotonFlotante,
  BotonInicial,
  Casilla,
  Pantalla,
  Selector,
  Texto,
  Titulo,
} from '@/components';
import { useEnergia } from '@/data/energia';
import { marcarHecha, moverTareas, useEventos, type Evento } from '@/data/eventos';
import { usePerfil, type MomentoDelDia, type Perfil } from '@/data/perfil';
import {
  calcularHuecos,
  duracionTarea,
  eventosDelDia,
  fraseResumen,
  intervaloDe,
  repartirTareas,
  resolverLugar,
  siguienteEvento,
  tareasPendientes,
  ventanaDelDia,
  type Energia,
  type Intervalo,
  type Siguiente,
} from '@/services/agenda';
import {
  claveDia,
  fechaDesdeClave,
  formatearDiaCorto,
  formatearDuracion,
  horaDesdeMinutos,
  minutosDelDia,
  saludoSegunHora,
  sumarDias,
} from '@/services/fechas';
import { colores, espacio, radio } from '@/theme';

import { FilaEvento } from './calendario/FilaEvento';
import { TarjetaHueco } from './calendario/TarjetaHueco';
import { OPCIONES_ENERGIA, abrirEvento, nuevoEvento, rangoHoras } from './calendario/textos';
import { useAhora } from './calendario/useAhora';

const NOMBRE_MOMENTO: Record<MomentoDelDia, string> = {
  manana: 'por la mañana',
  tarde: 'por la tarde',
  noche: 'por la noche',
};

function explicacionEnergia(energia: Energia, rindeMas: MomentoDelDia): string {
  if (energia === 'a-tope') return `Te las coloco ${NOMBRE_MOMENTO[rindeMas]}, cuando rindes más.`;
  if (energia === 'normal') return 'Repartidas entre tus huecos libres.';
  return 'Hoy vas tranqui: como mucho 2.';
}

export function PantallaHoy() {
  const ahora = useAhora();
  const hoy = claveDia(ahora);
  const { perfil } = usePerfil();
  const { cargado, eventos } = useEventos();
  const [energia, setEnergia] = useEnergia(hoy);

  const nombre = perfil?.nombre ?? '';
  const saludo = saludoSegunHora(ahora) + (nombre ? `, ${nombre}` : '');
  const rindeMas = perfil?.rindeMas ?? 'manana';

  // Huecos a partir de ahora (redondeado al cuarto de hora) dentro del horario del perfil.
  const delDia = eventosDelDia(eventos, hoy);
  const ocupados = delDia.map(intervaloDe);
  const ventana = ventanaDelDia(perfil);
  const desde = Math.max(ventana.inicio, Math.ceil(minutosDelDia(ahora) / 15) * 15);
  const quedan = { inicio: desde, fin: ventana.fin };
  const huecos = calcularHuecos(ocupados, quedan);

  const pendientes = tareasPendientes(eventos, hoy, hoy);
  const reparto = repartirTareas(pendientes, duracionTarea, calcularHuecos(ocupados, quedan, 15), energia, rindeMas);
  const hechasHoy = eventos.filter((e) => e.flexible && e.hecha && e.fecha === hoy);

  const frase = fraseResumen({ eventos: delDia, tareasPendientes: pendientes.length, huecos });
  const siguiente = siguienteEvento(eventos, ahora);

  // Lista del día: eventos y huecos libres mezclados por orden de hora.
  const lista = [
    ...delDia.map((evento) => ({ inicio: intervaloDe(evento).inicio, evento, hueco: null })),
    ...huecos.map((hueco) => ({ inicio: hueco.inicio, evento: null, hueco })),
  ].sort((a, b) => a.inicio - b.inicio);
  const minutoActual = minutosDelDia(ahora);

  return (
    <View style={estilos.contenedor}>
      <Pantalla contentContainerStyle={estilos.contenido}>
        <View style={estilos.cabecera}>
          <View style={estilos.textos}>
            <Texto secundario>{formatearDiaCorto(ahora)}</Texto>
            <Titulo>{saludo}</Titulo>
          </View>
          <BotonInicial nombre={nombre} onPress={() => router.push('/perfil')} />
        </View>
        <AvisoPantallaInicio />

        <Selector
          etiqueta="¿Con cuánta energía vas hoy?"
          opciones={OPCIONES_ENERGIA}
          valor={energia}
          alCambiar={setEnergia}
        />

        {cargado ? (
          <>
            <Texto style={estilos.resumen} accessibilityLiveRegion="polite">
              {frase}
            </Texto>

            {siguiente ? <TarjetaSiguiente siguiente={siguiente} hoy={hoy} perfil={perfil} /> : null}

            <Titulo nivel={2} style={estilos.seccion}>
              Tu día
            </Titulo>
            {lista.length === 0 ? (
              <Texto secundario>No tienes nada con hora fija hoy.</Texto>
            ) : (
              lista.map((item) =>
                item.evento ? (
                  <FilaEvento
                    key={item.evento.id}
                    evento={item.evento}
                    pasado={intervaloDe(item.evento).fin <= minutoActual}
                  />
                ) : (
                  <TarjetaHueco key={`hueco-${item.inicio}`} hueco={item.hueco as Intervalo} />
                ),
              )
            )}

            {pendientes.length + hechasHoy.length > 0 ? (
              <>
                <View style={estilos.seccion}>
                  <Titulo nivel={2}>Tareas flexibles</Titulo>
                  <Texto pequeno secundario>
                    {explicacionEnergia(energia, rindeMas)}
                  </Texto>
                </View>
                {reparto.colocadas.map((c) => (
                  <FilaTarea
                    key={c.tarea.id}
                    tarea={c.tarea}
                    detalle={`A las ${horaDesdeMinutos(c.inicio)} · ${formatearDuracion(duracionTarea(c.tarea))}`}
                  />
                ))}
                {reparto.sinHueco.map((tarea) => (
                  <FilaTarea
                    key={tarea.id}
                    tarea={tarea}
                    detalle={`Sin hueco hoy · ${formatearDuracion(duracionTarea(tarea))}`}
                  />
                ))}
                {reparto.paraManana.map((tarea) => (
                  <FilaTarea key={tarea.id} tarea={tarea} detalle="Mejor mañana" apagada />
                ))}
                {reparto.paraManana.length > 0 ? (
                  <Boton
                    variante="secundario"
                    titulo={`Pasar el resto a mañana (${reparto.paraManana.length})`}
                    onPress={() =>
                      moverTareas(
                        reparto.paraManana.map((t) => t.id),
                        sumarDias(hoy, 1),
                      )
                    }
                  />
                ) : null}
                {hechasHoy.map((tarea) => (
                  <FilaTarea key={tarea.id} tarea={tarea} detalle="Hecha" apagada />
                ))}
              </>
            ) : null}
          </>
        ) : (
          <Texto secundario>Cargando tu día…</Texto>
        )}
      </Pantalla>
      <BotonFlotante etiqueta="Añadir evento" onPress={() => nuevoEvento(hoy)} />
    </View>
  );
}

// Tarjeta naranja con el próximo evento (o el que está en curso).
type PropsSiguiente = { siguiente: Siguiente; hoy: string; perfil: Perfil | null };

function TarjetaSiguiente({ siguiente, hoy, perfil }: PropsSiguiente) {
  const { evento, dia, enCurso } = siguiente;
  const cuando = enCurso
    ? 'Ahora'
    : dia === hoy
      ? 'Siguiente'
      : dia === sumarDias(hoy, 1)
        ? 'Mañana'
        : formatearDiaCorto(fechaDesdeClave(dia));
  // Nombre del sitio (Casa, Trabajo...) y debajo su dirección.
  const lugar = resolverLugar(evento.lugar, perfil);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cuando}: ${evento.titulo}, ${rangoHoras(evento)}`}
      onPress={() => abrirEvento(evento.id)}
      style={({ pressed }) => [estilos.siguiente, pressed && estilos.pulsado]}>
      <Texto pequeno fuerte style={estilos.claro}>
        {cuando.toLocaleUpperCase('es-ES')} · {rangoHoras(evento)}
      </Texto>
      <Titulo nivel={2} style={estilos.claro}>
        {evento.titulo}
      </Titulo>
      {lugar?.nombre ? (
        <Texto fuerte style={estilos.claro}>
          {lugar.nombre}
        </Texto>
      ) : null}
      {lugar ? (
        <Texto pequeno style={estilos.claro}>
          {lugar.direccion}
        </Texto>
      ) : null}
    </Pressable>
  );
}

type PropsTarea = { tarea: Evento; detalle: string; apagada?: boolean };

function FilaTarea({ tarea, detalle, apagada }: PropsTarea) {
  return (
    <View style={[estilos.tarea, apagada && estilos.apagada]}>
      <Casilla
        marcada={tarea.hecha}
        alCambiar={(hecha) => marcarHecha(tarea.id, hecha)}
        etiqueta={`Marcar como hecha: ${tarea.titulo}`}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => abrirEvento(tarea.id)}
        style={({ pressed }) => [estilos.tareaTextos, pressed && estilos.pulsado]}>
        <Texto fuerte style={tarea.hecha && estilos.tachada}>
          {tarea.titulo}
        </Texto>
        <Texto pequeno secundario>
          {detalle}
        </Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingBottom: 120 }, // deja sitio al botón "+"
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.m },
  textos: { flex: 1 },
  resumen: { fontSize: 18, lineHeight: 26 },
  seccion: { marginTop: espacio.m },
  siguiente: {
    backgroundColor: colores.principal,
    borderRadius: radio.grande,
    padding: espacio.m,
    gap: espacio.xs,
  },
  claro: { color: colores.textoSobrePrincipal },
  pulsado: { opacity: 0.8 },
  tarea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    paddingRight: espacio.m,
    paddingVertical: espacio.xs,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.normal,
  },
  tareaTextos: { flex: 1, minHeight: 44, justifyContent: 'center' },
  apagada: { opacity: 0.55 },
  tachada: { textDecorationLine: 'line-through' },
});
