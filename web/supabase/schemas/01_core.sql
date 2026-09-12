-- Cookbook core schema. Source of truth for the first Supabase migration.

create extension if not exists pgcrypto;

create type public.recipe_difficulty as enum ('easy', 'medium', 'hard');
create type public.recipe_origin as enum ('manual', 'url', 'text', 'tiktok', 'instagram', 'book', 'family', 'own', 'other');
create type public.import_status as enum ('pending', 'fetching', 'parsing', 'ai', 'preview', 'confirmed', 'failed', 'cancelled');
create type public.image_kind as enum ('cover', 'gallery');
create type public.conversion_confidence as enum ('exact', 'reference', 'suggested', 'ambiguous');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  servings numeric(10, 2) check (servings > 0),
  servings_label text default 'pessoas',
  active_time_minutes integer check (active_time_minutes >= 0),
  total_time_minutes integer check (total_time_minutes >= 0),
  difficulty public.recipe_difficulty,
  preparation_ahead text,
  storage_notes text,
  freezable boolean,
  freezing_notes text,
  reheating_notes text,
  origin_kind public.recipe_origin not null default 'manual',
  origin_label text,
  source_url text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id),
  check ((deleted_at is null and deleted_by is null) or (deleted_at is not null and deleted_by is not null))
);

create table public.ingredient_groups (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  group_id uuid references public.ingredient_groups (id) on delete set null,
  ingredient_name text not null check (char_length(ingredient_name) between 1 and 200),
  note text,
  optional boolean not null default false,
  scalable boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  quantity_original numeric(12, 4),
  quantity_max_original numeric(12, 4),
  unit_original text,
  display_text_original text,
  quantity_normalized numeric(12, 4),
  quantity_max_normalized numeric(12, 4),
  unit_normalized text,
  display_text_normalized text,
  package_quantity numeric(12, 4),
  package_unit text,
  conversion_confidence public.conversion_confidence,
  conversion_source text,
  conversion_rule_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_original is null or quantity_original >= 0),
  check (quantity_max_original is null or quantity_max_original >= quantity_original),
  check (quantity_normalized is null or quantity_normalized >= 0),
  check (quantity_max_normalized is null or quantity_max_normalized >= quantity_normalized),
  check (package_quantity is null or package_quantity >= 0)
);

