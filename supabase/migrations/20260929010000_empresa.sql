-- Organizy · fase 15: Organizy grupal (modo empresa, activable en Perfil).
--
-- Excepción a "los datos solo en el dispositivo", aprobada por el usuario el 28/09/2026:
-- para que una empresa comparta una organización, aquí se guarda SOLO lo de la empresa:
--   - empresas: nombre y, si el jefe quiere, su dominio de correo (@suempresa.com).
--   - empresa_miembros: quién está (nombre y correo del trabajo), su papel y si ha sido
--     aprobado. Una persona está como mucho en una empresa.
--   - equipos y equipo_miembros: Cocina, Sala, Ventas... y quién es responsable de cada uno.
--   - invitaciones_correo / invitaciones_enlace: la lista de correos que pega el jefe y los
--     enlaces de invitación (caducan y se pueden anular).
--   - eventos_empresa y respuestas_evento: reuniones, festivos, cierres... y quién va.
--   - turnos y cambios_turno: los turnos de cada persona y los cambios que pide.
--   - tareas_empresa: tareas asignadas a una persona o a un equipo.
--   - ocupado_compartido: SOLO si el empleado lo activa, sus huecos personales como
--     "Ocupado" (día, hora de empezar y de acabar; sin título, sin lugar y sin tipo).
--   - empresa_avisos: la dirección de avisos de cada móvil y qué avisos quiere. Solo la ve
--     su dueño.
-- Nada personal (eventos, lugares, épocas, correo, clientes, alarmas) viene aquí.
-- Al salir de la empresa se borra la cuenta de esa persona y todo lo suyo; al borrar la
-- empresa, todo lo de la empresa. Lo viejo se limpia solo cada noche (al final).
--
-- Seguridad (Row Level Security): cada persona solo lee su empresa (y solo cuando la han
-- aprobado); solo el administrador, o el responsable del equipo, escribe. Lo delicado
-- (entrar, aprobar, cambiar papeles, salir, marcar una tarea, resolver un cambio de turno)
-- va por funciones que lo comprueban todo (security definer).
--
-- Se entra con la cuenta de Google o Microsoft del trabajo (Supabase Auth). Las sesiones
-- anónimas de la app (captura, planes, correo) no pueden crear ni unirse a una empresa.
--
-- Pruebas de estas reglas: supabase/tests/empresa_rls.sql.

-- ---------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 80),
  -- "Que entre cualquiera con un correo @dominio": aparece en Pendientes (o entra solo
  -- si aprobar_solo). Solo dominios propios (ver emp_dominio_publico).
  dominio text unique check (dominio is null or dominio ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  aprobar_solo boolean not null default false,
  creada_por uuid references auth.users (id) on delete set null,
  creada timestamptz not null default now()
);

create table public.empresa_miembros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  nombre text not null default '' check (char_length(nombre) <= 60),
  email text not null default '' check (char_length(email) <= 320),
  -- Administrador o empleado. "Responsable" es quien lleva un equipo (equipo_miembros).
  rol text not null default 'empleado' check (rol in ('admin', 'empleado')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo')),
  via text not null check (via in ('creador', 'dominio', 'lista', 'enlace')),
  comparte_ocupado boolean not null default false,
  alta timestamptz not null default now(),
  primary key (empresa_id, usuario),
  unique (usuario)
);

create table public.empresa_avisos (
  usuario uuid primary key references auth.users (id) on delete cascade,
  tokens text[] not null default '{}' check (cardinality(tokens) <= 5),
  turnos boolean not null default true,
  tareas boolean not null default true,
  eventos boolean not null default true,
  cambios boolean not null default true,
  altas boolean not null default true
);

create table public.equipos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  unique (empresa_id, nombre)
);

create table public.equipo_miembros (
  equipo_id uuid not null references public.equipos (id) on delete cascade,
  empresa_id uuid not null,
  usuario uuid not null,
  responsable boolean not null default false,
  primary key (equipo_id, usuario),
  foreign key (empresa_id, usuario) references public.empresa_miembros (empresa_id, usuario) on delete cascade
);

create table public.invitaciones_correo (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  creada timestamptz not null default now(),
  primary key (empresa_id, email)
);

create table public.invitaciones_enlace (
  -- 32 letras y números al azar: imposible de adivinar. Es la llave del enlace.
  codigo text primary key default replace(gen_random_uuid()::text, '-', ''),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  caduca timestamptz not null default now() + interval '7 days',
  anulada boolean not null default false,
  creada timestamptz not null default now()
);

