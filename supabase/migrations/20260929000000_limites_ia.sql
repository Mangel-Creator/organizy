-- Organizy · Límites de IA por 5 horas y por semana, como los de Claude (29/09/2026).
--
-- Cada llamada a Claude apunta lo que ha costado (en millonésimas de dólar, según el
-- modelo y los tokens de entrada y salida). Cada persona tiene dos límites:
--   - uno por "ventana" de horas (5 por defecto): empieza con su primer uso y se
--     libera entera al acabar;
--   - otro por semana: empieza con su primer uso y se libera a los 7 días.
-- Al llegar a cualquiera de los dos, la IA se para (la captura abre la ficha, el
-- correo usa las reglas) salvo que tenga saldo extra comprado, que se gasta entonces.
--
-- No guarda frases ni correos: solo quién (id anónimo), qué función, cuándo y cuánto.
-- Los números de los límites los pone la Edge Function (secretos IA_*), no esta tabla.

create table if not exists public.ia_consumo (
  id bigint generated always as identity primary key,
  usuario uuid not null,
  momento timestamptz not null default now(),
  funcion text not null,
  entrada integer not null,
  salida integer not null,
  coste integer not null -- millonésimas de dólar
);

create index if not exists ia_consumo_usuario_momento on public.ia_consumo (usuario, momento);

create table if not exists public.ia_cuentas (
  usuario uuid primary key,
  ventana_inicio timestamptz,
  semana_inicio timestamptz,
  extra bigint not null default 0, -- saldo comprado que queda, en millonésimas de dólar
  actualizado timestamptz not null default now()
);

-- Recargas de saldo extra. "referencia" es el id del pago (Apple, Google o Stripe) y
-- es única: si el aviso del pago llega dos veces, no se suma dos veces.
create table if not exists public.ia_recargas (
  id bigint generated always as identity primary key,
  usuario uuid not null,
  cantidad bigint not null check (cantidad > 0),
  origen text not null,
  referencia text not null unique,
  creada timestamptz not null default now()
);

-- Nadie las lee ni las toca desde la app: solo las Edge Functions (clave secreta).
alter table public.ia_consumo enable row level security;
alter table public.ia_cuentas enable row level security;
alter table public.ia_recargas enable row level security;
revoke all on table public.ia_consumo from anon, authenticated;
revoke all on table public.ia_cuentas from anon, authenticated;
revoke all on table public.ia_recargas from anon, authenticated;