create table public.recipe_sections (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  section_id uuid references public.recipe_sections (id) on delete set null,
  instruction text not null check (char_length(instruction) > 0),
  timer_seconds integer check (timer_seconds > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_step_ingredients (
  step_id uuid not null references public.recipe_steps (id) on delete cascade,
  ingredient_id uuid not null references public.recipe_ingredients (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (step_id, ingredient_id)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (char_length(slug) between 1 and 100),
  color text,
  created_at timestamptz not null default now(),
  unique (household_id, slug)
);

create table public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create table public.recipe_favorites (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table public.ratings (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  source_type public.recipe_origin not null,
  source_url text,
  source_title_original text,
  source_text_original text,
  source_language text,
  imported_by uuid not null references public.profiles (id),
  imported_at timestamptz not null default now()
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  input_type text not null check (input_type in ('url', 'text')),
  source_url text,
  input_text text,
  status public.import_status not null default 'pending',
  result_draft jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((input_type = 'url' and source_url is not null) or (input_type = 'text' and input_text is not null))
);

create table public.recipe_images (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null unique,
  image_kind public.image_kind not null default 'gallery',
  width integer check (width > 0),
  height integer check (height > 0),
  size_bytes bigint check (size_bytes > 0),
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now()
);

create index recipes_household_updated_idx on public.recipes (household_id, deleted_at, updated_at desc);
create index recipe_ingredients_order_idx on public.recipe_ingredients (recipe_id, sort_order);
create index recipe_steps_order_idx on public.recipe_steps (recipe_id, sort_order);
create index recipe_step_ingredients_ingredient_idx on public.recipe_step_ingredients (ingredient_id);
create index recipe_favorites_user_idx on public.recipe_favorites (user_id, created_at desc);
create index import_jobs_household_created_idx on public.import_jobs (household_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bump_recipe_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.household_id <> old.household_id or new.created_by <> old.created_by then
    raise exception 'Recipe ownership cannot be changed';
  end if;
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger households_updated_at before update on public.households for each row execute function public.set_updated_at();
create trigger recipes_version before update on public.recipes for each row execute function public.bump_recipe_version();
create trigger ingredients_updated_at before update on public.recipe_ingredients for each row execute function public.set_updated_at();
create trigger steps_updated_at before update on public.recipe_steps for each row execute function public.set_updated_at();
create trigger ratings_updated_at before update on public.ratings for each row execute function public.set_updated_at();
create trigger import_jobs_updated_at before update on public.import_jobs for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, 'Utilizador'), '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.can_access_recipe(target_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipes r
    join public.household_members hm on hm.household_id = r.household_id
    where r.id = target_recipe_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_household_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id = auth.uid() or exists (
    select 1
    from public.household_members mine
    join public.household_members theirs on theirs.household_id = mine.household_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user_id
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
revoke all on function public.can_access_recipe(uuid) from public;
revoke all on function public.shares_household_with(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_access_recipe(uuid) to authenticated;
grant execute on function public.shares_household_with(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredient_groups enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_sections enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_step_ingredients enable row level security;
alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;
alter table public.recipe_favorites enable row level security;
alter table public.ratings enable row level security;
alter table public.recipe_sources enable row level security;
alter table public.import_jobs enable row level security;
alter table public.recipe_images enable row level security;

create policy "profiles_select_household" on public.profiles for select to authenticated using (public.shares_household_with(id));
create policy "profiles_update_self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "households_select_member" on public.households for select to authenticated using (public.is_household_member(id));
create policy "households_update_member" on public.households for update to authenticated using (public.is_household_member(id)) with check (public.is_household_member(id));
create policy "members_select_household" on public.household_members for select to authenticated using (public.is_household_member(household_id));

create policy "recipes_select_member" on public.recipes for select to authenticated using (public.is_household_member(household_id));
create policy "recipes_insert_member" on public.recipes for insert to authenticated with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy "recipes_update_member" on public.recipes for update to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "recipes_delete_member" on public.recipes for delete to authenticated using (public.is_household_member(household_id));

create policy "ingredient_groups_member" on public.ingredient_groups for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "ingredients_member" on public.recipe_ingredients for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "sections_member" on public.recipe_sections for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "steps_member" on public.recipe_steps for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));
create policy "step_ingredients_member" on public.recipe_step_ingredients
for all to authenticated
using (
  exists (
    select 1
    from public.recipe_steps step
    join public.recipe_ingredients ingredient on ingredient.recipe_id = step.recipe_id
    where step.id = step_id
      and ingredient.id = ingredient_id
      and public.can_access_recipe(step.recipe_id)
  )
)
with check (
  exists (
    select 1
    from public.recipe_steps step
    join public.recipe_ingredients ingredient on ingredient.recipe_id = step.recipe_id
    where step.id = step_id
      and ingredient.id = ingredient_id
      and public.can_access_recipe(step.recipe_id)
  )
);
create policy "tags_member" on public.tags for all to authenticated using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "recipe_tags_member" on public.recipe_tags for all to authenticated using (public.can_access_recipe(recipe_id)) with check (public.can_access_recipe(recipe_id));

create policy "favorites_select_self" on public.recipe_favorites for select to authenticated using (user_id = auth.uid() and public.can_access_recipe(recipe_id));
create policy "favorites_insert_self" on public.recipe_favorites for insert to authenticated with check (user_id = auth.uid() and public.can_access_recipe(recipe_id));
create policy "favorites_delete_self" on public.recipe_favorites for delete to authenticated using (user_id = auth.uid() and public.can_access_recipe(recipe_id));

create policy "ratings_select_member" on public.ratings for select to authenticated using (public.can_access_recipe(recipe_id));
create policy "ratings_insert_self" on public.ratings for insert to authenticated with check (user_id = auth.uid() and public.can_access_recipe(recipe_id));
create policy "ratings_update_self" on public.ratings for update to authenticated using (user_id = auth.uid() and public.can_access_recipe(recipe_id)) with check (user_id = auth.uid() and public.can_access_recipe(recipe_id));
create policy "ratings_delete_self" on public.ratings for delete to authenticated using (user_id = auth.uid() and public.can_access_recipe(recipe_id));

create policy "sources_select_member" on public.recipe_sources for select to authenticated using (public.can_access_recipe(recipe_id));
create policy "sources_insert_self" on public.recipe_sources for insert to authenticated with check (imported_by = auth.uid() and public.can_access_recipe(recipe_id));
create policy "sources_update_self" on public.recipe_sources for update to authenticated using (imported_by = auth.uid() and public.can_access_recipe(recipe_id)) with check (imported_by = auth.uid() and public.can_access_recipe(recipe_id));
create policy "sources_delete_self" on public.recipe_sources for delete to authenticated using (imported_by = auth.uid() and public.can_access_recipe(recipe_id));

create policy "imports_select_member" on public.import_jobs for select to authenticated using (public.is_household_member(household_id));
create policy "imports_insert_self" on public.import_jobs for insert to authenticated with check (created_by = auth.uid() and public.is_household_member(household_id));
create policy "imports_update_self" on public.import_jobs for update to authenticated using (created_by = auth.uid() and public.is_household_member(household_id)) with check (created_by = auth.uid() and public.is_household_member(household_id));
create policy "imports_delete_self" on public.import_jobs for delete to authenticated using (created_by = auth.uid() and public.is_household_member(household_id));

create policy "images_select_member" on public.recipe_images for select to authenticated using (public.can_access_recipe(recipe_id));
create policy "images_insert_self" on public.recipe_images for insert to authenticated with check (uploaded_by = auth.uid() and public.can_access_recipe(recipe_id));
create policy "images_update_self" on public.recipe_images for update to authenticated using (uploaded_by = auth.uid() and public.can_access_recipe(recipe_id)) with check (uploaded_by = auth.uid() and public.can_access_recipe(recipe_id));
create policy "images_delete_household_member" on public.recipe_images for delete to authenticated using (public.can_access_recipe(recipe_id));

grant select, insert, update, delete on public.profiles to authenticated;
grant select, update on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.ingredient_groups to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.recipe_sections to authenticated;
grant select, insert, update, delete on public.recipe_steps to authenticated;
grant select, insert, update, delete on public.recipe_step_ingredients to authenticated;
grant select, insert, update, delete on public.tags to authenticated;
grant select, insert, update, delete on public.recipe_tags to authenticated;
grant select, insert, delete on public.recipe_favorites to authenticated;
grant select, insert, update, delete on public.ratings to authenticated;
grant select, insert, update, delete on public.recipe_sources to authenticated;
grant select, insert, update, delete on public.import_jobs to authenticated;
grant select, insert, update, delete on public.recipe_images to authenticated;

alter publication supabase_realtime add table public.recipes;
alter publication supabase_realtime add table public.ingredient_groups;
alter publication supabase_realtime add table public.recipe_ingredients;
alter publication supabase_realtime add table public.recipe_sections;
alter publication supabase_realtime add table public.recipe_steps;
alter publication supabase_realtime add table public.recipe_step_ingredients;
alter publication supabase_realtime add table public.recipe_tags;
alter publication supabase_realtime add table public.recipe_favorites;
alter publication supabase_realtime add table public.ratings;
alter publication supabase_realtime add table public.recipe_images;
