-- Pruebas de las reglas de Organizy grupal (supabase/migrations/20260929010000_empresa.sql).
--
-- Se ejecutan contra el Supabase real dentro de una transacción que se deshace al final
-- (rollback): crean personas de prueba, prueban lo que cada una puede ver y cambiar, y no
-- dejan nada. Si algo no se cumple, se para con "FALLA: ..." y el motivo.
--
--   npx supabase db query --linked --project-ref <ref> --file supabase/tests/empresa_rls.sql
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

-- Tiene que dar error (y si se pasa el texto, que el error lo lleve).
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

-- Cuántas filas cambia (las reglas no dan error al cambiar o borrar lo que no ves: no
-- cambian nada).
create function pg_temp.filas(p_sql text) returns integer
language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
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

grant execute on function pg_temp.comprobar(boolean, text), pg_temp.falla(text, text, text), pg_temp.filas(text), pg_temp.cuantos(text) to authenticated;

-- Personas de prueba (sus correos no existen de verdad).
create temporary table gente (quien text primary key, id uuid not null default gen_random_uuid(), correo text, anonimo boolean default false);
insert into gente (quien, correo, anonimo) values
  ('jefe', 'jefe@bar-prueba-organizy.es', false),
  ('laura', 'laura@bar-prueba-organizy.es', false),
  ('javi', 'javi.prueba.organizy@gmail.com', false),
  ('ana', 'ana.prueba.organizy@gmail.com', false),
  ('intruso', 'alguien@otra-prueba-organizy.es', false),
  ('otrojefe', 'jefa@otra-prueba-organizy.es', false),
  ('anonimo', null, true);
grant select on gente to authenticated;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, raw_app_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', g.id, 'authenticated', 'authenticated', g.correo, g.anonimo,
  case when g.anonimo then '{}'::jsonb else '{"provider": "google", "providers": ["google"]}'::jsonb end, now(), now()
from gente g;

create temporary table datos (clave text primary key, valor text);
grant select, insert, update on datos to authenticated;

-- "como('laura')": las peticiones siguientes van como esa persona.
create function pg_temp.como(p_quien text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object(
    'sub', (select id from gente where quien = p_quien),
    'role', 'authenticated',
    'is_anonymous', (select anonimo from gente where quien = p_quien)
  )::text, true);
end;
$$;
grant execute on function pg_temp.como(text) to authenticated;

set local role authenticated;

-- 1. Crear la empresa: la sesión anónima de la app no puede; el jefe, sí.
select pg_temp.como('anonimo');
select pg_temp.falla($$select public.empresa_crear('Bar anónimo', 'Nadie')$$, 'un anónimo no crea empresas', 'sin-cuenta');
select pg_temp.como('jefe');
insert into datos values ('bar', public.empresa_crear('Bar de prueba', 'Pepe')::text);
select pg_temp.comprobar(public.emp_admin(), 'quien crea la empresa es administrador');
select pg_temp.falla($$select public.empresa_crear('Otra más', 'Pepe')$$, 'una persona, una empresa', 'ya-en-empresa');

-- 2. Dominio: ni gratuito ni de otro; el suyo, sí.
select pg_temp.falla($$select public.empresa_ajustes(null, 'gmail.com', false)$$, 'dominio gratuito', 'dominio-publico');
select pg_temp.falla($$select public.empresa_ajustes(null, 'otra-prueba-organizy.es', false)$$, 'dominio ajeno', 'dominio-ajeno');
select public.empresa_ajustes(null, 'bar-prueba-organizy.es', false);
select pg_temp.comprobar((select dominio from public.empresas) = 'bar-prueba-organizy.es', 'dominio guardado');

-- 3. Invitar: lista de correos y enlace.
insert into public.invitaciones_correo (empresa_id, email)
values ((select valor::uuid from datos where clave = 'bar'), 'javi.prueba.organizy@gmail.com');
with x as (
  insert into public.invitaciones_enlace (empresa_id) values ((select valor::uuid from datos where clave = 'bar')) returning codigo
) insert into datos select 'codigo', codigo from x;
select pg_temp.falla(
  $$insert into public.invitaciones_enlace (empresa_id, caduca) values ((select valor::uuid from datos where clave = 'bar'), now() + interval '90 days')$$,
  'un enlace no dura más de un mes');