-- Estado de una persona: lo gastado en su ventana y en su semana, cuándo se liberan
-- y su saldo extra. Si una ventana ya ha acabado, cuenta 0 y no tiene fin (la
-- siguiente empieza con el próximo uso).
create or replace function public.ia_estado(p_usuario uuid, p_horas integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta public.ia_cuentas;
  v_ventana_fin timestamptz;
  v_semana_fin timestamptz;
  v_ventana bigint := 0;
  v_semana bigint := 0;
begin
  select * into v_cuenta from public.ia_cuentas where usuario = p_usuario;

  if v_cuenta.ventana_inicio is not null
     and v_cuenta.ventana_inicio + make_interval(hours => p_horas) > now() then
    v_ventana_fin := v_cuenta.ventana_inicio + make_interval(hours => p_horas);
    select coalesce(sum(coste), 0) into v_ventana
    from public.ia_consumo
    where usuario = p_usuario and momento >= v_cuenta.ventana_inicio;
  end if;

  if v_cuenta.semana_inicio is not null
     and v_cuenta.semana_inicio + interval '7 days' > now() then
    v_semana_fin := v_cuenta.semana_inicio + interval '7 days';
    select coalesce(sum(coste), 0) into v_semana
    from public.ia_consumo
    where usuario = p_usuario and momento >= v_cuenta.semana_inicio;
  end if;

  return jsonb_build_object(
    'ventana', v_ventana,
    'ventanaFin', v_ventana_fin,
    'semana', v_semana,
    'semanaFin', v_semana_fin,
    'extra', coalesce(v_cuenta.extra, 0)
  );
end;
$$;

-- ¿Puede usar la IA ahora? Si puede y su ventana o su semana no habían empezado,
-- empiezan ahora (así sabe a qué hora se liberan). Devuelve
--   { permitido: true, conExtra } o { permitido: false, motivo: 'ventana'|'semana', libre }.
create or replace function public.ia_permitir(
  p_usuario uuid,
  p_horas integer,
  p_limite_ventana bigint,
  p_limite_semana bigint
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_estado jsonb;
  v_ventana_llena boolean;
  v_semana_llena boolean;
begin
  perform pg_advisory_xact_lock(hashtext('ia:' || p_usuario::text));
  v_estado := public.ia_estado(p_usuario, p_horas);
  v_ventana_llena := (v_estado ->> 'ventana')::bigint >= p_limite_ventana;
  v_semana_llena := (v_estado ->> 'semana')::bigint >= p_limite_semana;

  if (v_ventana_llena or v_semana_llena) and (v_estado ->> 'extra')::bigint <= 0 then
    if v_semana_llena then
      return jsonb_build_object('permitido', false, 'motivo', 'semana', 'libre', v_estado -> 'semanaFin');
    end if;
    return jsonb_build_object('permitido', false, 'motivo', 'ventana', 'libre', v_estado -> 'ventanaFin');
  end if;

  insert into public.ia_cuentas as c (usuario, ventana_inicio, semana_inicio)
  values (p_usuario, now(), now())
  on conflict (usuario) do update set
    ventana_inicio = case
      when c.ventana_inicio is null or c.ventana_inicio + make_interval(hours => p_horas) <= now()
      then now() else c.ventana_inicio end,
    semana_inicio = case
      when c.semana_inicio is null or c.semana_inicio + interval '7 days' <= now()
      then now() else c.semana_inicio end,
    actualizado = now();

  return jsonb_build_object('permitido', true, 'conExtra', v_ventana_llena or v_semana_llena);
end;
$$;

-- Apunta lo que ha costado una llamada. Lo que pase de un límite se descuenta del
-- saldo extra (sin bajar de 0). Devuelve el saldo extra que queda.
create or replace function public.ia_apuntar(
  p_usuario uuid,
  p_funcion text,
  p_entrada integer,
  p_salida integer,
  p_coste integer,
  p_horas integer,
  p_limite_ventana bigint,
  p_limite_semana bigint
) returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_estado jsonb;
  v_exceso bigint;
  v_extra bigint;
begin
  perform pg_advisory_xact_lock(hashtext('ia:' || p_usuario::text));
  insert into public.ia_consumo (usuario, funcion, entrada, salida, coste)
  values (p_usuario, p_funcion, greatest(p_entrada, 0), greatest(p_salida, 0), greatest(p_coste, 0));

  v_estado := public.ia_estado(p_usuario, p_horas);
  v_exceso := greatest(
    (v_estado ->> 'ventana')::bigint - p_limite_ventana,
    (v_estado ->> 'semana')::bigint - p_limite_semana,
    0
  );
  v_exceso := least(v_exceso, greatest(p_coste, 0));

  update public.ia_cuentas
  set extra = greatest(extra - v_exceso, 0), actualizado = now()
  where usuario = p_usuario
  returning extra into v_extra;
  return coalesce(v_extra, 0);
end;
$$;

-- Suma saldo extra (lo usará el aviso de pago de Apple, Google o Stripe cuando se
-- pueda comprar). Si la referencia ya se usó, no suma nada y devuelve false.
create or replace function public.ia_recargar(
  p_usuario uuid,
  p_cantidad bigint,
  p_origen text,
  p_referencia text
) returns boolean
language plpgsql
set search_path = ''
as $$
begin
  insert into public.ia_recargas (usuario, cantidad, origen, referencia)
  values (p_usuario, p_cantidad, p_origen, p_referencia)
  on conflict (referencia) do nothing;
  if not found then
    return false;
  end if;

  insert into public.ia_cuentas as c (usuario, extra)
  values (p_usuario, p_cantidad)
  on conflict (usuario) do update set extra = c.extra + p_cantidad, actualizado = now();
  return true;
end;
$$;

-- Solo el servidor puede llamarlas.
revoke all on function public.ia_estado(uuid, integer) from public, anon, authenticated;
revoke all on function public.ia_permitir(uuid, integer, bigint, bigint) from public, anon, authenticated;
revoke all on function public.ia_apuntar(uuid, text, integer, integer, integer, integer, bigint, bigint) from public, anon, authenticated;
revoke all on function public.ia_recargar(uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.ia_estado(uuid, integer) to service_role;
grant execute on function public.ia_permitir(uuid, integer, bigint, bigint) to service_role;
grant execute on function public.ia_apuntar(uuid, text, integer, integer, integer, integer, bigint, bigint) to service_role;
grant execute on function public.ia_recargar(uuid, bigint, text, text) to service_role;

-- Lo gastado solo hace falta 7 días (la semana más larga): cada noche se borra lo de
-- hace más de 8.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'organizy-borrar-consumo-ia',
  '25 4 * * *',
  $$delete from public.ia_consumo where momento < now() - interval '8 days'$$
);
