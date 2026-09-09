-- Executar apenas depois de:
-- 1. aplicar schemas/01_core.sql;
-- 2. criar manualmente os utilizadores Ivo e Ana em Authentication > Users.
--
-- Substituir os dois emails abaixo pelos emails usados na criação das contas.
-- O script pode ser executado novamente sem duplicar o household ou os membros.

do $$
declare
  ivo_email constant text := 'ivo@cookbook.com';
  ana_email constant text := 'ana@cookbook.com';
  ivo_id uuid;
  ana_id uuid;
  cookbook_household_id uuid;
begin
  select id
  into ivo_id
  from auth.users
  where lower(email) = lower(ivo_email);

  if ivo_id is null then
    raise exception 'Não foi encontrado o utilizador Ivo com o email %', ivo_email;
  end if;

  select id
  into ana_id
  from auth.users
  where lower(email) = lower(ana_email);

  if ana_id is null then
    raise exception 'Não foi encontrado o utilizador Ana com o email %', ana_email;
  end if;

  insert into public.profiles (id, display_name)
  values (ivo_id, 'Ivo')
  on conflict (id) do update
  set display_name = excluded.display_name;

  insert into public.profiles (id, display_name)
  values (ana_id, 'Ana')
  on conflict (id) do update
  set display_name = excluded.display_name;

  select id
  into cookbook_household_id
  from public.households
  where name = 'Ivo e Ana'
  order by created_at
  limit 1;

  if cookbook_household_id is null then
    insert into public.households (name)
    values ('Ivo e Ana')
    returning id into cookbook_household_id;
  end if;

  insert into public.household_members (household_id, user_id)
  values
    (cookbook_household_id, ivo_id),
    (cookbook_household_id, ana_id)
  on conflict (household_id, user_id) do nothing;
end;
$$;

select
  h.name as household,
  p.display_name as membro
from public.household_members hm
join public.households h on h.id = hm.household_id
join public.profiles p on p.id = hm.user_id
where h.name = 'Ivo e Ana'
order by p.display_name;