create table public.eventos_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  equipo_id uuid references public.equipos (id) on delete cascade, -- null = toda la empresa
  titulo text not null check (char_length(titulo) between 1 and 80),
  clase text not null default 'reunion' check (clase in ('reunion', 'festivo', 'cierre', 'formacion', 'otro')),
  fecha date not null,
  -- Sin horas = todo el día (festivos, cierres).
  inicio text check (inicio ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  fin text check (fin ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  lugar text not null default '' check (char_length(lugar) <= 200),
  latitud double precision,
  longitud double precision,
  notas text not null default '' check (char_length(notas) <= 1000),
  pide_respuesta boolean not null default false,
  creado_por uuid references auth.users (id) on delete set null,
  actualizado timestamptz not null default now(),
  check ((inicio is null and fin is null) or (inicio is not null and fin is not null and fin > inicio))
);
create index eventos_empresa_fecha on public.eventos_empresa (empresa_id, fecha);

create table public.respuestas_evento (
  evento_id uuid not null references public.eventos_empresa (id) on delete cascade,
  empresa_id uuid not null,
  usuario uuid not null,
  respuesta text not null check (respuesta in ('voy', 'no-voy')),
  el timestamptz not null default now(),
  primary key (evento_id, usuario),
  foreign key (empresa_id, usuario) references public.empresa_miembros (empresa_id, usuario) on delete cascade
);

create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  equipo_id uuid references public.equipos (id) on delete set null,
  usuario uuid not null,
  fecha date not null,
  entrada text not null check (entrada ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Si la salida es antes que la entrada, el turno acaba al día siguiente (19:00-01:00).
  salida text not null check (salida ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  sitio text not null default '' check (char_length(sitio) <= 200), -- vacío = su sitio "Trabajo"
  latitud double precision,
  longitud double precision,
  notas text not null default '' check (char_length(notas) <= 300),
  creado_por uuid references auth.users (id) on delete set null,
  actualizado timestamptz not null default now(),
  check (salida <> entrada),
  foreign key (empresa_id, usuario) references public.empresa_miembros (empresa_id, usuario) on delete cascade
);
create index turnos_fecha on public.turnos (empresa_id, fecha);
create index turnos_usuario on public.turnos (usuario, fecha);

create table public.cambios_turno (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  turno_id uuid not null references public.turnos (id) on delete cascade,
  usuario uuid not null, -- quien lo pide (el del turno)
  -- Lo que propone. Null = igual que ahora.
  fecha date,
  entrada text check (entrada ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  salida text check (salida ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  cubre uuid references auth.users (id) on delete set null, -- otra persona que lo haga
  motivo text not null default '' check (char_length(motivo) <= 300),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  resuelto_por uuid references auth.users (id) on delete set null,
  creado timestamptz not null default now(),
  foreign key (empresa_id, usuario) references public.empresa_miembros (empresa_id, usuario) on delete cascade
);

create table public.tareas_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  equipo_id uuid references public.equipos (id) on delete cascade,
  usuario uuid references auth.users (id) on delete cascade, -- null = para todo el equipo
  titulo text not null check (char_length(titulo) between 1 and 120),
  notas text not null default '' check (char_length(notas) <= 1000),
  fecha_limite date not null,
  cuadrante text check (cuadrante in ('hazlo', 'planifica', 'delega', 'elimina')),
  duracion_min integer not null default 30 check (duracion_min between 15 and 480),
  hecha boolean not null default false,
  hecha_por uuid references auth.users (id) on delete set null,
  hecha_el timestamptz,
  creado_por uuid references auth.users (id) on delete set null,
  creada timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  check (equipo_id is not null or usuario is not null)
);
create index tareas_empresa_empresa on public.tareas_empresa (empresa_id, fecha_limite);

create table public.ocupado_compartido (
  usuario uuid primary key,
  empresa_id uuid not null,
  -- [{ "d": "2026-10-05", "i": 540, "f": 600 }]: día y minutos desde medianoche. Nada más.
  bloques jsonb not null default '[]' check (jsonb_typeof(bloques) = 'array' and jsonb_array_length(bloques) <= 600),
  actualizado timestamptz not null default now(),
  foreign key (empresa_id, usuario) references public.empresa_miembros (empresa_id, usuario) on delete cascade
);

-- ---------------------------------------------------------------------------------
-- Quién soy en la empresa (para las reglas). security definer: leen empresa_miembros
-- sin pasar por sus propias reglas, así no se llaman en bucle.
-- ---------------------------------------------------------------------------------

create function public.emp_mia() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.empresa_id from public.empresa_miembros m
  where m.usuario = auth.uid() and m.estado = 'activo'
$$;

create function public.emp_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.empresa_miembros m
    where m.usuario = auth.uid() and m.estado = 'activo' and m.rol = 'admin'
  )
$$;

-- ¿Estoy en ese equipo?
create function public.emp_en_equipo(p_equipo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.equipo_miembros em
    join public.empresa_miembros m on m.empresa_id = em.empresa_id and m.usuario = em.usuario
    where em.equipo_id = p_equipo and em.usuario = auth.uid() and m.estado = 'activo'
  )
$$;

-- ¿Puedo gestionar ese equipo? (administrador o su responsable)
create function public.emp_responsable(p_equipo uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.emp_admin() or exists (
    select 1 from public.equipo_miembros em
    join public.empresa_miembros m on m.empresa_id = em.empresa_id and m.usuario = em.usuario
    where em.equipo_id = p_equipo and em.usuario = auth.uid() and em.responsable and m.estado = 'activo'
  )
$$;

-- ¿Esa persona está en ese equipo?
create function public.emp_esta_en(p_equipo uuid, p_usuario uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.equipo_miembros em where em.equipo_id = p_equipo and em.usuario = p_usuario)
$$;

-- ¿Llevo a esa persona? (administrador, o responsable de un equipo en el que está)
create function public.emp_gestiona_a(p_usuario uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.emp_admin() or exists (
    select 1 from public.equipo_miembros r
    join public.equipo_miembros e on e.equipo_id = r.equipo_id
    where r.usuario = auth.uid() and r.responsable and e.usuario = p_usuario
  )
$$;

-- Correos gratuitos: con ellos no se puede usar "que entre cualquiera con @dominio".
-- La misma lista está en la app (services/empresa/textos.ts).
create function public.emp_dominio_publico(p_dominio text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(p_dominio) = any (array[
    'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es',
    'live.com', 'live.es', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'yahoo.com', 'yahoo.es',
    'ymail.com', 'aol.com', 'gmx.com', 'gmx.es', 'gmx.net', 'proton.me', 'protonmail.com',
    'pm.me', 'zoho.com', 'yandex.com', 'mail.com', 'telefonica.net', 'terra.es', 'movistar.es',
    'orange.es', 'vodafone.es'
  ])
$$;

-- Sesión de Google o Microsoft (no la anónima de la app), con su correo.
create function public.emp_mi_correo() returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_correo text;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'sin-cuenta';
  end if;
  select lower(u.email) into v_correo from auth.users u where u.id = auth.uid() and not u.is_anonymous;
  if v_correo is null or v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'sin-correo';
  end if;
  return v_correo;
end;
$$;

-- ---------------------------------------------------------------------------------
-- Comprobaciones al escribir
-- ---------------------------------------------------------------------------------

create function public.emp_preparar_evento() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.equipo_id is not null and not exists (
    select 1 from public.equipos e where e.id = new.equipo_id and e.empresa_id = new.empresa_id
  ) then
    raise exception 'equipo de otra empresa';
  end if;
  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
  else
    new.creado_por := old.creado_por;
    new.empresa_id := old.empresa_id;
  end if;
  new.actualizado := now();
  return new;
end;
$$;

create trigger emp_preparar_evento before insert or update on public.eventos_empresa
  for each row execute function public.emp_preparar_evento();

create function public.emp_preparar_turno() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.equipo_id is not null and not exists (
    select 1 from public.equipos e where e.id = new.equipo_id and e.empresa_id = new.empresa_id
  ) then
    raise exception 'equipo de otra empresa';
  end if;
  if not exists (
    select 1 from public.empresa_miembros m
    where m.empresa_id = new.empresa_id and m.usuario = new.usuario and m.estado = 'activo'
  ) then
    raise exception 'persona fuera de la empresa';
  end if;
  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
  else
    new.creado_por := old.creado_por;
    new.empresa_id := old.empresa_id;
  end if;
  new.actualizado := now();
  return new;
end;
$$;

create trigger emp_preparar_turno before insert or update on public.turnos
  for each row execute function public.emp_preparar_turno();

create function public.emp_preparar_tarea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.equipo_id is not null and not exists (
    select 1 from public.equipos e where e.id = new.equipo_id and e.empresa_id = new.empresa_id
  ) then
    raise exception 'equipo de otra empresa';
  end if;
  if new.usuario is not null and not exists (
    select 1 from public.empresa_miembros m
    where m.empresa_id = new.empresa_id and m.usuario = new.usuario and m.estado = 'activo'
  ) then
    raise exception 'persona fuera de la empresa';
  end if;
  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
    new.hecha := false;
    new.hecha_por := null;
    new.hecha_el := null;
  else
    new.creado_por := old.creado_por;
    new.empresa_id := old.empresa_id;
  end if;
  new.actualizado := now();
  return new;
end;
$$;

create trigger emp_preparar_tarea before insert or update on public.tareas_empresa
  for each row execute function public.emp_preparar_tarea();

-- Equipos: como mucho 60 por empresa, y no cambian de empresa.
create function public.emp_preparar_equipo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.equipos where empresa_id = new.empresa_id) >= 60 then
    raise exception 'demasiados equipos';
  end if;
  if tg_op = 'UPDATE' then
    new.empresa_id := old.empresa_id;
  end if;
  return new;
end;
$$;

create trigger emp_preparar_equipo before insert or update on public.equipos
  for each row execute function public.emp_preparar_equipo();

create function public.emp_preparar_equipo_miembro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.equipos e where e.id = new.equipo_id and e.empresa_id = new.empresa_id) then
    raise exception 'equipo de otra empresa';
  end if;
  return new;
end;
$$;

create trigger emp_preparar_equipo_miembro before insert or update on public.equipo_miembros
  for each row execute function public.emp_preparar_equipo_miembro();

-- El "Ocupado" compartido solo si la persona lo tiene activado.
create function public.emp_preparar_ocupado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.empresa_miembros m
    where m.empresa_id = new.empresa_id and m.usuario = new.usuario and m.comparte_ocupado
  ) then
    raise exception 'no-comparte';
  end if;
  new.actualizado := now();
  return new;
end;
$$;

create trigger emp_preparar_ocupado before insert or update on public.ocupado_compartido
  for each row execute function public.emp_preparar_ocupado();

-- ---------------------------------------------------------------------------------
-- Reglas (RLS)
-- ---------------------------------------------------------------------------------

alter table public.empresas enable row level security;
alter table public.empresa_miembros enable row level security;
alter table public.empresa_avisos enable row level security;
alter table public.equipos enable row level security;
alter table public.equipo_miembros enable row level security;
alter table public.invitaciones_correo enable row level security;
alter table public.invitaciones_enlace enable row level security;
alter table public.eventos_empresa enable row level security;
alter table public.respuestas_evento enable row level security;
alter table public.turnos enable row level security;
alter table public.cambios_turno enable row level security;
alter table public.tareas_empresa enable row level security;
alter table public.ocupado_compartido enable row level security;

revoke all on table
  public.empresas, public.empresa_miembros, public.empresa_avisos, public.equipos,
  public.equipo_miembros, public.invitaciones_correo, public.invitaciones_enlace,
  public.eventos_empresa, public.respuestas_evento, public.turnos, public.cambios_turno,
  public.tareas_empresa, public.ocupado_compartido
from anon, authenticated;

-- Lo que se cambia por funciones (empresas, miembros) solo se lee desde fuera.
grant select on table public.empresas, public.empresa_miembros to authenticated;
grant select, insert, update, delete on table
  public.empresa_avisos, public.equipos, public.equipo_miembros, public.invitaciones_correo,
  public.invitaciones_enlace, public.eventos_empresa, public.respuestas_evento, public.turnos,
  public.tareas_empresa, public.ocupado_compartido
to authenticated;
grant select, insert, delete on table public.cambios_turno to authenticated;

-- Empresas: la ve quien está dentro (también mientras espera que le aprueben, para
-- enseñarle el nombre).
create policy "empresa propia" on public.empresas for select to authenticated
  using (exists (select 1 from public.empresa_miembros m where m.empresa_id = id and m.usuario = auth.uid()));

-- Miembros: los de mi empresa (los pendientes, solo el administrador) y mi propia fila.
create policy "miembros de mi empresa" on public.empresa_miembros for select to authenticated
  using (
    usuario = auth.uid()
    or (empresa_id = public.emp_mia() and (estado = 'activo' or public.emp_admin()))
  );

-- Avisos: cada uno los suyos.
create policy "mis avisos" on public.empresa_avisos for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

-- Equipos: los ven todos los de la empresa; los cambia el administrador.
create policy "ver equipos" on public.equipos for select to authenticated
  using (empresa_id = public.emp_mia());
create policy "admin crea equipos" on public.equipos for insert to authenticated
  with check (empresa_id = public.emp_mia() and public.emp_admin());
create policy "admin cambia equipos" on public.equipos for update to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin())
  with check (empresa_id = public.emp_mia() and public.emp_admin());
create policy "admin borra equipos" on public.equipos for delete to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin());

