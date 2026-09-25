-- Organizy · fase 5: cuántas veces usa cada persona cada función al día.
-- Sirve para poner un límite de usos (y así un tope al gasto de la IA).
-- No guarda frases ni eventos: solo quién (id anónimo), qué función, qué día y cuántas veces.

create table if not exists public.usos_diarios (
  usuario uuid not null,
  funcion text not null,
  dia date not null,
  usos integer not null default 0,
  primary key (usuario, funcion, dia)
);

create index if not exists usos_diarios_funcion_dia on public.usos_diarios (funcion, dia);

-- Nadie puede leer ni tocar la tabla desde la app: solo las Edge Functions,
-- que usan la clave secreta del servidor.
alter table public.usos_diarios enable row level security;
revoke all on table public.usos_diarios from anon, authenticated;

-- Suma un uso si no se ha pasado el límite. Devuelve:
--   el número de usos de hoy de esa persona (1, 2, 3...),
--   -1 si esa persona ya ha llegado a su límite de hoy,
--   -2 si entre todos se ha llegado al límite global de hoy.
-- El día cambia a medianoche de Madrid.
create or replace function public.sumar_uso(
  p_usuario uuid,
  p_funcion text,
  p_limite_usuario integer,
  p_limite_global integer
) returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_dia date := (now() at time zone 'Europe/Madrid')::date;
  v_global integer;
  v_usos integer;
begin
  -- De uno en uno por función, para que dos peticiones a la vez no se salten el límite.
  perform pg_advisory_xact_lock(hashtext(p_funcion));

  select coalesce(sum(usos), 0) into v_global
  from public.usos_diarios
  where funcion = p_funcion and dia = v_dia;
  if v_global >= p_limite_global then
    return -2;
  end if;

  insert into public.usos_diarios as u (usuario, funcion, dia, usos)
  values (p_usuario, p_funcion, v_dia, 1)
  on conflict (usuario, funcion, dia)
    do update set usos = u.usos + 1
    where u.usos < p_limite_usuario
  returning usos into v_usos;

  if v_usos is null then
    return -1;
  end if;
  return v_usos;
end;
$$;

-- Solo el servidor puede llamarla (si no, cualquiera podría sumar usos a otros).
revoke all on function public.sumar_uso(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.sumar_uso(uuid, text, integer, integer) to service_role;
