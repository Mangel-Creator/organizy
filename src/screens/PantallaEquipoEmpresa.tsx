import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Boton, CampoTexto, Interruptor, Pantalla, Plegable, Selector, Tarjeta, Texto, Titulo } from '@/components';
import type { DatosEmpresa, Miembro } from '@/data/empresa';
import { hacerEnEmpresa, type Resultado } from '@/services/empresa';
import { NOMBRE_PAPEL, equiposDe, nombreDe, papelDe, soyAdmin } from '@/services/empresa/roles';
import {
  ajustesEmpresa,
  anularEnlace,
  aprobar,
  borrarEquipo,
  cambiarRol,
  crearEnlace,
  guardarEquipo,
  invitarCorreos,
  ponerEnEquipo,
  quitarDeLaEmpresa,
  quitarInvitacion,
} from '@/services/empresa/servidor';
import { dominioDe, enlaceInvitacion, esDominioPublico, leerCorreos, textoFallo, textoInvitacion } from '@/services/empresa/textos';
import { espacio } from '@/theme';

import { CodigoQR } from './empresa/CodigoQR';
import { BotonVolver, Chip, Chips, Confirmar, FilaEmpresa, Mensaje, useDatosEmpresa } from './empresa/piezas';

// /empresa-equipo: la gente de la empresa y sus equipos. El administrador, además, acepta
// a quien espera, invita (enlace con QR, lista de correos o dominio propio), nombra
// administradores y responsables, y hace los equipos. Que dar de alta no sea un lío.

export function PantallaEquipoEmpresa() {
  const datos = useDatosEmpresa();
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

  const admin = soyAdmin(datos);
  const hacer = async (accion: () => Promise<unknown>, bien?: string): Promise<Resultado> => {
    setError(null);
    setHecho(null);
    const r = await hacerEnEmpresa(accion);
    if (!r.ok) setError(textoFallo(r.motivo));
    else if (bien) setHecho(bien);
    return r;
  };

  const pendientes = datos.miembros.filter((m) => m.estado === 'pendiente');
  const activos = datos.miembros
    .filter((m) => m.estado === 'activo')
    .sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es'));

  return (
    <Pantalla>
      <BotonVolver />
      <Titulo>Equipo</Titulo>
      <Mensaje texto={error} />
      <Mensaje texto={hecho} bien />

      {admin && pendientes.length > 0 ? (
        <>
          <Titulo nivel={2}>Esperan que les aceptes</Titulo>
          {pendientes.map((m) => (
            <Tarjeta key={m.usuario} style={estilos.caja}>
              <Texto fuerte>{nombreDe(m)}</Texto>
              <Texto pequeno secundario>
                {m.email} · {m.via === 'dominio' ? 'por el dominio' : 'por el enlace'}
              </Texto>
              <View style={estilos.botones}>
                <Boton titulo="Aceptar" onPress={() => hacer(() => aprobar(m.usuario, true), `${nombreDe(m)} ya está dentro.`)} />
                <Boton variante="secundario" titulo="Rechazar" onPress={() => hacer(() => aprobar(m.usuario, false))} />
              </View>
            </Tarjeta>
          ))}
        </>
      ) : null}

      {admin ? <Invitar datos={datos} hacer={hacer} /> : null}

      <Titulo nivel={2}>Personas ({activos.length})</Titulo>
      {activos.map((m) => (
        <Persona key={m.usuario} datos={datos} m={m} admin={admin} hacer={hacer} />
      ))}

      <Equipos datos={datos} admin={admin} hacer={hacer} />
    </Pantalla>
  );
}

type Hacer = (accion: () => Promise<unknown>, bien?: string) => Promise<Resultado>;

const OPCIONES_DIAS = [
  { valor: '1', etiqueta: '1 día' },
  { valor: '7', etiqueta: '7 días' },
  { valor: '30', etiqueta: '30 días' },
] as const;