-- 4. Laura entra por el dominio: pendiente, y mientras tanto no ve nada.
select pg_temp.como('laura');
select pg_temp.comprobar(public.empresa_unirme(null, 'Laura') = 'pendiente', 'por dominio queda pendiente');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresas') = 1, 'la pendiente ve el nombre de la empresa');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresa_miembros') = 1, 'la pendiente solo se ve a sí misma');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.equipos') = 0, 'la pendiente no ve equipos');

-- 5. Javi está en la lista: entra directamente. Ana, por el enlace: pendiente.
select pg_temp.como('javi');
select pg_temp.comprobar(public.empresa_unirme(null, 'Javi') = 'activo', 'en la lista entra directamente');
select pg_temp.como('ana');
select pg_temp.falla($$select public.empresa_unirme('codigo-inventado', 'Ana')$$, 'enlace inventado', 'enlace-caducado');
select pg_temp.comprobar(public.empresa_unirme((select valor from datos where clave = 'codigo'), 'Ana') = 'pendiente', 'por enlace queda pendiente');
select pg_temp.como('intruso');
select pg_temp.falla($$select public.empresa_unirme(null, 'Intruso')$$, 'sin invitación no entra', 'sin-invitacion');

-- 6. Un empleado no aprueba ni ve a los pendientes; el jefe sí.
select pg_temp.como('javi');
select pg_temp.falla($$select public.empresa_aprobar((select id from gente where quien = 'laura'), true)$$, 'un empleado no aprueba', 'sin-permiso');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresa_miembros') = 2, 'un empleado no ve a los pendientes');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.invitaciones_enlace') = 0, 'un empleado no ve las invitaciones');
select pg_temp.como('jefe');
select pg_temp.comprobar(pg_temp.cuantos($$select * from public.empresa_miembros where estado = 'pendiente'$$) = 2, 'el jefe ve a los pendientes');
select public.empresa_aprobar((select id from gente where quien = 'laura'), true);
select public.empresa_aprobar((select id from gente where quien = 'ana'), false);
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresa_miembros') = 3, 'aprobada Laura, rechazada Ana');

-- 7. Equipos: los hace el jefe. Laura, responsable de Cocina; Javi, en Cocina.
with x as (
  insert into public.equipos (empresa_id, nombre) values ((select valor::uuid from datos where clave = 'bar'), 'Cocina') returning id
) insert into datos select 'cocina', id::text from x;
insert into public.equipo_miembros (equipo_id, empresa_id, usuario, responsable) values
  ((select valor::uuid from datos where clave = 'cocina'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'laura'), true),
  ((select valor::uuid from datos where clave = 'cocina'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'javi'), false);
select pg_temp.como('javi');
select pg_temp.falla($$insert into public.equipos (empresa_id, nombre) values ((select valor::uuid from datos where clave = 'bar'), 'Sala')$$, 'un empleado no crea equipos');

-- 8. Turnos: la responsable reparte en su equipo; el empleado no.
select pg_temp.falla($$insert into public.turnos (empresa_id, equipo_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'),
  (select id from gente where quien = 'javi'), current_date + 1, '09:00', '17:00')$$, 'un empleado no se pone turnos');
select pg_temp.como('laura');
with x as (
  insert into public.turnos (empresa_id, equipo_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'),
    (select id from gente where quien = 'javi'), current_date + 1, '19:00', '01:00') returning id
) insert into datos select 'turno_javi', id::text from x;
select pg_temp.falla($$insert into public.turnos (empresa_id, equipo_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'),
  (select id from gente where quien = 'jefe'), current_date + 1, '09:00', '17:00')$$, 'la responsable no pone turnos fuera de su equipo');
select pg_temp.falla($$insert into public.turnos (empresa_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'javi'), current_date + 1, '09:00', '17:00')$$,
  'la responsable no pone turnos sin equipo');