create policy "ver quien esta en cada equipo" on public.equipo_miembros for select to authenticated
  using (empresa_id = public.emp_mia());
create policy "admin mete en equipos" on public.equipo_miembros for insert to authenticated
  with check (empresa_id = public.emp_mia() and public.emp_admin());
create policy "admin cambia equipos de la gente" on public.equipo_miembros for update to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin())
  with check (empresa_id = public.emp_mia() and public.emp_admin());
create policy "admin saca de equipos" on public.equipo_miembros for delete to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin());

-- Invitaciones: solo el administrador.
create policy "admin invita por correo" on public.invitaciones_correo for all to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin())
  with check (empresa_id = public.emp_mia() and public.emp_admin());
create policy "admin invita con enlace" on public.invitaciones_enlace for all to authenticated
  using (empresa_id = public.emp_mia() and public.emp_admin())
  with check (empresa_id = public.emp_mia() and public.emp_admin() and caduca <= now() + interval '31 days');

-- Eventos de empresa: los de toda la empresa los ven todos; los de un equipo, sus
-- miembros y quien lo gestiona. Los crea el administrador o el responsable del equipo.
create policy "ver eventos de empresa" on public.eventos_empresa for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and (equipo_id is null or public.emp_en_equipo(equipo_id) or public.emp_responsable(equipo_id))
  );
