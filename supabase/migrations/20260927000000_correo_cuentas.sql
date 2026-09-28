-- Organizy · Correos vinculados con "Vincular con Gmail" / "Vincular con Outlook" (fase 11).
--
-- Excepción aprobada por el usuario el 27/09/2026: para avisar en cuanto llega un correo,
-- el servidor guarda la llave de acceso (refresh token) de cada cuenta vinculada,
-- CIFRADA con una clave que solo tiene la función (secreto CORREO_CLAVE_CIFRADO), y 7
-- días de títulos y resúmenes para que la app los recoja. Nunca la contraseña. Al
-- quitar la cuenta (o el usuario), se borra todo.
--
-- Nadie toca estas tablas desde fuera: RLS activado y sin políticas, solo la función
-- "correo-cuentas" con la clave secreta del servidor.

create table public.correo_cuentas (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references auth.users (id) on delete cascade,
  proveedor text not null check (proveedor in ('gmail', 'outlook')),
  email text not null check (char_length(email) <= 320),
  llave text not null, -- refresh token cifrado (AES-GCM)
  tokens_push text[] not null default '{}',
  estado text not null default 'ok' check (estado in ('ok', 'caducada')),
  ultima_revision timestamptz,
  vistos text[] not null default '{}', -- ids de los últimos mensajes ya mirados
  creada timestamptz not null default now(),
  unique (usuario, proveedor, email)
);

-- Un "estado" por cada vez que alguien pulsa "Vincular con…": dice a quién pertenece
-- la vuelta del inicio de sesión. Caduca a los 15 minutos.
create table public.correo_estados (
  estado text primary key,
  usuario uuid not null references auth.users (id) on delete cascade,
  proveedor text not null check (proveedor in ('gmail', 'outlook')),
  vuelta text not null,
  token_push text,
  caduca timestamptz not null
);

create table public.correo_resumenes (
  cuenta uuid not null references public.correo_cuentas (id) on delete cascade,
  id text not null,
  recibido timestamptz not null,
  de text not null default '',
  asunto text not null default '',
  titulo text not null,
  resumen text not null default '',
  fecha_limite date,
  tarea text,
  via text not null default 'reglas' check (via in ('reglas', 'ia')),
  enlace text not null default '',
  primary key (cuenta, id)
);

alter table public.correo_cuentas enable row level security;
alter table public.correo_estados enable row level security;
alter table public.correo_resumenes enable row level security;

-- Como mucho 5 cuentas por persona.
create function public.limitar_cuentas_correo() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.correo_cuentas where usuario = new.usuario) >= 5 then
    raise exception 'Como mucho 5 cuentas de correo';
  end if;
  return new;
end $$;

create trigger limitar_cuentas_correo before insert on public.correo_cuentas
  for each row execute function public.limitar_cuentas_correo();

-- Limpieza cada noche: resúmenes de más de 7 días y estados caducados.
select cron.schedule(
  'correo-limpiar',
  '30 3 * * *',
  $$
    delete from public.correo_resumenes where recibido < now() - interval '7 days';
    delete from public.correo_estados where caduca < now();
  $$
);

-- Revisión cada 5 minutos: llama a la función con una contraseña compartida que está
-- en la bóveda (vault, "correo_cron") y en los secretos de la función
-- (CORREO_CRON_SECRETO). Ninguna de las dos está en git: se crean aparte.
create extension if not exists pg_net with schema extensions;

create function public.lanzar_revision_correo() returns void
language plpgsql security definer set search_path = '' as $$
declare
  secreto text;
begin
  select decrypted_secret into secreto from vault.decrypted_secrets where name = 'correo_cron';
  if secreto is null then
    return;
  end if;
  -- Sin cuentas no hace falta despertar a la función.
  if not exists (select 1 from public.correo_cuentas where estado = 'ok') then
    return;
  end if;
  perform net.http_post(
    url := 'https://hwemrpexabisyueyizjz.supabase.co/functions/v1/correo-cuentas',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-organizy-cron', secreto),
    body := jsonb_build_object('accion', 'revisar'),
    timeout_milliseconds := 60000
  );
end $$;

revoke all on function public.lanzar_revision_correo() from public, anon, authenticated;

select cron.schedule('correo-revisar', '*/5 * * * *', $$ select public.lanzar_revision_correo(); $$);
