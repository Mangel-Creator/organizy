-- Pruebas de las reglas del chat de empresa y de los avisos
-- (supabase/migrations/20260929020000_empresa_chat.sql).
--
-- Como empresa_rls.sql: se ejecutan contra el Supabase real dentro de una transacción que
-- se deshace al final (rollback) y no dejan nada.
--
--   npx supabase db query --linked --project-ref <ref> --file supabase/tests/empresa_chat_rls.sql
--
-- Si todo va bien, termina con una fila: resultado = "todo bien".

begin;

create function pg_temp.comprobar(p_ok boolean, p_que text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'FALLA: %', p_que;
  end if;
end;
$$;

create function pg_temp.falla(p_sql text, p_que text, p_error text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_error is not null and position(p_error in sqlerrm) = 0 then
      raise exception 'FALLA: % (error inesperado: %)', p_que, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FALLA: % (debería haber fallado)', p_que;
end;
$$;

create function pg_temp.cuantos(p_sql text) returns integer
language plpgsql as $$
declare
  n integer;
begin
  execute 'select count(*) from (' || p_sql || ') x' into n;
  return n;
end;
$$;

grant execute on function pg_temp.comprobar(boolean, text), pg_temp.falla(text, text, text), pg_temp.cuantos(text) to authenticated;

create temporary table gente (quien text primary key, id uuid not null default gen_random_uuid(), correo text);
insert into gente (quien, correo) values
  ('jefe', 'jefe@bar-chat-organizy.es'),
  ('laura', 'laura.chat.organizy@gmail.com'),
  ('javi', 'javi.chat.organizy@gmail.com'),
  ('ana', 'ana.chat.organizy@gmail.com'),
  ('otra', 'jefa@otra-chat-organizy.es');
grant select on gente to authenticated;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_app_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', g.id, 'authenticated', 'authenticated', g.correo, false,
  '{"provider": "google", "providers": ["google"]}'::jsonb, now(), now()
from gente g;

create temporary table datos (clave text primary key, valor text);
grant select, insert, update on datos to authenticated;

create function pg_temp.como(p_quien text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', (select id from gente where quien = p_quien), 'role', 'authenticated', 'is_anonymous', false
  )::text, true);
end;
$$;
grant execute on function pg_temp.como(text) to authenticated;

set local role authenticated;

-- Empresa con Cocina (Laura dentro) y Javi y Ana fuera de Cocina.
select pg_temp.como('jefe');
insert into datos values ('bar', public.empresa_crear('Bar del chat', 'Pepe')::text);
insert into public.invitaciones_correo (empresa_id, email)
select (select valor::uuid from datos where clave = 'bar'), correo from gente where quien in ('laura', 'javi', 'ana');
with x as (
  insert into public.equipos (empresa_id, nombre) values ((select valor::uuid from datos where clave = 'bar'), 'Cocina') returning id
) insert into datos select 'cocina', id::text from x;
select pg_temp.como('laura');
select public.empresa_unirme(null, 'Laura');
select pg_temp.como('javi');
select public.empresa_unirme(null, 'Javi');
select pg_temp.como('ana');
select public.empresa_unirme(null, 'Ana');
select pg_temp.como('jefe');
insert into public.equipo_miembros (equipo_id, empresa_id, usuario, responsable)
values ((select valor::uuid from datos where clave = 'cocina'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'laura'), true);

insert into datos select 'general', id::text from public.chat_canales where tipo = 'general';
insert into datos select 'canal_cocina', id::text from public.chat_canales where tipo = 'equipo';

-- 1. Los canales se crean solos y cada uno ve los suyos.
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_canales') = 2, 'el jefe ve General y Cocina');
select pg_temp.como('javi');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_canales') = 1, 'Javi (fuera de Cocina) solo ve General');
select pg_temp.como('laura');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_canales') = 2, 'Laura ve General y Cocina');

-- 2. Escribir: en General todos; en Cocina, solo los de Cocina. El autor lo pone el servidor.
select pg_temp.como('javi');
insert into public.chat_mensajes (canal_id, empresa_id, autor, texto)
values ((select valor::uuid from datos where clave = 'general'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'jefe'), 'Hola a todos');
select pg_temp.comprobar((select autor from public.chat_mensajes limit 1) = (select id from gente where quien = 'javi'), 'nadie escribe en nombre de otro');
select pg_temp.falla($$insert into public.chat_mensajes (canal_id, empresa_id, texto)
  values ((select valor::uuid from datos where clave = 'canal_cocina'), (select valor::uuid from datos where clave = 'bar'), 'Me cuelo')$$,
  'quien no está en Cocina no escribe en su canal');
select pg_temp.falla($$insert into public.chat_mensajes (canal_id, empresa_id, texto)
  values ((select valor::uuid from datos where clave = 'general'), (select valor::uuid from datos where clave = 'bar'), '   ')$$,
  'no hay mensajes vacíos', 'mensaje-vacio');

-- 3. Chat privado Javi-Laura: ni Ana ni el jefe lo ven.
insert into datos values ('privado', public.chat_privado((select id from gente where quien = 'laura'))::text);
insert into public.chat_mensajes (canal_id, empresa_id, texto)
values ((select valor::uuid from datos where clave = 'privado'), (select valor::uuid from datos where clave = 'bar'), 'Esto es entre tú y yo');
select pg_temp.comprobar(public.chat_privado((select id from gente where quien = 'laura'))::text = (select valor from datos where clave = 'privado'), 'el mismo chat privado, no otro');
select pg_temp.como('ana');
select pg_temp.comprobar(pg_temp.cuantos($$select * from public.chat_mensajes where texto = 'Esto es entre tú y yo'$$) = 0, 'Ana no lee el privado');
select pg_temp.falla($$insert into public.chat_mensajes (canal_id, empresa_id, texto)
  values ((select valor::uuid from datos where clave = 'privado'), (select valor::uuid from datos where clave = 'bar'), 'Hola')$$,
  'Ana no escribe en el privado de otros');
select pg_temp.como('jefe');
select pg_temp.comprobar(pg_temp.cuantos($$select * from public.chat_mensajes where texto = 'Esto es entre tú y yo'$$) = 0, 'el jefe no lee los privados');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_canales') = 2, 'el jefe ni siquiera ve que existe');

-- 4. Sin leer: a Laura le salen el de General y el privado.
select pg_temp.como('laura');
select pg_temp.comprobar((select sum(sin_leer) from public.chat_resumen()) = 2, 'Laura tiene 2 sin leer');
insert into public.chat_leidos (canal_id, usuario) values ((select valor::uuid from datos where clave = 'general'), (select id from gente where quien = 'laura'));
select pg_temp.comprobar((select sum(sin_leer) from public.chat_resumen()) = 1, 'al leer General queda 1');
select pg_temp.falla($$select public.chat_borrar_mensaje((select id from public.chat_mensajes where texto = 'Hola a todos'))$$,
  'nadie borra mensajes de otro', 'sin-permiso');

-- 5. Avisos: el empleado no publica; la responsable, solo a su equipo; el jefe, a todos.
select pg_temp.como('javi');
select public.chat_borrar_mensaje((select id from public.chat_mensajes where texto = 'Hola a todos'));
select pg_temp.comprobar((select borrado from public.chat_mensajes where canal_id = (select valor::uuid from datos where clave = 'general')), 'Javi borra su mensaje');
select pg_temp.falla($$insert into public.anuncios (empresa_id, titulo) values ((select valor::uuid from datos where clave = 'bar'), 'Mando yo')$$,
  'un empleado no publica avisos');
select pg_temp.como('laura');
with x as (
  insert into public.anuncios (empresa_id, equipo_id, titulo, texto)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'), 'Limpieza de cámara', 'El viernes a las 16:00') returning id
) insert into datos select 'aviso_cocina', id::text from x;
select pg_temp.falla($$insert into public.anuncios (empresa_id, titulo) values ((select valor::uuid from datos where clave = 'bar'), 'Para todos')$$,
  'la responsable no publica a toda la empresa');
select pg_temp.como('jefe');
with x as (
  insert into public.anuncios (empresa_id, titulo, importante) values ((select valor::uuid from datos where clave = 'bar'), 'Cerramos el lunes', true) returning id
) insert into datos select 'aviso_todos', id::text from x;
select pg_temp.como('javi');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.anuncios') = 1, 'Javi solo ve el de toda la empresa');
insert into public.anuncios_leidos (anuncio_id, usuario) values ((select valor::uuid from datos where clave = 'aviso_todos'), (select id from gente where quien = 'javi'));
select pg_temp.falla($$insert into public.anuncios_leidos (anuncio_id, usuario) values ((select valor::uuid from datos where clave = 'aviso_cocina'), (select id from gente where quien = 'javi'))$$,
  'no se marca leído lo que no ves');
select pg_temp.falla($$insert into public.anuncios_leidos (anuncio_id, usuario) values ((select valor::uuid from datos where clave = 'aviso_todos'), (select id from gente where quien = 'ana'))$$,
  'nadie marca leído por otro');
select pg_temp.como('jefe');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.anuncios_leidos') = 1, 'el jefe ve quién lo ha leído');

-- 6. Otra empresa no ve nada.
select pg_temp.como('otra');
select public.empresa_crear('Otra', 'Marta');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_canales') = 1, 'otra empresa solo ve su General');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.chat_mensajes') + pg_temp.cuantos('select * from public.anuncios') = 0,
  'otra empresa no ve mensajes ni avisos de esta');
select pg_temp.falla($$select public.chat_privado((select id from gente where quien = 'javi'))$$, 'no se abre un privado con alguien de otra empresa', 'sin-permiso');

reset role;
select pg_temp.comprobar(exists (
  select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_mensajes'
), 'el chat va al momento (Realtime)');

select 'todo bien' as resultado;

rollback;