create policy "crear eventos de empresa" on public.eventos_empresa for insert to authenticated
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );
create policy "cambiar eventos de empresa" on public.eventos_empresa for update to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  )
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );
create policy "borrar eventos de empresa" on public.eventos_empresa for delete to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );

-- Respuestas (Voy / No voy): las ve quien ve el evento; cada uno escribe la suya.
create policy "ver respuestas" on public.respuestas_evento for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and exists (select 1 from public.eventos_empresa e where e.id = evento_id)
  );
create policy "responder" on public.respuestas_evento for insert to authenticated
  with check (
    usuario = auth.uid() and empresa_id = public.emp_mia()
    and exists (select 1 from public.eventos_empresa e where e.id = evento_id and e.pide_respuesta)
  );
create policy "cambiar mi respuesta" on public.respuestas_evento for update to authenticated
  using (usuario = auth.uid())
  with check (
    usuario = auth.uid() and empresa_id = public.emp_mia()
    and exists (select 1 from public.eventos_empresa e where e.id = evento_id and e.pide_respuesta)
  );
create policy "quitar mi respuesta" on public.respuestas_evento for delete to authenticated
  using (usuario = auth.uid());

-- Turnos: cada uno los suyos, los de sus equipos (el cuadrante) y el administrador
-- todos. Los reparte el administrador o el responsable del equipo (a gente del equipo).
create policy "ver turnos" on public.turnos for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and (usuario = auth.uid() or public.emp_admin() or (equipo_id is not null and public.emp_en_equipo(equipo_id)))
  );
create policy "repartir turnos" on public.turnos for insert to authenticated
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id) and public.emp_esta_en(equipo_id, usuario)))
  );
create policy "cambiar turnos" on public.turnos for update to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  )
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id) and public.emp_esta_en(equipo_id, usuario)))
  );
create policy "quitar turnos" on public.turnos for delete to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );

-- Cambios de turno: los pide el del turno; los ve él y quien gestiona ese turno. Se
-- aprueban o rechazan con empresa_resolver_cambio.
create policy "ver cambios de turno" on public.cambios_turno for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and (
      usuario = auth.uid() or public.emp_admin()
      or exists (select 1 from public.turnos t where t.id = turno_id and t.equipo_id is not null and public.emp_responsable(t.equipo_id))
    )
  );
create policy "pedir cambio de turno" on public.cambios_turno for insert to authenticated
  with check (
    usuario = auth.uid() and empresa_id = public.emp_mia() and estado = 'pendiente'
    and resuelto_por is null
    and exists (select 1 from public.turnos t where t.id = turno_id and t.usuario = auth.uid())
  );
create policy "retirar mi cambio" on public.cambios_turno for delete to authenticated
  using (usuario = auth.uid() and estado = 'pendiente');

-- Tareas: las ve la persona (o el equipo) a la que van, quien la creó y el
-- administrador. Las crea el administrador o el responsable del equipo. Marcarlas como
-- hechas va por empresa_marcar_tarea.
create policy "ver tareas" on public.tareas_empresa for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and (
      usuario = auth.uid() or creado_por = auth.uid() or public.emp_admin()
      or (equipo_id is not null and (public.emp_en_equipo(equipo_id) or public.emp_responsable(equipo_id)))
    )
  );
create policy "asignar tareas" on public.tareas_empresa for insert to authenticated
  with check (
    empresa_id = public.emp_mia()
    and (
      public.emp_admin()
      or (equipo_id is not null and public.emp_responsable(equipo_id) and (usuario is null or public.emp_esta_en(equipo_id, usuario)))
    )
  );
create policy "cambiar tareas" on public.tareas_empresa for update to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  )
  with check (
    empresa_id = public.emp_mia()
    and (
      public.emp_admin()
      or (equipo_id is not null and public.emp_responsable(equipo_id) and (usuario is null or public.emp_esta_en(equipo_id, usuario)))
    )
  );
create policy "borrar tareas" on public.tareas_empresa for delete to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );

-- "Ocupado" compartido: lo escribe su dueño (si lo tiene activado); lo lee quien le
-- lleva (administrador o responsable de uno de sus equipos).
create policy "ver ocupado" on public.ocupado_compartido for select to authenticated
  using (usuario = auth.uid() or (empresa_id = public.emp_mia() and public.emp_gestiona_a(usuario)));
create policy "compartir mi ocupado" on public.ocupado_compartido for insert to authenticated
  with check (usuario = auth.uid() and empresa_id = public.emp_mia());
create policy "cambiar mi ocupado" on public.ocupado_compartido for update to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid() and empresa_id = public.emp_mia());
create policy "dejar de compartir" on public.ocupado_compartido for delete to authenticated
  using (usuario = auth.uid());

-- ---------------------------------------------------------------------------------
-- Avisos push (por el servicio de Expo, sin clave), como los del correo de la fase 11
-- ---------------------------------------------------------------------------------

