-- Organizy · fase 15b: chat de empresa y avisos de los superiores (plan empresa), al
-- estilo de Microsoft Teams. Se apoya en 20260929010000_empresa.sql.
--
-- Dentro de la misma excepción del plan empresa (solo lo de la empresa va al servidor):
--   - chat_canales: "General" (toda la empresa, se crea solo), uno por equipo (se crea
--     solo con el equipo) y los chats privados entre dos personas.
--   - chat_mensajes: el texto de cada mensaje, quién y cuándo. Se borran solos a los 180
--     días. No van cifrados de extremo a extremo: están en el servidor de Organizy.
--   - chat_leidos: hasta dónde ha leído cada uno cada canal (para los "sin leer").
--   - anuncios y anuncios_leidos: los avisos que publican el administrador y los
--     responsables, y quién los ha leído.
--
-- Quién ve qué (RLS):
--   - General: todos los de la empresa. Canal de un equipo: los del equipo, su
--     responsable y el administrador. Chat privado: SOLO esas dos personas (el jefe no).
--   - Avisos: los de toda la empresa, todos; los de un equipo, los del equipo y quien lo
--     gestiona. Los publica el administrador (a todos o a un equipo) o el responsable
--     (solo a su equipo).
--
-- Pruebas: supabase/tests/empresa_chat_rls.sql.

-- ---------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------

create table public.chat_canales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in ('general', 'equipo', 'privado')),
  equipo_id uuid references public.equipos (id) on delete cascade,
  -- Chat privado: las dos personas, la de id menor primero.
  persona_a uuid references auth.users (id) on delete cascade,
  persona_b uuid references auth.users (id) on delete cascade,
  ultimo_mensaje timestamptz,
  creado timestamptz not null default now(),
  check ((tipo = 'equipo') = (equipo_id is not null)),
  check ((tipo = 'privado') = (persona_a is not null and persona_b is not null)),
  check (persona_a is null or persona_a < persona_b)
);
create unique index chat_canales_general on public.chat_canales (empresa_id) where tipo = 'general';
create unique index chat_canales_equipo on public.chat_canales (equipo_id) where tipo = 'equipo';
create unique index chat_canales_privado on public.chat_canales (empresa_id, persona_a, persona_b) where tipo = 'privado';

create table public.chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references public.chat_canales (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  autor uuid references auth.users (id) on delete set null,
  texto text not null check (char_length(texto) <= 2000),
  borrado boolean not null default false,
  creado timestamptz not null default now()
);
create index chat_mensajes_canal on public.chat_mensajes (canal_id, creado desc);

create table public.chat_leidos (
  canal_id uuid not null references public.chat_canales (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  leido_hasta timestamptz not null default now(),
  primary key (canal_id, usuario)
);

create table public.anuncios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  equipo_id uuid references public.equipos (id) on delete cascade, -- null = toda la empresa
  autor uuid references auth.users (id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 120),
  texto text not null default '' check (char_length(texto) <= 4000),
  importante boolean not null default false,
  creado timestamptz not null default now()
);
create index anuncios_empresa on public.anuncios (empresa_id, creado desc);

create table public.anuncios_leidos (
  anuncio_id uuid not null references public.anuncios (id) on delete cascade,
  usuario uuid not null references auth.users (id) on delete cascade,
  el timestamptz not null default now(),
  primary key (anuncio_id, usuario)
);

-- Qué avisos del chat y de los anuncios quiere cada uno (junto a los demás de empresa).
alter table public.empresa_avisos add column chat boolean not null default true;
alter table public.empresa_avisos add column anuncios boolean not null default true;

-- ---------------------------------------------------------------------------------
-- Quién ve cada canal
-- ---------------------------------------------------------------------------------

create function public.emp_ve_canal(p_canal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_canales c
    where c.id = p_canal and c.empresa_id = public.emp_mia()
      and (
        c.tipo = 'general'
        or (c.tipo = 'equipo' and (public.emp_en_equipo(c.equipo_id) or public.emp_responsable(c.equipo_id)))
        or (c.tipo = 'privado' and auth.uid() in (c.persona_a, c.persona_b))
      )
  )
$$;