select pg_temp.como('jefe');
with x as (
  insert into public.turnos (empresa_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'jefe'), current_date + 2, '10:00', '14:00') returning id
) insert into datos select 'turno_jefe', id::text from x;
select pg_temp.como('javi');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.turnos') = 1, 'Javi ve su turno y no el del jefe (fuera de su equipo)');
select pg_temp.comprobar(pg_temp.filas($$update public.turnos set salida = '02:00'$$) = 0, 'Javi no se cambia el turno');

-- 9. Eventos: la responsable, solo de su equipo; el jefe, de toda la empresa. Responder.
select pg_temp.como('laura');
insert into public.eventos_empresa (empresa_id, equipo_id, titulo, fecha, inicio, fin)
values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'), 'Limpieza de cocina', current_date + 3, '16:00', '17:00');
select pg_temp.falla($$insert into public.eventos_empresa (empresa_id, titulo, fecha)
  values ((select valor::uuid from datos where clave = 'bar'), 'Festivo', current_date + 4)$$, 'la responsable no crea eventos de toda la empresa');
select pg_temp.como('jefe');
with x as (
  insert into public.eventos_empresa (empresa_id, titulo, fecha, inicio, fin, pide_respuesta)
  values ((select valor::uuid from datos where clave = 'bar'), 'Reunión general', current_date + 5, '10:00', '11:00', true) returning id
) insert into datos select 'reunion', id::text from x;
select pg_temp.como('javi');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.eventos_empresa') = 2, 'Javi ve el de toda la empresa y el de Cocina');
insert into public.respuestas_evento (evento_id, empresa_id, usuario, respuesta)
values ((select valor::uuid from datos where clave = 'reunion'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'javi'), 'voy');
select pg_temp.falla($$insert into public.respuestas_evento (evento_id, empresa_id, usuario, respuesta)
  values ((select valor::uuid from datos where clave = 'reunion'), (select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'laura'), 'no-voy')$$,
  'nadie responde por otro');

-- 10. Tareas: la responsable asigna; el empleado la marca, pero no la cambia.
select pg_temp.como('laura');
with x as (
  insert into public.tareas_empresa (empresa_id, equipo_id, usuario, titulo, fecha_limite, cuadrante)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'cocina'),
    (select id from gente where quien = 'javi'), 'Hacer inventario', current_date + 2, 'hazlo') returning id
) insert into datos select 'tarea', id::text from x;
select pg_temp.como('javi');
select public.empresa_marcar_tarea((select valor::uuid from datos where clave = 'tarea'), true);
select pg_temp.comprobar((select hecha from public.tareas_empresa) and (select hecha_por from public.tareas_empresa) = (select id from gente where quien = 'javi'), 'Javi marca su tarea');
select pg_temp.comprobar(pg_temp.filas($$update public.tareas_empresa set titulo = 'Otra cosa'$$) = 0, 'Javi no cambia su tarea');

-- 11. Cambio de turno: Javi lo pide para el suyo (no para el de otro); Laura lo aprueba.
with x as (
  insert into public.cambios_turno (empresa_id, turno_id, usuario, entrada, salida, motivo)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'turno_javi'),
    (select id from gente where quien = 'javi'), '18:00', '23:00', 'Tengo médico') returning id
) insert into datos select 'cambio', id::text from x;
select pg_temp.falla($$insert into public.cambios_turno (empresa_id, turno_id, usuario, motivo)
  values ((select valor::uuid from datos where clave = 'bar'), (select valor::uuid from datos where clave = 'turno_jefe'), (select id from gente where quien = 'javi'), 'Quiero ese')$$,
  'nadie pide cambiar el turno de otro');
select pg_temp.falla($$select public.empresa_resolver_cambio((select valor::uuid from datos where clave = 'cambio'), true)$$, 'Javi no se aprueba a sí mismo', 'sin-permiso');
select pg_temp.como('laura');
select public.empresa_resolver_cambio((select valor::uuid from datos where clave = 'cambio'), true);
select pg_temp.comprobar((select entrada || '-' || salida from public.turnos where id = (select valor::uuid from datos where clave = 'turno_javi')) = '18:00-23:00', 'el cambio aprobado cambia el turno');
select pg_temp.comprobar((select estado from public.cambios_turno) = 'aprobado', 'el cambio queda aprobado');