function Invitar({ datos, hacer }: { datos: DatosEmpresa; hacer: Hacer }) {
  const [dias, setDias] = useState<'1' | '7' | '30'>('7');
  const [correos, setCorreos] = useState('');
  const [malos, setMalos] = useState<string[]>([]);
  const yo = datos.miembros.find((m) => m.usuario === datos.yo);
  const miDominio = dominioDe(yo?.email ?? '');
  const dominioPropio = miDominio !== '' && !esDominioPublico(miDominio);
  const ahora = new Date().toISOString();
  const enlaces = datos.enlaces.filter((e) => !e.anulada && e.caduca > ahora).sort((a, b) => b.creada.localeCompare(a.creada));
  const enlace = enlaces[0];

  const anadirCorreos = async () => {
    const { correos: validos, malos: noValen } = leerCorreos(correos);
    setMalos(noValen);
    if (validos.length === 0) return;
    const r = await hacer(
      () => invitarCorreos(datos.empresa.id, validos),
      validos.length === 1 ? 'Añadido. Cuando entre con ese correo, estará dentro.' : `Añadidos ${validos.length} correos.`,
    );
    if (r.ok) setCorreos('');
  };

  return (
    <>
      <Titulo nivel={2}>Invitar</Titulo>

      {dominioPropio ? (
        <Tarjeta style={estilos.caja}>
          <Interruptor
            etiqueta={`Que entre cualquiera con un correo @${miDominio}`}
            ayuda="Quien entre con una cuenta de ese dominio te sale en «Esperan que les aceptes»."
            valor={datos.empresa.dominio === miDominio}
            alCambiar={(si) => hacer(() => ajustesEmpresa(datos.empresa.nombre, si ? miDominio : null, false))}
          />
          {datos.empresa.dominio === miDominio ? (
            <Interruptor
              etiqueta="Aprobar solo"
              ayuda="Entran directamente, sin que tengas que aceptarles. Úsalo solo si todo el que tiene ese correo es de la empresa."
              valor={datos.empresa.aprobarSolo}
              alCambiar={(si) => hacer(() => ajustesEmpresa(datos.empresa.nombre, miDominio, si))}
            />
          ) : null}
        </Tarjeta>
      ) : null}

      <Tarjeta style={estilos.caja}>
        <Texto fuerte>Con un enlace (o su QR)</Texto>
        <Texto pequeno secundario>
          Mándalo por WhatsApp o enséñales el QR. Quien entre por el enlace te sale para aceptarle.
        </Texto>
        {enlace ? (
          <>
            <CodigoQR texto={enlaceInvitacion(enlace.codigo)} />
            <Texto pequeno selectable>
              {enlaceInvitacion(enlace.codigo)}
            </Texto>
            <Texto pequeno secundario>
              Vale hasta el {new Date(enlace.caduca).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.
            </Texto>
            <Boton titulo="Compartir el enlace" onPress={() => Share.share({ message: textoInvitacion(datos.empresa.nombre, enlace.codigo) })} />
            <Boton variante="secundario" titulo="Anular este enlace" onPress={() => hacer(() => anularEnlace(enlace.codigo), 'Anulado: ya no vale.')} />
          </>
        ) : (
          <>
            <Selector etiqueta="Que valga" opciones={OPCIONES_DIAS} valor={dias} alCambiar={setDias} />
            <Boton titulo="Crear el enlace" onPress={() => hacer(() => crearEnlace(datos.empresa.id, Number(dias)))} />
          </>
        )}
      </Tarjeta>

      <Tarjeta style={estilos.caja}>
        <Texto fuerte>Con una lista de correos</Texto>
        <Texto pequeno secundario>
          Pega los correos (Gmail, Outlook o de empresa). Quien entre con uno de ellos, entra directamente.
        </Texto>
        <CampoTexto
          value={correos}
          onChangeText={setCorreos}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="laura@gmail.com, javi@outlook.es"
          error={malos.length > 0 ? `No parecen correos: ${malos.join(', ')}` : null}
        />
        <Boton variante="secundario" titulo="Añadir a la lista" onPress={anadirCorreos} />
        {datos.invitaciones.map((i) => (
          <FilaEmpresa
            key={i.email}
            titulo={i.email}
            detalle="Aún no ha entrado"
            derecha={<Boton variante="secundario" titulo="Quitar" onPress={() => hacer(() => quitarInvitacion(datos.empresa.id, i.email))} />}
          />
        ))}
      </Tarjeta>
    </>
  );
}

function Persona({ datos, m, admin, hacer }: { datos: DatosEmpresa; m: Miembro; admin: boolean; hacer: Hacer }) {
  const [abierta, setAbierta] = useState(false);
  const [quitar, setQuitar] = useState(false);
  const papel = papelDe(datos, m.usuario);
  const equipos = equiposDe(datos, m.usuario);
  const soyYo = m.usuario === datos.yo;
  const detalle = [NOMBRE_PAPEL[papel], equipos.map((e) => e.nombre).join(', ') || null, m.email].filter(Boolean).join(' · ');

  return (
    <View style={estilos.persona}>
      <FilaEmpresa
        titulo={`${nombreDe(m)}${soyYo ? ' (tú)' : ''}`}
        detalle={detalle}
        onPress={admin ? () => setAbierta((a) => !a) : undefined}
      />
      {admin && abierta ? (
        <Tarjeta style={estilos.caja}>
          <Interruptor
            etiqueta="Administrador"
            ayuda="Puede hacerlo todo: invitar, aceptar, equipos, turnos y tareas de todos."
            valor={m.rol === 'admin'}
            alCambiar={(si) => hacer(() => cambiarRol(m.usuario, si ? 'admin' : 'empleado'))}
          />
          {datos.equipos.length > 0 ? (
            <>
              <Texto pequeno secundario>
                Equipos (toca para meterle o sacarle)
              </Texto>
              <Chips>
                {datos.equipos.map((e) => {
                  const esta = equipos.some((x) => x.id === e.id);
                  return (
                    <Chip
                      key={e.id}
                      texto={e.nombre}
                      elegido={esta}
                      onPress={() => hacer(() => ponerEnEquipo(datos.empresa.id, e.id, m.usuario, esta ? null : false))}
                    />
                  );
                })}
              </Chips>
              {equipos.map((e) => {
                const responsable = datos.enEquipos.some((x) => x.equipoId === e.id && x.usuario === m.usuario && x.responsable);
                return (
                  <Interruptor
                    key={e.id}
                    etiqueta={`Responsable de ${e.nombre}`}
                    ayuda="Reparte los turnos, las tareas y los eventos de ese equipo."
                    valor={responsable}
                    alCambiar={(si) => hacer(() => ponerEnEquipo(datos.empresa.id, e.id, m.usuario, si))}
                  />
                );
              })}
            </>
          ) : (
            <Texto pequeno secundario>
              Crea equipos abajo (Cocina, Sala...) para nombrar responsables.
            </Texto>
          )}
          {!soyYo ? <Boton variante="secundario" titulo="Sacar de la empresa" onPress={() => setQuitar(true)} /> : null}
          {quitar ? (
            <Confirmar
              texto={`Se borran sus turnos, tareas y respuestas en la empresa. Lo personal de ${nombreDe(m)} no se toca.`}
              si="Sacarle de la empresa"
              alSi={() => {
                setQuitar(false);
                hacer(() => quitarDeLaEmpresa(m.usuario));
              }}
              alNo={() => setQuitar(false)}
            />
          ) : null}
        </Tarjeta>
      ) : null}
    </View>
  );
}

function Equipos({ datos, admin, hacer }: { datos: DatosEmpresa; admin: boolean; hacer: Hacer }) {
  const [nuevo, setNuevo] = useState('');
  const [nombreEmpresa, setNombreEmpresa] = useState(datos.empresa.nombre);
  const crear = async () => {
    if (!nuevo.trim()) return;
    const r = await hacer(() => guardarEquipo(datos.empresa.id, { nombre: nuevo.trim() }));
    if (r.ok) setNuevo('');
  };
  return (
    <>
      <Titulo nivel={2}>Equipos</Titulo>
      {datos.equipos.length === 0 ? <Texto secundario>Todavía no hay equipos.</Texto> : null}
      {datos.equipos.map((e) => {
        const cuantos = datos.enEquipos.filter((x) => x.equipoId === e.id).length;
        const responsables = datos.enEquipos
          .filter((x) => x.equipoId === e.id && x.responsable)
          .map((x) => nombreDe(datos.miembros.find((m) => m.usuario === x.usuario)));
        return (
          <FilaEmpresa
            key={e.id}
            titulo={e.nombre}
            detalle={[`${cuantos} ${cuantos === 1 ? 'persona' : 'personas'}`, responsables.length ? `Responsable: ${responsables.join(', ')}` : null]
              .filter(Boolean)
              .join(' · ')}
            derecha={admin ? <Boton variante="secundario" titulo="Borrar" onPress={() => hacer(() => borrarEquipo(e.id))} /> : undefined}
          />
        );
      })}
      {admin ? (
        <>
          <View style={estilos.nuevo}>
            <View style={estilos.flex}>
              <CampoTexto value={nuevo} onChangeText={setNuevo} placeholder="Nuevo equipo: Cocina, Sala, Ventas…" maxLength={40} />
            </View>
            <Boton variante="secundario" titulo="Crear" onPress={crear} />
          </View>
          <Plegable titulo="Nombre de la empresa" resumen={datos.empresa.nombre}>
            <CampoTexto value={nombreEmpresa} onChangeText={setNombreEmpresa} maxLength={80} />
            <Boton
              variante="secundario"
              titulo="Guardar el nombre"
              onPress={() =>
                hacer(() => ajustesEmpresa(nombreEmpresa, datos.empresa.dominio, datos.empresa.aprobarSolo), 'Guardado.')
              }
            />
          </Plegable>
        </>
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  caja: { gap: espacio.s },
  botones: { flexDirection: 'row', gap: espacio.s },
  persona: { gap: espacio.xs },
  nuevo: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.s },
  flex: { flex: 1 },
});