create function public.emp_ve_anuncio(p_anuncio uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.anuncios a
    where a.id = p_anuncio and a.empresa_id = public.emp_mia()
      and (a.equipo_id is null or public.emp_en_equipo(a.equipo_id) or public.emp_responsable(a.equipo_id))
  )
$$;

-- ---------------------------------------------------------------------------------
-- Canales que se crean solos
-- ---------------------------------------------------------------------------------

create function public.emp_canal_general() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_canales (empresa_id, tipo) values (new.id, 'general') on conflict do nothing;
  return null;
end;
$$;

create trigger emp_canal_general after insert on public.empresas
  for each row execute function public.emp_canal_general();

create function public.emp_canal_equipo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.chat_canales (empresa_id, tipo, equipo_id) values (new.empresa_id, 'equipo', new.id) on conflict do nothing;
  return null;
end;
$$;

create trigger emp_canal_equipo after insert on public.equipos
  for each row execute function public.emp_canal_equipo();

-- Los que ya existían.
insert into public.chat_canales (empresa_id, tipo) select e.id, 'general' from public.empresas e on conflict do nothing;
insert into public.chat_canales (empresa_id, tipo, equipo_id) select q.empresa_id, 'equipo', q.id from public.equipos q on conflict do nothing;

-- ---------------------------------------------------------------------------------
-- Mensajes: comprobar, apuntar el último y avisar
-- ---------------------------------------------------------------------------------

create function public.emp_preparar_mensaje() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.autor := auth.uid();
  new.creado := now();
  new.borrado := false;
  new.texto := trim(new.texto);
  if new.texto = '' then
    raise exception 'mensaje-vacio';
  end if;
  select c.empresa_id into new.empresa_id from public.chat_canales c where c.id = new.canal_id;
  -- Como mucho 30 mensajes por minuto por persona.
  if (select count(*) from public.chat_mensajes m where m.autor = auth.uid() and m.creado > now() - interval '1 minute') >= 30 then
    raise exception 'demasiados-mensajes';
  end if;
  return new;
end;
$$;

create trigger emp_preparar_mensaje before insert on public.chat_mensajes
  for each row execute function public.emp_preparar_mensaje();

create function public.emp_avisar_mensaje() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_canal public.chat_canales;
  v_para uuid[];
  v_nombre text;
  v_titulo text;
begin
  update public.chat_canales set ultimo_mensaje = new.creado where id = new.canal_id returning * into v_canal;
  select coalesce(nullif(m.nombre, ''), split_part(m.email, '@', 1)) into v_nombre
  from public.empresa_miembros m where m.usuario = new.autor;
  if v_canal.tipo = 'privado' then
    v_para := array[v_canal.persona_a, v_canal.persona_b];
    v_titulo := coalesce(v_nombre, 'Mensaje nuevo');
  elsif v_canal.tipo = 'equipo' then
    select coalesce(array_agg(em.usuario), '{}') into v_para from public.equipo_miembros em where em.equipo_id = v_canal.equipo_id;
    v_titulo := coalesce(v_nombre, 'Alguien') || ' en ' || coalesce((select q.nombre from public.equipos q where q.id = v_canal.equipo_id), 'tu equipo');
  else
    select coalesce(array_agg(m.usuario), '{}') into v_para from public.empresa_miembros m
    where m.empresa_id = v_canal.empresa_id and m.estado = 'activo';
    v_titulo := coalesce(v_nombre, 'Alguien') || ' en General';
  end if;
  perform public.emp_avisar_chat(v_para, v_titulo, left(new.texto, 140), v_canal.id);
  return null;
end;
$$;

-- Como emp_avisar, pero con el canal en el destino (para abrirlo al tocar el aviso).
create function public.emp_avisar_chat(p_usuarios uuid[], p_titulo text, p_cuerpo text, p_canal uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_mensajes jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', p_titulo, 'body', p_cuerpo, 'sound', 'default',
      'data', jsonb_build_object('tipo', 'empresa', 'destino',
        jsonb_build_object('pantalla', 'empresa', 'seccion', 'chat', 'id', p_canal))
    )), '[]'::jsonb)
  into v_mensajes
  from public.empresa_avisos a
  cross join lateral unnest(a.tokens) as t(token)
  where a.usuario = any (p_usuarios) and a.usuario is distinct from auth.uid() and a.chat;
  if jsonb_array_length(v_mensajes) > 0 then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := v_mensajes,
      headers := '{"Content-Type": "application/json"}'::jsonb);
  end if;