-- "lun 5 oct"
create function public.emp_dia(p_dia date) returns text
language sql immutable set search_path = '' as $$
  select (array['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'])[extract(dow from p_dia)::int + 1]
    || ' ' || extract(day from p_dia)::int || ' '
    || (array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'])[extract(month from p_dia)::int]
$$;

-- Manda un aviso a esas personas (menos a quien hace el cambio), si lo tienen activado.
create function public.emp_avisar(p_usuarios uuid[], p_tipo text, p_titulo text, p_cuerpo text, p_seccion text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_mensajes jsonb;
  v_total integer;
  v_trozo integer := 0;
begin
  if p_usuarios is null or cardinality(p_usuarios) = 0 then
    return;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token,
      'title', p_titulo,
      'body', p_cuerpo,
      'sound', 'default',
      'data', jsonb_build_object('tipo', 'empresa', 'destino', jsonb_build_object('pantalla', 'empresa', 'seccion', p_seccion))
    )), '[]'::jsonb)
  into v_mensajes
  from public.empresa_avisos a
  cross join lateral unnest(a.tokens) as t(token)
  where a.usuario = any (p_usuarios)
    and a.usuario is distinct from auth.uid()
    and case p_tipo
      when 'turnos' then a.turnos
      when 'tareas' then a.tareas
      when 'eventos' then a.eventos
      when 'cambios' then a.cambios
      when 'altas' then a.altas
      else false
    end;
  v_total := jsonb_array_length(v_mensajes);
  -- Expo admite como mucho 100 avisos por petición.
  while v_trozo * 100 < v_total loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (
        select jsonb_agg(m.valor order by m.n)
        from jsonb_array_elements(v_mensajes) with ordinality as m(valor, n)
        where m.n > v_trozo * 100 and m.n <= (v_trozo + 1) * 100
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
    v_trozo := v_trozo + 1;
  end loop;
end;
$$;

-- Administradores activos de una empresa.
create function public.emp_admins(p_empresa uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.usuario), '{}') from public.empresa_miembros m
  where m.empresa_id = p_empresa and m.rol = 'admin' and m.estado = 'activo'
$$;

-- Turnos nuevos: un aviso por persona ("Turno nuevo" o "5 turnos nuevos").
create function public.emp_avisar_turnos_nuevos() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  if current_setting('organizy.sin_aviso_turnos', true) = '1' then
    return null;
  end if;
  for r in
    select n.usuario, count(*) as cuantos, min(n.fecha) as primero,
      (array_agg(n.entrada order by n.fecha, n.entrada))[1] as entrada,
      (array_agg(n.salida order by n.fecha, n.entrada))[1] as salida
    from nuevos n
    where n.fecha >= current_date - 1
    group by n.usuario
  loop
    if r.cuantos = 1 then
      perform public.emp_avisar(array[r.usuario], 'turnos', 'Turno nuevo',
        'El ' || public.emp_dia(r.primero) || ', de ' || r.entrada || ' a ' || r.salida || '.', 'turnos');
    else
      perform public.emp_avisar(array[r.usuario], 'turnos', r.cuantos || ' turnos nuevos',
        'El primero, el ' || public.emp_dia(r.primero) || ' de ' || r.entrada || ' a ' || r.salida || '.', 'turnos');
    end if;
  end loop;
  return null;
end;
$$;

create trigger emp_avisar_turnos_nuevos after insert on public.turnos
  referencing new table as nuevos
  for each statement execute function public.emp_avisar_turnos_nuevos();

-- Turnos cambiados (día, horas o persona).
create function public.emp_avisar_turnos_cambiados() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  if current_setting('organizy.sin_aviso_turnos', true) = '1' then
    return null;
  end if;
  -- Al que se lo han quitado para dárselo a otro.
  for r in
    select v.usuario, min(v.fecha) as fecha, count(*) as cuantos
    from viejos v join nuevos n on n.id = v.id
    where n.usuario <> v.usuario and v.fecha >= current_date - 1
    group by v.usuario
  loop
    perform public.emp_avisar(array[r.usuario], 'turnos', 'Cambio en tus turnos',
      case when r.cuantos = 1 then 'Ya no tienes el turno del ' || public.emp_dia(r.fecha) || '.'
        else 'Ya no tienes ' || r.cuantos || ' de tus turnos. El primero, el del ' || public.emp_dia(r.fecha) || '.' end,
      'turnos');
  end loop;
  -- Al que se lo han dado, o le han cambiado día u horas.
  for r in
    select n.usuario, count(*) as cuantos, min(n.fecha) as fecha,
      (array_agg(n.entrada order by n.fecha))[1] as entrada,
      (array_agg(n.salida order by n.fecha))[1] as salida
    from viejos v join nuevos n on n.id = v.id
    where (n.usuario <> v.usuario or n.fecha <> v.fecha or n.entrada <> v.entrada or n.salida <> v.salida)
      and n.fecha >= current_date - 1
    group by n.usuario
  loop
    perform public.emp_avisar(array[r.usuario], 'turnos', 'Cambio en tus turnos',
      case when r.cuantos = 1 then 'Ahora: el ' || public.emp_dia(r.fecha) || ', de ' || r.entrada || ' a ' || r.salida || '.'
        else 'Han cambiado ' || r.cuantos || ' de tus turnos. Míralos en Organizy.' end,
      'turnos');
  end loop;
  return null;
end;
$$;

create trigger emp_avisar_turnos_cambiados after update on public.turnos
  referencing old table as viejos new table as nuevos
  for each statement execute function public.emp_avisar_turnos_cambiados();

-- Turnos quitados. Al borrar la empresa o salir alguien no se avisa: para entonces
-- esa persona ya no está en la empresa.
create function public.emp_avisar_turnos_quitados() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in
    select v.usuario, count(*) as cuantos, min(v.fecha) as fecha
    from viejos v
    where v.fecha >= current_date
      and exists (select 1 from public.empresa_miembros m where m.empresa_id = v.empresa_id and m.usuario = v.usuario)
    group by v.usuario
  loop
    perform public.emp_avisar(array[r.usuario], 'turnos', 'Cambio en tus turnos',
      case when r.cuantos = 1 then 'Te han quitado el turno del ' || public.emp_dia(r.fecha) || '.'
        else 'Te han quitado ' || r.cuantos || ' turnos. El primero, el del ' || public.emp_dia(r.fecha) || '.' end,
      'turnos');
  end loop;
  return null;
end;
$$;

create trigger emp_avisar_turnos_quitados after delete on public.turnos
  referencing old table as viejos
  for each statement execute function public.emp_avisar_turnos_quitados();

