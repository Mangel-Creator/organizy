import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Interruptor, Pantalla, Plegable, Tarjeta, Texto, Titulo } from '@/components';
import type { Anuncio, DatosEmpresa } from '@/data/empresa';
import { actualizarEmpresa, hacerEnEmpresa } from '@/services/empresa';
import { heLeido, lecturas, nombreAutor, ordenarAnuncios } from '@/services/empresa/chat';
import { equiposQueLlevo, gestionoAlgo, gestionoEquipo, nombreDe, nombreEquipo, soyAdmin } from '@/services/empresa/roles';
import { borrarAnuncio, marcarAnuncioLeido, publicarAnuncio } from '@/services/empresa/servidor';
import { textoFallo } from '@/services/empresa/textos';
import { colores, espacio, fuentes } from '@/theme';

import { BotonVolver, Chip, Chips, Confirmar, Mensaje, useDatosEmpresa } from './empresa/piezas';

// /empresa-avisos: los avisos que publican el administrador (a todos o a un equipo) y los
// responsables (a su equipo), como los anuncios de Teams. Cada uno pulsa "Leído" y quien lo
// publicó ve quién lo ha leído y a quién le falta. Los importantes, en granate y arriba.

export function PantallaAnuncios() {
  const datos = useDatosEmpresa();
  useFocusEffect(
    useCallback(() => {
      actualizarEmpresa();
    }, []),
  );
  if (!datos) {
    return (
      <Pantalla>
        <BotonVolver />
        <Texto secundario>Aún no estás dentro de una empresa.</Texto>
      </Pantalla>
    );
  }
  const lista = ordenarAnuncios(datos);
  return (
    <Pantalla>
      <BotonVolver />
      <Titulo>Avisos</Titulo>
      <Texto secundario>Lo que publican el jefe y los responsables. Pulsa «Leído» cuando lo hayas visto.</Texto>
      {gestionoAlgo(datos) ? <Publicar datos={datos} /> : null}
      {lista.length === 0 ? <Texto secundario>Todavía no hay avisos.</Texto> : null}
      {lista.map((a) => (
        <TarjetaAnuncio key={a.id} datos={datos} anuncio={a} />
      ))}
    </Pantalla>
  );
}

function Publicar({ datos }: { datos: DatosEmpresa }) {
  const admin = soyAdmin(datos);
  const equipos = equiposQueLlevo(datos);
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [equipoId, setEquipoId] = useState<string | null>(admin ? null : equipos[0]?.id ?? null);
  const [importante, setImportante] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const publicar = async () => {
    setError(null);
    if (!titulo.trim()) return setError('Ponle un título.');
    const r = await hacerEnEmpresa(() => publicarAnuncio(datos.empresa.id, { equipoId, titulo: titulo.trim(), texto: texto.trim(), importante }));
    if (!r.ok) return setError(textoFallo(r.motivo));
    setTitulo('');
    setTexto('');
    setImportante(false);
    setAbierto(false);
    setHecho('Publicado. Les llega un aviso al móvil.');
  };

  if (!abierto) {
    return (
      <>
        <Boton titulo="Publicar un aviso" onPress={() => { setHecho(null); setAbierto(true); }} />
        <Mensaje texto={hecho} bien />
      </>
    );
  }
  return (
    <Tarjeta style={estilos.caja}>
      <Titulo nivel={3}>Nuevo aviso</Titulo>
      <CampoTexto etiqueta="Título" value={titulo} onChangeText={setTitulo} placeholder="Cambia el horario de verano" maxLength={120} />
      <CampoTexto etiqueta="Qué quieres contar" value={texto} onChangeText={setTexto} multiline maxLength={4000} />
      <Texto pequeno secundario>
        ¿Para quién?
      </Texto>
      <Chips>
        {admin ? <Chip texto="Toda la empresa" elegido={equipoId === null} onPress={() => setEquipoId(null)} /> : null}
        {equipos.map((e) => (
          <Chip key={e.id} texto={e.nombre} elegido={equipoId === e.id} onPress={() => setEquipoId(e.id)} />
        ))}
      </Chips>
      <Interruptor
        etiqueta="Importante"
        ayuda="Sale arriba, en granate, hasta que lo lean."
        valor={importante}
        alCambiar={setImportante}
      />
      <Boton titulo="Publicar" onPress={publicar} />
      <Boton variante="secundario" titulo="Cancelar" onPress={() => setAbierto(false)} />
      <Mensaje texto={error} />
    </Tarjeta>
  );
}

function TarjetaAnuncio({ datos, anuncio }: { datos: DatosEmpresa; anuncio: Anuncio }) {
  const [error, setError] = useState<string | null>(null);
  const [borrar, setBorrar] = useState(false);
  const leido = heLeido(datos, anuncio);
  const mio = anuncio.autor === datos.yo;
  const gestiona = mio || gestionoEquipo(datos, anuncio.equipoId);
  const { leido: yaLo, falta } = lecturas(datos, anuncio);
  const cuando = new Date(anuncio.creado).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  const marcar = async () => {
    const r = await hacerEnEmpresa(() => marcarAnuncioLeido(anuncio.id, datos.yo));
    setError(r.ok ? null : textoFallo(r.motivo));
  };

  return (
    <Tarjeta style={[estilos.caja, estilos.anuncio, { borderLeftColor: anuncio.importante ? colores.aviso : colores.empresa }]}>
      {anuncio.importante ? (
        <Texto pequeno style={estilos.importante}>
          Importante
        </Texto>
      ) : null}
      <Titulo nivel={3}>{anuncio.titulo}</Titulo>
      <Texto pequeno secundario>
        {mio ? 'Tú' : nombreAutor(datos, anuncio.autor)} · {nombreEquipo(datos, anuncio.equipoId)} · {cuando}
      </Texto>
      {anuncio.texto ? <Texto>{anuncio.texto}</Texto> : null}
      {!mio ? (
        leido ? (
          <Texto pequeno fuerte>
            Leído
          </Texto>
        ) : (
          <Boton titulo="Leído" onPress={marcar} />
        )
      ) : null}
      {gestiona ? (
        <Plegable titulo={`Leído por ${yaLo.length} de ${yaLo.length + falta.length}`} resumen={falta.length ? `Falta: ${falta.map(nombreDe).join(', ')}` : 'Lo han leído todos'}>
          <Texto pequeno>Lo han leído: {yaLo.map(nombreDe).join(', ') || 'nadie aún'}</Texto>
          {falta.length > 0 ? <Texto pequeno secundario>Falta: {falta.map(nombreDe).join(', ')}</Texto> : null}
          <View>
            <Boton variante="secundario" titulo="Borrar el aviso" onPress={() => setBorrar(true)} />
          </View>
        </Plegable>
      ) : null}
      {borrar ? (
        <Confirmar
          texto="Se borra para todos."
          si="Borrar el aviso"
          alSi={async () => {
            setBorrar(false);
            const r = await hacerEnEmpresa(() => borrarAnuncio(anuncio.id));
            if (!r.ok) setError(textoFallo(r.motivo));
          }}
          alNo={() => setBorrar(false)}
        />
      ) : null}
      <Mensaje texto={error} />
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.s },
  anuncio: { borderLeftWidth: 4 },
  importante: { color: colores.aviso, fontFamily: fuentes.textoFuerte },
});