end;
$$;

create trigger emp_avisar_mensaje after insert on public.chat_mensajes
  for each row execute function public.emp_avisar_mensaje();

-- Anuncio nuevo: a quien va dirigido.
create function public.emp_preparar_anuncio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.equipo_id is not null and not exists (
    select 1 from public.equipos e where e.id = new.equipo_id and e.empresa_id = new.empresa_id
  ) then
    raise exception 'equipo de otra empresa';
  end if;
  if tg_op = 'INSERT' then
    new.autor := auth.uid();
    new.creado := now();
  else
    new.autor := old.autor;
    new.creado := old.creado;
    new.empresa_id := old.empresa_id;
  end if;
  return new;
end;
$$;

create trigger emp_preparar_anuncio before insert or update on public.anuncios
  for each row execute function public.emp_preparar_anuncio();

create function public.emp_avisar_anuncio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_para uuid[];
  v_mensajes jsonb;
begin
  if new.equipo_id is null then
    select coalesce(array_agg(m.usuario), '{}') into v_para from public.empresa_miembros m
    where m.empresa_id = new.empresa_id and m.estado = 'activo';
  else
    select coalesce(array_agg(em.usuario), '{}') into v_para from public.equipo_miembros em where em.equipo_id = new.equipo_id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token,
      'title', case when new.importante then 'Importante: ' else 'Aviso: ' end || new.titulo,
      'body', left(coalesce(nullif(new.texto, ''), 'Ábrelo en Organizy.'), 140),
      'sound', 'default',
      'data', jsonb_build_object('tipo', 'empresa', 'destino', jsonb_build_object('pantalla', 'empresa', 'seccion', 'avisos'))
    )), '[]'::jsonb)
  into v_mensajes
  from public.empresa_avisos a
  cross join lateral unnest(a.tokens) as t(token)
  where a.usuario = any (v_para) and a.usuario is distinct from auth.uid() and a.anuncios;
  if jsonb_array_length(v_mensajes) > 0 then
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := v_mensajes,
      headers := '{"Content-Type": "application/json"}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger emp_avisar_anuncio after insert on public.anuncios
  for each row execute function public.emp_avisar_anuncio();

-- ---------------------------------------------------------------------------------
-- Reglas (RLS)
-- ---------------------------------------------------------------------------------

alter table public.chat_canales enable row level security;
alter table public.chat_mensajes enable row level security;
alter table public.chat_leidos enable row level security;
alter table public.anuncios enable row level security;
alter table public.anuncios_leidos enable row level security;

revoke all on table public.chat_canales, public.chat_mensajes, public.chat_leidos, public.anuncios, public.anuncios_leidos
from anon, authenticated;
grant select on table public.chat_canales to authenticated;
grant select, insert on table public.chat_mensajes to authenticated;
grant select, insert, update, delete on table public.chat_leidos, public.anuncios to authenticated;
grant select, insert, delete on table public.anuncios_leidos to authenticated;

create policy "ver mis canales" on public.chat_canales for select to authenticated
  using (public.emp_ve_canal(id));

create policy "leer mensajes" on public.chat_mensajes for select to authenticated
  using (public.emp_ve_canal(canal_id));
create policy "escribir mensajes" on public.chat_mensajes for insert to authenticated
  with check (public.emp_ve_canal(canal_id));

create policy "mis leidos" on public.chat_leidos for all to authenticated
  using (usuario = auth.uid())
  with check (usuario = auth.uid() and public.emp_ve_canal(canal_id));

-- Con los datos de la fila (no por su id: al crearlo, aún no se ve y fallaría el "returning").
create policy "ver anuncios" on public.anuncios for select to authenticated
  using (
    empresa_id = public.emp_mia()
    and (equipo_id is null or public.emp_en_equipo(equipo_id) or public.emp_responsable(equipo_id))
  );
