-- Organizy · fase 8: planes con votación de hora.
--
-- Qué se guarda aquí (y solo mientras hace falta para votar):
--   - planes: qué es ("Cena de viernes"), el nombre del organizador tal como sale en
--     la invitación, cuántas personas invita (solo el número, no sus nombres) y, si la
--     app lo tiene, la dirección de avisos de su móvil para decirle que alguien ha votado.
--   - horas: las 2 a 4 horas propuestas.
--   - invitados: el nombre que escribe cada persona al votar.
--   - votos: qué horas le vienen bien a cada invitado.
-- Todo se borra solo 7 días después de la última hora propuesta (o de la elegida).
--
-- Seguridad (Row Level Security):
--   - Cada plan solo lo ve, cambia y borra quien lo creó (su usuario anónimo de la app).
--   - Los invitados no tocan las tablas: votan con el código del enlace a través de la
--     función "votar" (supabase/functions/votar), que comprueba el código.
--
-- Se aplica pegando este archivo en el SQL Editor del panel de Supabase.

create table if not exists public.planes (
  id uuid primary key default gen_random_uuid(),
  -- Código del enlace: 32 letras y números al azar (imposible de adivinar).
  codigo text not null unique default replace(gen_random_uuid()::text, '-', ''),
  creador uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 80),
  tipo text not null check (tipo in ('amigos', 'cliente')),
  organizador text not null default '' check (char_length(organizador) <= 40),
  personas integer not null default 0 check (personas between 0 and 50),
  duracion_min integer not null default 120 check (duracion_min between 15 and 720),
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado')),
  hora_elegida uuid,
  aviso_token text check (aviso_token is null or char_length(aviso_token) <= 200),
  borrar_el timestamptz not null default now() + interval '30 days',
  creado_el timestamptz not null default now()
);

create index if not exists planes_creador on public.planes (creador);
create index if not exists planes_borrar_el on public.planes (borrar_el);

create table if not exists public.horas (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes (id) on delete cascade,
  dia date not null,
  hora text not null check (hora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  unique (plan_id, dia, hora)
);

create table if not exists public.invitados (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.planes (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  -- El nombre en minúsculas y sin tildes: si alguien vuelve a votar con el mismo
  -- nombre, se cambia su voto en vez de contarlo dos veces.
  clave text not null,
  votado_el timestamptz not null default now(),
  unique (plan_id, clave)
);

create table if not exists public.votos (
  invitado_id uuid not null references public.invitados (id) on delete cascade,
  hora_id uuid not null references public.horas (id) on delete cascade,
  primary key (invitado_id, hora_id)
);

create index if not exists votos_hora on public.votos (hora_id);

-- Límites para que nadie llene la base de datos: como mucho 30 planes al día por
-- persona, 4 horas por plan, y el plan se borra como tarde a los 90 días.
create or replace function public.comprobar_plan() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.planes
        where creador = new.creador and creado_el > now() - interval '1 day') >= 30 then
      raise exception 'demasiados planes hoy';
    end if;
  end if;
  if new.borrar_el > now() + interval '90 days' then
    new.borrar_el := now() + interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists comprobar_plan on public.planes;
create trigger comprobar_plan before insert or update on public.planes
  for each row execute function public.comprobar_plan();

create or replace function public.comprobar_hora() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.horas where plan_id = new.plan_id) >= 4 then
    raise exception 'como mucho 4 horas por plan';
  end if;
  return new;
end;
$$;

drop trigger if exists comprobar_hora on public.horas;
create trigger comprobar_hora before insert on public.horas
  for each row execute function public.comprobar_hora();

-- Row Level Security: solo el creador de cada plan.
alter table public.planes enable row level security;
alter table public.horas enable row level security;
alter table public.invitados enable row level security;
alter table public.votos enable row level security;

revoke all on table public.planes, public.horas, public.invitados, public.votos from anon, authenticated;
grant select, insert, update, delete on table public.planes, public.horas to authenticated;
-- Los votos solo los escribe la función "votar"; el organizador los lee (y se borran con el plan).
grant select on table public.invitados, public.votos to authenticated;

drop policy if exists "planes del creador" on public.planes;
create policy "planes del creador" on public.planes
  for all to authenticated
  using (creador = (select auth.uid()))
  with check (creador = (select auth.uid()));

drop policy if exists "horas del creador" on public.horas;
create policy "horas del creador" on public.horas
  for all to authenticated
  using (exists (select 1 from public.planes p where p.id = plan_id and p.creador = (select auth.uid())))
  with check (exists (select 1 from public.planes p where p.id = plan_id and p.creador = (select auth.uid())));

drop policy if exists "invitados del creador" on public.invitados;
create policy "invitados del creador" on public.invitados
  for select to authenticated
  using (exists (select 1 from public.planes p where p.id = plan_id and p.creador = (select auth.uid())));

drop policy if exists "votos del creador" on public.votos;
create policy "votos del creador" on public.votos
  for select to authenticated
  using (exists (
    select 1 from public.invitados i join public.planes p on p.id = i.plan_id
    where i.id = invitado_id and p.creador = (select auth.uid())
  ));

-- Borrado automático cada noche (4:15, hora del servidor) de los planes caducados.
-- Con ellos se van sus horas, invitados y votos.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'organizy-borrar-planes',
  '15 4 * * *',
  $$delete from public.planes where borrar_el < now()$$
);
