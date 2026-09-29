import { claveDia, inicioDeSemana, sumarDias } from '@/services/fechas';

import type { Fila, UsuarioEmpresa } from './base';

// La "empresa de ejemplo" del plan empresa: un bar con cinco personas, dos equipos,
// turnos de dos semanas, tareas, mensajes y avisos ya puestos. Sirve para que el dueño la
// vea en Expo Go sin cuentas de Google ni Microsoft (y para el servidor de prueba del
// ordenador). Función pura, con pruebas: no toca el servidor de verdad.

// Las tres personas que pueden "entrar" (jefe, responsable y empleado).
export const PERSONAS_PRUEBA: UsuarioEmpresa[] = [
  { id: '00000000-0000-4000-8000-000000000001', correo: 'pepe@bar-prueba.es', nombre: 'Pepe' },
  { id: '00000000-0000-4000-8000-000000000002', correo: 'laura@bar-prueba.es', nombre: 'Laura' },
  { id: '00000000-0000-4000-8000-000000000003', correo: 'javi.prueba@gmail.com', nombre: 'Javi' },
];

const [PEPE, LAURA, JAVI] = PERSONAS_PRUEBA.map((p) => p.id);
const MARTA = '00000000-0000-4000-8000-000000000004';
const LUIS = '00000000-0000-4000-8000-000000000005';
const ANA = '00000000-0000-4000-8000-000000000006';

const EMPRESA = '00000000-0000-4000-9000-000000000001';
const COCINA = '00000000-0000-4000-9000-000000000002';
const SALA = '00000000-0000-4000-9000-000000000003';
const GENERAL = '00000000-0000-4000-9000-000000000010';
const CANAL_COCINA = '00000000-0000-4000-9000-000000000011';
const CANAL_SALA = '00000000-0000-4000-9000-000000000012';
const PRIVADO_PEPE_LAURA = '00000000-0000-4000-9000-000000000013';
const REUNION = '00000000-0000-4000-9000-000000000020';
const AVISO_SANIDAD = '00000000-0000-4000-9000-000000000030';
const AVISO_HORARIO = '00000000-0000-4000-9000-000000000031';
const AVISO_PESCADO = '00000000-0000-4000-9000-000000000032';

// Quién trabaja qué días (0 = lunes) y a qué horas. Luis y Marta acaban pasada la medianoche.
const HORARIOS: { usuario: string; equipo: string | null; dias: number[]; entrada: string; salida: string }[] = [
  { usuario: PEPE, equipo: null, dias: [0, 1, 2, 3, 4], entrada: '10:00', salida: '16:00' },
  { usuario: LAURA, equipo: COCINA, dias: [0, 1, 2, 3, 4], entrada: '09:00', salida: '17:00' },
  { usuario: LUIS, equipo: COCINA, dias: [1, 2, 3, 4, 5], entrada: '16:00', salida: '00:30' },
  { usuario: JAVI, equipo: SALA, dias: [0, 2, 3, 4, 5], entrada: '12:00', salida: '20:00' },
  { usuario: MARTA, equipo: SALA, dias: [3, 4, 5, 6], entrada: '18:00', salida: '01:00' },
];