create policy "publicar anuncios" on public.anuncios for insert to authenticated
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );
create policy "cambiar anuncios" on public.anuncios for update to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  )
  with check (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );
create policy "quitar anuncios" on public.anuncios for delete to authenticated
  using (
    empresa_id = public.emp_mia()
    and (public.emp_admin() or (equipo_id is not null and public.emp_responsable(equipo_id)))
  );

-- Quién lo ha leído: lo ve quien ve el aviso (como "Visto por" en Teams).
create policy "ver quien lo ha leido" on public.anuncios_leidos for select to authenticated
  using (public.emp_ve_anuncio(anuncio_id));
create policy "marcar leido" on public.anuncios_leidos for insert to authenticated
  with check (usuario = auth.uid() and public.emp_ve_anuncio(anuncio_id));
create policy "desmarcar leido" on public.anuncios_leidos for delete to authenticated
  using (usuario = auth.uid());

-- ---------------------------------------------------------------------------------
-- Funciones para la app
-- ---------------------------------------------------------------------------------

-- El chat privado con otra persona de mi empresa (lo crea si no existe).
create function public.chat_privado(p_persona uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_empresa uuid := public.emp_mia();
  v_a uuid := least(auth.uid(), p_persona);
  v_b uuid := greatest(auth.uid(), p_persona);
  v_id uuid;
begin
  if v_empresa is null or p_persona = auth.uid() or not exists (
    select 1 from public.empresa_miembros m where m.usuario = p_persona and m.empresa_id = v_empresa and m.estado = 'activo'
  ) then
    raise exception 'sin-permiso';
  end if;
  select c.id into v_id from public.chat_canales c
  where c.empresa_id = v_empresa and c.tipo = 'privado' and c.persona_a = v_a and c.persona_b = v_b;
  if v_id is null then
    insert into public.chat_canales (empresa_id, tipo, persona_a, persona_b) values (v_empresa, 'privado', v_a, v_b)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Cada canal que veo con lo último y cuántos mensajes no he leído.
create function public.chat_resumen()
returns table (canal_id uuid, sin_leer integer, ultimo_texto text, ultimo_autor uuid, ultimo_el timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id,
    (select count(*)::int from public.chat_mensajes m
      where m.canal_id = c.id and m.autor is distinct from auth.uid() and not m.borrado
        and m.creado > coalesce((select l.leido_hasta from public.chat_leidos l where l.canal_id = c.id and l.usuario = auth.uid()), '-infinity')),
    u.texto, u.autor, u.creado
  from public.chat_canales c
  left join lateral (
    select m.texto, m.autor, m.creado from public.chat_mensajes m
    where m.canal_id = c.id and not m.borrado order by m.creado desc limit 1
  ) u on true
  where public.emp_ve_canal(c.id)
$$;

-- Borrar un mensaje mío (queda "Mensaje borrado").
create function public.chat_borrar_mensaje(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_mensajes set borrado = true, texto = '' where id = p_id and autor = auth.uid();
  if not found then
    raise exception 'sin-permiso';
  end if;
end;
$$;

revoke execute on function public.emp_ve_canal(uuid), public.emp_ve_anuncio(uuid), public.chat_privado(uuid),
  public.chat_resumen(), public.chat_borrar_mensaje(uuid), public.emp_avisar_chat(uuid[], text, text, uuid)
from public, anon, authenticated;
grant execute on function public.emp_ve_canal(uuid), public.emp_ve_anuncio(uuid), public.chat_privado(uuid),
  public.chat_resumen(), public.chat_borrar_mensaje(uuid)
to authenticated;

-- El chat al momento (Supabase Realtime respeta las reglas de arriba).
alter publication supabase_realtime add table public.chat_mensajes;

-- Limpieza de cada noche: mensajes de más de 180 días y avisos de más de un año.
create function public.emp_limpiar_chat() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.chat_mensajes where creado < now() - interval '180 days';
  delete from public.anuncios where creado < now() - interval '365 days';
end;
$$;
revoke execute on function public.emp_limpiar_chat() from public, anon, authenticated;
select cron.schedule('organizy-limpiar-chat-empresa', '40 4 * * *', $$select public.emp_limpiar_chat()$$);