-- Tarea asignada (nueva, o pasada a otra persona o equipo).
create function public.emp_avisar_tarea() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_para uuid[];
begin
  if tg_op = 'UPDATE' and new.usuario is not distinct from old.usuario and new.equipo_id is not distinct from old.equipo_id then
    return null;
  end if;
  if new.usuario is not null then
    v_para := array[new.usuario];
  else
    select coalesce(array_agg(em.usuario), '{}') into v_para from public.equipo_miembros em where em.equipo_id = new.equipo_id;
  end if;
  perform public.emp_avisar(v_para, 'tareas', 'Tarea nueva',
    new.titulo || ' · para el ' || public.emp_dia(new.fecha_limite) || '.', 'tareas');
  return null;
end;
$$;

create trigger emp_avisar_tarea after insert or update on public.tareas_empresa
  for each row execute function public.emp_avisar_tarea();

-- Evento de empresa nuevo o que cambia de día u hora.
create function public.emp_avisar_evento() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_para uuid[];
  v_cuando text;
begin
  if tg_op = 'UPDATE' and new.fecha = old.fecha and new.inicio is not distinct from old.inicio
    and new.fin is not distinct from old.fin then
    return null;
  end if;
  if new.fecha < current_date then
    return null;
  end if;
  if new.equipo_id is null then
    select coalesce(array_agg(m.usuario), '{}') into v_para from public.empresa_miembros m
    where m.empresa_id = new.empresa_id and m.estado = 'activo';
  else
    select coalesce(array_agg(em.usuario), '{}') into v_para from public.equipo_miembros em where em.equipo_id = new.equipo_id;
  end if;
  v_cuando := public.emp_dia(new.fecha) || coalesce(' a las ' || new.inicio, ', todo el día');
  perform public.emp_avisar(v_para, 'eventos',
    case when tg_op = 'INSERT' then 'Evento de empresa' else 'Cambio en un evento de empresa' end,
    new.titulo || ' · ' || v_cuando || case when new.pide_respuesta then '. ¿Vienes?' else '.' end,
    'calendario');
  return null;
end;
$$;

create trigger emp_avisar_evento after insert or update on public.eventos_empresa
  for each row execute function public.emp_avisar_evento();

-- Cambio de turno pedido (a quien lo gestiona) y resuelto (a quien lo pidió).
create function public.emp_avisar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_turno public.turnos;
  v_nombre text;
  v_para uuid[];
begin
  select * into v_turno from public.turnos t where t.id = new.turno_id;
  if tg_op = 'INSERT' then
    select m.nombre into v_nombre from public.empresa_miembros m where m.usuario = new.usuario;
    v_para := public.emp_admins(new.empresa_id);
    if v_turno.equipo_id is not null then
      select v_para || coalesce(array_agg(em.usuario), '{}') into v_para
      from public.equipo_miembros em where em.equipo_id = v_turno.equipo_id and em.responsable;
    end if;
    perform public.emp_avisar(v_para, 'cambios', 'Piden un cambio de turno',
      coalesce(nullif(v_nombre, ''), 'Alguien') || ' quiere cambiar su turno del ' || public.emp_dia(v_turno.fecha) || '.',
      'turnos');
  elsif new.estado <> old.estado and new.estado in ('aprobado', 'rechazado') then
    perform public.emp_avisar(array[new.usuario], 'cambios',
      case when new.estado = 'aprobado' then 'Cambio de turno aprobado' else 'Cambio de turno rechazado' end,
      case when new.estado = 'aprobado' then 'Ya está: tu turno del ' || public.emp_dia(v_turno.fecha) || ' ha cambiado.'
        else 'Tu turno del ' || public.emp_dia(v_turno.fecha) || ' se queda como estaba.' end,
      'turnos');
  end if;
  return null;
end;
$$;

create trigger emp_avisar_cambio after insert or update on public.cambios_turno
  for each row execute function public.emp_avisar_cambio();

-- Alguien espera que le aprueben (al administrador) o ya está dentro (a esa persona).
create function public.emp_avisar_alta() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa text;
begin
  if tg_op = 'INSERT' and new.estado = 'pendiente' then
    perform public.emp_avisar(public.emp_admins(new.empresa_id), 'altas', 'Alguien quiere entrar',
      coalesce(nullif(new.nombre, ''), new.email) || ' espera que le aceptes en la empresa.', 'equipo');
  elsif tg_op = 'UPDATE' and old.estado = 'pendiente' and new.estado = 'activo' then
    select e.nombre into v_empresa from public.empresas e where e.id = new.empresa_id;
    perform public.emp_avisar(array[new.usuario], 'altas', 'Ya estás dentro',
      'Te han aceptado en ' || coalesce(v_empresa, 'tu empresa') || '.', 'inicio');
  end if;
  return null;
end;
$$;

create trigger emp_avisar_alta after insert or update on public.empresa_miembros
  for each row execute function public.emp_avisar_alta();

-- ---------------------------------------------------------------------------------
-- Funciones que usa la app (RPC)
-- ---------------------------------------------------------------------------------