-- 12. "Ocupado": solo si Javi lo activa; lo ve su responsable, no otra empresa.
select pg_temp.como('javi');
select pg_temp.falla($$insert into public.ocupado_compartido (usuario, empresa_id, bloques)
  values ((select id from gente where quien = 'javi'), (select valor::uuid from datos where clave = 'bar'), '[{"d":"2026-10-05","i":540,"f":600}]')$$,
  'sin activarlo no se comparte', 'no-comparte');
select public.empresa_mis_datos('Javi', true);
insert into public.ocupado_compartido (usuario, empresa_id, bloques)
values ((select id from gente where quien = 'javi'), (select valor::uuid from datos where clave = 'bar'), '[{"d":"2026-10-05","i":540,"f":600}]');
select pg_temp.como('laura');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.ocupado_compartido') = 1, 'la responsable ve el Ocupado de Javi');

-- 13. Otra empresa no ve ni toca nada de esta.
select pg_temp.como('otrojefe');
select public.empresa_crear('Otra SL', 'Marta');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresas') = 1, 'otra empresa solo ve la suya');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresa_miembros') = 1, 'otra empresa no ve a la gente de esta');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.turnos') + pg_temp.cuantos('select * from public.eventos_empresa')
  + pg_temp.cuantos('select * from public.tareas_empresa') + pg_temp.cuantos('select * from public.ocupado_compartido') = 0,
  'otra empresa no ve turnos, eventos, tareas ni Ocupado de esta');
select pg_temp.falla($$insert into public.turnos (empresa_id, usuario, fecha, entrada, salida)
  values ((select valor::uuid from datos where clave = 'bar'), (select id from gente where quien = 'javi'), current_date, '09:00', '10:00')$$,
  'otra empresa no pone turnos aquí');
select pg_temp.comprobar(pg_temp.filas('delete from public.eventos_empresa') = 0, 'otra empresa no borra eventos de aquí');

-- 14. Papeles y salir: siempre queda un administrador; al salir se va todo lo suyo.
select pg_temp.como('jefe');
select pg_temp.falla($$select public.empresa_cambiar_rol((select id from gente where quien = 'jefe'), 'empleado')$$, 'siempre queda un administrador', 'sin-admin');
select pg_temp.falla($$select public.empresa_salir()$$, 'el único administrador no se va sin nombrar a otro', 'unico-admin');
select pg_temp.como('anonimo');
select pg_temp.falla($$select public.empresa_salir()$$, 'la sesión anónima no se borra', 'sin-cuenta');
select pg_temp.como('javi');
select public.empresa_salir();
select pg_temp.como('jefe');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.empresa_miembros') = 2, 'Javi ya no está');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.turnos') = 1, 'el turno de Javi se ha ido con él');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.tareas_empresa') = 0, 'su tarea también');
select pg_temp.comprobar(pg_temp.cuantos('select * from public.respuestas_evento') = 0, 'y su respuesta');

-- 15. Borrar la empresa: se va todo.
select public.empresa_borrar();
reset role;
select pg_temp.comprobar(not exists (select 1 from public.empresas where id = (select valor::uuid from datos where clave = 'bar')), 'la empresa se ha borrado');
select pg_temp.comprobar(not exists (select 1 from public.empresa_miembros where empresa_id = (select valor::uuid from datos where clave = 'bar')), 'y su gente');
select pg_temp.comprobar(not exists (select 1 from auth.users where id in (select id from gente where quien in ('jefe', 'javi'))), 'las cuentas de quien sale o borra se van');
select pg_temp.comprobar(exists (select 1 from auth.users where id = (select id from gente where quien = 'anonimo')), 'la sesión anónima sigue');

select 'todo bien' as resultado;

rollback;
