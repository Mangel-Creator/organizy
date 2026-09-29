import type { ClaseEvento } from '@/data/empresa/tipos';

// Textos y comprobaciones de Organizy grupal (funciones puras, con pruebas).

// La misma lista que el servidor (emp_dominio_publico): con estos correos no se puede
// usar "que entre cualquiera con un correo @dominio".
export const DOMINIOS_PUBLICOS: readonly string[] = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es',
  'live.com', 'live.es', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'yahoo.com', 'yahoo.es',
  'ymail.com', 'aol.com', 'gmx.com', 'gmx.es', 'gmx.net', 'proton.me', 'protonmail.com',
  'pm.me', 'zoho.com', 'yandex.com', 'mail.com', 'telefonica.net', 'terra.es', 'movistar.es',
  'orange.es', 'vodafone.es',
];

export function dominioDe(correo: string): string {
  return correo.trim().toLowerCase().split('@')[1] ?? '';
}

export function esDominioPublico(dominio: string): boolean {
  return DOMINIOS_PUBLICOS.includes(dominio.trim().toLowerCase());
}

const PATRON_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Lo que pega el jefe: correos separados por comas, espacios o líneas (también
// "Laura <laura@bar.es>"). Devuelve los válidos, en minúsculas y sin repetir, y los que
// no parecen un correo.
export function leerCorreos(texto: string): { correos: string[]; malos: string[] } {
  const trozos = texto
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[<("']+|[>)"'.]+$/g, '').toLowerCase())
    .filter(Boolean);
  const correos: string[] = [];
  const malos: string[] = [];
  for (const t of trozos) {
    if (PATRON_CORREO.test(t)) {
      if (!correos.includes(t)) correos.push(t);
    } else if (t.includes('@')) {
      malos.push(t);
    }
  }
  return { correos, malos };
}

// Enlace de invitación. El código va detrás de "#": no llega a los registros de GitHub.
export const WEB_ORGANIZY = 'https://mangel-creator.github.io/organizy';

export function enlaceInvitacion(codigo: string): string {
  return `${WEB_ORGANIZY}/empresa#invitacion=${codigo}`;
}

// El código de un enlace pegado (o el código solo): 32 letras y números.
export function leerCodigoInvitacion(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const limpio = decodeURIComponent(texto.trim());
  const enEnlace = limpio.match(/invitacion=([0-9a-f]{32})/i);
  if (enEnlace) return enEnlace[1].toLowerCase();
  return /^[0-9a-f]{32}$/i.test(limpio) ? limpio.toLowerCase() : null;
}

export function textoInvitacion(empresa: string, codigo: string): string {
  return `Te invito a ${empresa} en Organizy, para ver los turnos, las tareas y el calendario del trabajo. Entra aquí con tu cuenta de Google o Microsoft: ${enlaceInvitacion(codigo)}`;
}

// Para que el jefe se lo reenvíe a su informático cuando Microsoft pide "aprobación del
// administrador".
export const TEXTO_INFORMATICO =
  'Hola. Queremos usar Organizy en la empresa para los turnos, las tareas y el calendario del trabajo. ' +
  'Al entrar con la cuenta de Microsoft sale "Se necesita aprobación del administrador". ' +
  '¿Puedes aprobar la aplicación Organizy una vez para toda la empresa? ' +
  'Solo pide iniciar sesión y leer el nombre y el correo (openid, profile, email y User.Read); no lee el correo ni los archivos. ' +
  'Se hace en Microsoft Entra: Aplicaciones empresariales > Organizy > Permisos > "Conceder consentimiento de administrador". ' +
  'Si todavía no aparece, basta con que alguien intente entrar una vez, o en Entra > Aplicaciones empresariales > Configuración de consentimiento, revisa las solicitudes pendientes. Gracias.';

export const NOMBRE_CLASE: Record<ClaseEvento, string> = {
  reunion: 'Reunión',
  festivo: 'Festivo',
  cierre: 'Cierre',
  formacion: 'Formación',
  otro: 'Otro',
};

// Mensajes para los errores que devuelve el servidor (supabase: "raise exception '...'").
export function textoFallo(motivo: string): string {
  switch (motivo) {
    case 'sin-conexion':
      return 'No hay conexión. Prueba otra vez en un momento.';
    case 'sin-servidor':
      return 'Esta versión de Organizy no tiene servidor.';
    case 'sin-sesion':
    case 'sin-cuenta':
      return 'Tienes que entrar con tu cuenta de Google o Microsoft.';
    case 'sin-correo':
      return 'Tu cuenta no nos ha dado un correo. Prueba con otra.';
    case 'sin-invitacion':
      return 'Tu empresa aún no te ha invitado. Pide a tu jefe el enlace de invitación, o que añada tu correo.';
    case 'enlace-caducado':
      return 'Ese enlace de invitación ya no vale: ha caducado o lo han anulado. Pide uno nuevo.';
    case 'ya-en-empresa':
      return 'Ya estás en una empresa. Para crear otra, sal antes de la tuya.';
    case 'empresa-llena':
      return 'Esa empresa ya tiene el máximo de personas (300).';
    case 'demasiadas':
      return 'Has creado demasiadas empresas hoy. Prueba mañana.';
    case 'dominio-publico':
      return 'Ese es un correo gratuito (Gmail, Outlook...). Para eso, invita con la lista de correos o con un enlace.';
    case 'dominio-ajeno':
      return 'Solo puedes poner el dominio de tu propio correo.';
    case 'dominio-en-uso':
      return 'Otra empresa ya usa ese dominio.';
    case 'unico-admin':
      return 'Eres el único administrador. Nombra a otra persona administradora antes de salir, o borra la empresa.';
    case 'sin-admin':
      return 'Tiene que quedar al menos un administrador.';
    case 'no-comparte':
      return 'Activa antes "Compartir mis huecos como Ocupado".';
    case 'sin-permiso':
      return 'Eso solo lo puede hacer quien gestiona ese equipo.';
    default:
      return 'Algo ha fallado. Prueba otra vez en un momento.';
  }
}