-- Crear una empresa: quien la crea es su administrador.
create function public.empresa_crear(p_nombre text, p_mi_nombre text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_correo text := public.emp_mi_correo();
  v_id uuid;
begin
  if exists (select 1 from public.empresa_miembros m where m.usuario = auth.uid()) then
    raise exception 'ya-en-empresa';
  end if;
  if (select count(*) from public.empresas e where e.creada_por = auth.uid() and e.creada > now() - interval '1 day') >= 3 then
    raise exception 'demasiadas';
  end if;
  insert into public.empresas (nombre, creada_por) values (trim(p_nombre), auth.uid()) returning id into v_id;
  insert into public.empresa_miembros (empresa_id, usuario, nombre, email, rol, estado, via)
  values (v_id, auth.uid(), left(trim(coalesce(p_mi_nombre, '')), 60), v_correo, 'admin', 'activo', 'creador');
  return v_id;
end;
$$;

-- Unirme: primero la lista de correos del jefe (entra directamente), luego el enlace de
-- invitación (queda pendiente) y luego el dominio (pendiente, o dentro si "Aprobar solo").
-- Devuelve 'activo' o 'pendiente'.
create function public.empresa_unirme(p_codigo text, p_mi_nombre text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_correo text := public.emp_mi_correo();
  v_dominio text := split_part(v_correo, '@', 2);
  v_nombre text := left(trim(coalesce(p_mi_nombre, '')), 60);
  v_empresa uuid;
  v_estado text;
  v_via text;
begin
  select m.estado into v_estado from public.empresa_miembros m where m.usuario = auth.uid();
  if v_estado is not null then
    return v_estado;
  end if;

  select i.empresa_id into v_empresa from public.invitaciones_correo i where i.email = v_correo order by i.creada desc limit 1;
  if v_empresa is not null then
    v_estado := 'activo';
    v_via := 'lista';
  elsif coalesce(p_codigo, '') <> '' then
    select i.empresa_id into v_empresa from public.invitaciones_enlace i
    where i.codigo = p_codigo and not i.anulada and i.caduca > now();
    if v_empresa is null then
      raise exception 'enlace-caducado';
    end if;
    v_estado := 'pendiente';
    v_via := 'enlace';
  else
    select e.id, case when e.aprobar_solo then 'activo' else 'pendiente' end into v_empresa, v_estado
    from public.empresas e where e.dominio = v_dominio and not public.emp_dominio_publico(v_dominio);
    if v_empresa is null then
      raise exception 'sin-invitacion';
    end if;
    v_via := 'dominio';
  end if;

  if (select count(*) from public.empresa_miembros m where m.empresa_id = v_empresa) >= 300 then
    raise exception 'empresa-llena';
  end if;
  insert into public.empresa_miembros (empresa_id, usuario, nombre, email, rol, estado, via)
  values (v_empresa, auth.uid(), v_nombre, v_correo, 'empleado', v_estado, v_via);
  if v_via = 'lista' then
    delete from public.invitaciones_correo i where i.email = v_correo;
  end if;
  return v_estado;
end;
$$;

-- Aprobar (o rechazar) a alguien que espera. Solo el administrador.
create function public.empresa_aprobar(p_usuario uuid, p_aprobar boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.emp_admin() then
    raise exception 'sin-permiso';
  end if;
  if p_aprobar then
    update public.empresa_miembros set estado = 'activo'
    where usuario = p_usuario and empresa_id = public.emp_mia() and estado = 'pendiente';
  else
    delete from public.empresa_miembros
    where usuario = p_usuario and empresa_id = public.emp_mia() and estado = 'pendiente';
  end if;
end;
$$;

-- Nombrar administrador o dejar de serlo. Siempre queda al menos uno.
create function public.empresa_cambiar_rol(p_usuario uuid, p_rol text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := public.emp_mia();
begin
  if not public.emp_admin() then
    raise exception 'sin-permiso';
  end if;
  if p_rol not in ('admin', 'empleado') then
    raise exception 'rol-desconocido';
  end if;
  update public.empresa_miembros set rol = p_rol
  where usuario = p_usuario and empresa_id = v_empresa and estado = 'activo';
  if not exists (select 1 from public.empresa_miembros m where m.empresa_id = v_empresa and m.rol = 'admin' and m.estado = 'activo') then
    raise exception 'sin-admin';
  end if;
end;
$$;

-- Sacar a alguien de la empresa (administrador). Se va todo lo suyo de la empresa: sus
-- turnos, respuestas, cambios y "Ocupado" (en cascada) y sus tareas.
create function public.empresa_quitar(p_usuario uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := public.emp_mia();
begin
  if not public.emp_admin() then
    raise exception 'sin-permiso';
  end if;
  if p_usuario = auth.uid() then
    raise exception 'usa-salir';
  end if;
  delete from public.tareas_empresa t where t.empresa_id = v_empresa and t.usuario = p_usuario;
  delete from public.empresa_miembros m where m.empresa_id = v_empresa and m.usuario = p_usuario;
end;
$$;

-- Salir de la empresa: se borra la cuenta de empresa de esta persona y, con ella, todo
-- lo suyo en el servidor. Si es el único administrador y queda más gente, antes tiene
-- que nombrar a otro. Si no queda nadie más, se borra también la empresa.
create function public.empresa_salir() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_yo public.empresa_miembros;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    or not exists (select 1 from auth.users u where u.id = auth.uid() and not u.is_anonymous) then
    raise exception 'sin-cuenta';
  end if;
  select * into v_yo from public.empresa_miembros m where m.usuario = auth.uid();
  if v_yo.empresa_id is not null then
    if not exists (select 1 from public.empresa_miembros m where m.empresa_id = v_yo.empresa_id and m.usuario <> auth.uid()) then
      delete from public.empresas e where e.id = v_yo.empresa_id;
    elsif v_yo.rol = 'admin' and v_yo.estado = 'activo' and not exists (
      select 1 from public.empresa_miembros m
      where m.empresa_id = v_yo.empresa_id and m.usuario <> auth.uid() and m.rol = 'admin' and m.estado = 'activo'
    ) then
      raise exception 'unico-admin';
    end if;
  end if;
  delete from auth.users u where u.id = auth.uid() and not u.is_anonymous;
end;
$$;

-- Borrar la empresa (administrador): se va todo lo de la empresa y la cuenta de quien la
-- borra. Los demás, al abrir Organizy, ven que ya no existe.
create function public.empresa_borrar() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.emp_admin() then
    raise exception 'sin-permiso';
  end if;
  delete from public.empresas e where e.id = public.emp_mia();
  delete from auth.users u where u.id = auth.uid() and not u.is_anonymous;
end;
$$;

-- Nombre, dominio y "Aprobar solo" (administrador). El dominio tiene que ser el de su
-- propio correo y no uno gratuito.
create function public.empresa_ajustes(p_nombre text, p_dominio text, p_aprobar_solo boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_dominio text := nullif(lower(trim(coalesce(p_dominio, ''))), '');
  v_empresa uuid := public.emp_mia();
begin
  if not public.emp_admin() then
    raise exception 'sin-permiso';
  end if;
  if v_dominio is not null then
    if public.emp_dominio_publico(v_dominio) then
      raise exception 'dominio-publico';
    end if;
    if v_dominio <> split_part(public.emp_mi_correo(), '@', 2) then
      raise exception 'dominio-ajeno';
    end if;
    if exists (select 1 from public.empresas e where e.dominio = v_dominio and e.id <> v_empresa) then
      raise exception 'dominio-en-uso';
    end if;
  end if;
  update public.empresas set
    nombre = coalesce(nullif(trim(coalesce(p_nombre, '')), ''), nombre),
    dominio = v_dominio,
    aprobar_solo = v_dominio is not null and coalesce(p_aprobar_solo, false)
  where id = v_empresa;
end;
$$;

-- Mi nombre en la empresa y si comparto mis huecos personales como "Ocupado". Al dejar
-- de compartir, se borra lo que hubiera.
create function public.empresa_mis_datos(p_nombre text, p_comparte boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.empresa_miembros set
    nombre = coalesce(left(trim(p_nombre), 60), nombre),
    comparte_ocupado = coalesce(p_comparte, comparte_ocupado)
  where usuario = auth.uid();
  if not coalesce(p_comparte, true) then
    delete from public.ocupado_compartido o where o.usuario = auth.uid();
  end if;
end;
$$;

-- Marcar una tarea como hecha (o deshacerlo): la persona o el equipo a la que va y
-- quien la gestiona.
create function public.empresa_marcar_tarea(p_id uuid, p_hecha boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.tareas_empresa t set
    hecha = p_hecha,
    hecha_por = case when p_hecha then auth.uid() end,
    hecha_el = case when p_hecha then now() end
  where t.id = p_id and t.empresa_id = public.emp_mia()
    and (
      t.usuario = auth.uid() or public.emp_admin()
      or (t.equipo_id is not null and (public.emp_en_equipo(t.equipo_id) or public.emp_responsable(t.equipo_id)))
    );
  if not found then
    raise exception 'sin-permiso';
  end if;
end;
$$;

-- Aprobar o rechazar un cambio de turno (quien gestiona el turno). Al aprobarlo se
-- cambia el turno; los avisos los manda el propio cambio (no el del turno).
create function public.empresa_resolver_cambio(p_id uuid, p_aprobar boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_cambio public.cambios_turno;
  v_turno public.turnos;
begin
  select * into v_cambio from public.cambios_turno c
  where c.id = p_id and c.empresa_id = public.emp_mia() and c.estado = 'pendiente';
  if v_cambio.id is null then
    raise exception 'no-existe';
  end if;
  select * into v_turno from public.turnos t where t.id = v_cambio.turno_id;
  if not (public.emp_admin() or (v_turno.equipo_id is not null and public.emp_responsable(v_turno.equipo_id))) then
    raise exception 'sin-permiso';
  end if;
  if p_aprobar then
    perform set_config('organizy.sin_aviso_turnos', '1', true);
    update public.turnos t set
      fecha = coalesce(v_cambio.fecha, t.fecha),
      entrada = coalesce(v_cambio.entrada, t.entrada),
      salida = coalesce(v_cambio.salida, t.salida),
      usuario = coalesce(v_cambio.cubre, t.usuario)
    where t.id = v_turno.id;
    perform set_config('organizy.sin_aviso_turnos', '', true);
    if v_cambio.cubre is not null and v_cambio.cubre <> v_turno.usuario then
      perform public.emp_avisar(array[v_cambio.cubre], 'turnos', 'Turno nuevo',
        'Cubres el turno del ' || public.emp_dia(coalesce(v_cambio.fecha, v_turno.fecha)) || '.', 'turnos');
    end if;
  end if;
  update public.cambios_turno set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
    resuelto_por = auth.uid()
  where id = p_id;
end;
$$;

-- Quién puede llamar a qué: las funciones de la app, solo con sesión; las internas
-- (avisos), nadie desde fuera.
revoke execute on function
  public.emp_mia(), public.emp_admin(), public.emp_en_equipo(uuid), public.emp_responsable(uuid),
  public.emp_esta_en(uuid, uuid), public.emp_gestiona_a(uuid), public.emp_dominio_publico(text),
  public.emp_mi_correo(), public.emp_dia(date), public.emp_avisar(uuid[], text, text, text, text),
  public.emp_admins(uuid), public.empresa_crear(text, text), public.empresa_unirme(text, text),
  public.empresa_aprobar(uuid, boolean), public.empresa_cambiar_rol(uuid, text),
  public.empresa_quitar(uuid), public.empresa_salir(), public.empresa_borrar(),
  public.empresa_ajustes(text, text, boolean), public.empresa_mis_datos(text, boolean),
  public.empresa_marcar_tarea(uuid, boolean), public.empresa_resolver_cambio(uuid, boolean)
from public, anon, authenticated;

grant execute on function
  public.emp_mia(), public.emp_admin(), public.emp_en_equipo(uuid), public.emp_responsable(uuid),
  public.emp_esta_en(uuid, uuid), public.emp_gestiona_a(uuid),
  public.empresa_crear(text, text), public.empresa_unirme(text, text),
  public.empresa_aprobar(uuid, boolean), public.empresa_cambiar_rol(uuid, text),
  public.empresa_quitar(uuid), public.empresa_salir(), public.empresa_borrar(),
  public.empresa_ajustes(text, text, boolean), public.empresa_mis_datos(text, boolean),
  public.empresa_marcar_tarea(uuid, boolean), public.empresa_resolver_cambio(uuid, boolean)
to authenticated;

-- ---------------------------------------------------------------------------------
-- Limpieza de cada noche (4:30, hora del servidor)
-- ---------------------------------------------------------------------------------

create function public.emp_limpiar() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.turnos where fecha < current_date - 400;
  delete from public.eventos_empresa where fecha < current_date - 400;
  delete from public.tareas_empresa where hecha and hecha_el < now() - interval '180 days';
  delete from public.cambios_turno where estado <> 'pendiente' and creado < now() - interval '90 days';
  delete from public.invitaciones_enlace where caduca < now() - interval '30 days';
  delete from public.empresa_miembros where estado = 'pendiente' and alta < now() - interval '60 days';
  delete from public.ocupado_compartido where actualizado < now() - interval '60 days';
  -- Cuentas de Google o Microsoft que ya no están en ninguna empresa (quien entró y no
  -- llegó a unirse, o aquel cuya empresa se borró) y no han vuelto en 30 días. Solo se
  -- usan para Organizy grupal: las sesiones anónimas de la app no se tocan.
  delete from auth.users u
  where not u.is_anonymous
    and u.raw_app_meta_data ->> 'provider' in ('google', 'azure')
    and not exists (select 1 from public.empresa_miembros m where m.usuario = u.id)
    and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '30 days';
end;
$$;

revoke execute on function public.emp_limpiar() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('organizy-limpiar-empresas', '30 4 * * *', $$select public.emp_limpiar()$$);