export function datosDeEjemplo(ahora: Date): Record<string, Fila[]> {
  const hoy = claveDia(ahora);
  const lunes = claveDia(inicioDeSemana(ahora));
  const hace = (minutos: number) => new Date(ahora.getTime() - minutos * 60_000).toISOString();
  const dia = (n: number) => sumarDias(hoy, n);

  const miembro = (usuario: string, nombre: string, email: string, extra: Fila = {}): Fila => ({
    empresa_id: EMPRESA,
    usuario,
    nombre,
    email,
    rol: 'empleado',
    estado: 'activo',
    via: 'lista',
    comparte_ocupado: false,
    alta: hace(60 * 24 * 20),
    ...extra,
  });

  const mensaje = (canal: string, autor: string, minutos: number, texto: string): Fila => ({
    id: `${canal}-${minutos}`,
    empresa_id: EMPRESA,
    canal_id: canal,
    autor,
    texto,
    creado: hace(minutos),
    borrado: false,
  });

  const turnos: Fila[] = [];
  for (let semana = 0; semana < 2; semana++) {
    for (const h of HORARIOS) {
      for (const d of h.dias) {
        const fecha = sumarDias(lunes, semana * 7 + d);
        turnos.push({
          id: `turno-${h.usuario.slice(-2)}-${fecha}`,
          empresa_id: EMPRESA,
          equipo_id: h.equipo,
          usuario: h.usuario,
          fecha,
          entrada: h.entrada,
          salida: h.salida,
          sitio: '',
          latitud: null,
          longitud: null,
          notas: '',
          creado_por: PEPE,
        });
      }
    }
  }
  // Javi pide cambiar su próximo turno (a Pepe le sale "1 cambio por mirar").
  const turnoJavi = turnos.find((t) => t.usuario === JAVI && (t.fecha as string) > hoy);

  const tarea = (id: string, titulo: string, fecha: string, extra: Fila): Fila => ({
    id,
    empresa_id: EMPRESA,
    equipo_id: null,
    usuario: null,
    titulo,
    notas: '',
    fecha_limite: fecha,
    cuadrante: null,
    duracion_min: 30,
    hecha: false,
    hecha_por: null,
    hecha_el: null,
    creado_por: PEPE,
    ...extra,
  });

  return {
    empresas: [{ id: EMPRESA, nombre: 'Bar Pepe', dominio: null, aprobar_solo: false, creada_por: PEPE, creada: hace(60 * 24 * 30) }],
    empresa_miembros: [
      miembro(PEPE, 'Pepe', PERSONAS_PRUEBA[0].correo, { rol: 'admin', via: 'creador' }),
      miembro(LAURA, 'Laura', PERSONAS_PRUEBA[1].correo, { comparte_ocupado: true }),
      miembro(JAVI, 'Javi', PERSONAS_PRUEBA[2].correo, { via: 'enlace' }),
      miembro(MARTA, 'Marta', 'marta@bar-prueba.es'),
      miembro(LUIS, 'Luis', 'luis@bar-prueba.es'),
      miembro(ANA, 'Ana', 'ana.prueba@gmail.com', { estado: 'pendiente', via: 'enlace', alta: hace(90) }),
    ],
    equipos: [
      { id: COCINA, empresa_id: EMPRESA, nombre: 'Cocina' },
      { id: SALA, empresa_id: EMPRESA, nombre: 'Sala' },
    ],
    equipo_miembros: [
      { equipo_id: COCINA, empresa_id: EMPRESA, usuario: LAURA, responsable: true },
      { equipo_id: COCINA, empresa_id: EMPRESA, usuario: LUIS, responsable: false },
      { equipo_id: SALA, empresa_id: EMPRESA, usuario: MARTA, responsable: true },
      { equipo_id: SALA, empresa_id: EMPRESA, usuario: JAVI, responsable: false },
    ],
    eventos_empresa: [
      {
        id: REUNION, empresa_id: EMPRESA, equipo_id: null, titulo: 'Reunión de equipo', clase: 'reunion', fecha: dia(2),
        inicio: '17:00', fin: '17:45', lugar: 'En el bar', latitud: null, longitud: null,
        notas: 'Repasamos los turnos del mes que viene.', pide_respuesta: true, creado_por: PEPE,
      },
      {
        id: `${REUNION}-formacion`, empresa_id: EMPRESA, equipo_id: COCINA, titulo: 'Formación de alérgenos', clase: 'formacion',
        fecha: dia(6), inicio: '10:00', fin: '12:00', lugar: '', latitud: null, longitud: null, notas: '',
        pide_respuesta: false, creado_por: LAURA,
      },
      {
        id: `${REUNION}-inventario`, empresa_id: EMPRESA, equipo_id: null, titulo: 'Cerrado por inventario', clase: 'cierre',
        fecha: dia(9), inicio: null, fin: null, lugar: '', latitud: null, longitud: null, notas: '',
        pide_respuesta: false, creado_por: PEPE,
      },
    ],
    respuestas_evento: [
      { evento_id: REUNION, empresa_id: EMPRESA, usuario: LAURA, respuesta: 'voy', el: hace(300) },
      { evento_id: REUNION, empresa_id: EMPRESA, usuario: MARTA, respuesta: 'voy', el: hace(200) },
    ],
    turnos,
    cambios_turno: turnoJavi
      ? [
          {
            id: 'cambio-javi', empresa_id: EMPRESA, turno_id: turnoJavi.id, usuario: JAVI, fecha: null, entrada: '14:00',
            salida: '22:00', cubre: null, motivo: 'Tengo médico por la mañana', estado: 'pendiente', creado: hace(120),
            resuelto_por: null,
          },
        ]
      : [],
    tareas_empresa: [
      tarea('tarea-bebidas', 'Llamar al proveedor de bebidas', hoy, { usuario: PEPE, cuadrante: 'hazlo' }),
      tarea('tarea-pedido', 'Revisar el pedido de la semana', dia(1), { usuario: LAURA }),
      tarea('tarea-cafetera', 'Limpiar la cafetera', hoy, { usuario: JAVI, creado_por: MARTA }),
      tarea('tarea-terraza', 'Montar la terraza', hoy, { equipo_id: SALA, creado_por: MARTA }),
      tarea('tarea-congelador', 'Etiquetar el congelador', dia(-1), {
        usuario: LUIS, creado_por: LAURA, hecha: true, hecha_por: LUIS, hecha_el: hace(60 * 20),
      }),
    ],
    ocupado_compartido: [
      { empresa_id: EMPRESA, usuario: LAURA, bloques: [{ d: dia(1), i: 18 * 60, f: 20 * 60 }], actualizado: hace(30) },
    ],
    chat_canales: [
      { id: GENERAL, empresa_id: EMPRESA, tipo: 'general', equipo_id: null, persona_a: null, persona_b: null },
      { id: CANAL_COCINA, empresa_id: EMPRESA, tipo: 'equipo', equipo_id: COCINA, persona_a: null, persona_b: null },
      { id: CANAL_SALA, empresa_id: EMPRESA, tipo: 'equipo', equipo_id: SALA, persona_a: null, persona_b: null },
      { id: PRIVADO_PEPE_LAURA, empresa_id: EMPRESA, tipo: 'privado', equipo_id: null, persona_a: PEPE, persona_b: LAURA },
    ],
    chat_mensajes: [
      mensaje(GENERAL, PEPE, 60 * 26, 'Buenos días. Esta semana abrimos también el lunes por la tarde.'),
      mensaje(GENERAL, MARTA, 60 * 25, 'Perfecto, lo digo en sala.'),
      mensaje(GENERAL, LAURA, 180, 'Hoy falta pan de molde, ¿alguien pasa por el súper?'),
      mensaje(GENERAL, JAVI, 170, 'Yo paso antes de entrar.'),
      mensaje(CANAL_COCINA, LAURA, 300, 'Luis, mañana llega el pedido de verdura a las 9.'),
      mensaje(CANAL_COCINA, LUIS, 240, 'Vale, estaré.'),
      mensaje(CANAL_SALA, MARTA, 60 * 22, 'Recordad montar la terraza a las 12.'),
      mensaje(PRIVADO_PEPE_LAURA, LAURA, 40, 'Pepe, ¿puedo salir una hora antes el viernes?'),
    ],
    // Pepe ya había leído Cocina y Sala: le quedan 2 en General y 1 de Laura.
    chat_leidos: [
      { canal_id: GENERAL, usuario: PEPE, leido_hasta: hace(60 * 25) },
      { canal_id: CANAL_COCINA, usuario: PEPE, leido_hasta: hace(1) },
      { canal_id: CANAL_SALA, usuario: PEPE, leido_hasta: hace(1) },
    ],
    anuncios: [
      {
        id: AVISO_SANIDAD, empresa_id: EMPRESA, equipo_id: null, autor: PEPE, importante: true, creado: hace(120),
        titulo: 'Inspección de sanidad el jueves',
        texto: 'Viene a las 10. Cocina y barra bien limpias y las fichas de alérgenos a mano.',
      },
      {
        id: AVISO_PESCADO, empresa_id: EMPRESA, equipo_id: COCINA, autor: LAURA, importante: false, creado: hace(60 * 24),
        titulo: 'Nuevo proveedor de pescado', texto: 'Llega martes y viernes a las 8:30. Firmad el albarán.',
      },
      {
        id: AVISO_HORARIO, empresa_id: EMPRESA, equipo_id: null, autor: PEPE, importante: false, creado: hace(60 * 24 * 3),
        titulo: 'Horario de verano', texto: 'A partir del mes que viene cerramos a las 00:30. Los turnos ya están puestos.',
      },
    ],
    anuncios_leidos: [
      { anuncio_id: AVISO_SANIDAD, usuario: LAURA, el: hace(100) },
      ...[LAURA, JAVI, MARTA, LUIS].map((usuario) => ({ anuncio_id: AVISO_HORARIO, usuario, el: hace(60 * 24 * 2) })),
      { anuncio_id: AVISO_PESCADO, usuario: LUIS, el: hace(60 * 20) },
    ],
  };
}
