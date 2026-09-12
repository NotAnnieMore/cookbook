-- Cookbook security hardening for an existing Supabase project.
-- Safe to run more than once after schemas/01_core.sql and schemas/02_storage.sql.

begin;

-- The application is private: anonymous visitors must not read or mutate data.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Helper functions used by RLS are available only to authenticated members.
revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.can_access_recipe(uuid) from public, anon;
revoke all on function public.shares_household_with(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.can_access_recipe(uuid) to authenticated;
grant execute on function public.shares_household_with(uuid) to authenticated;

-- Reassert RLS in case a table was changed manually in the dashboard.
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

-- The image bucket must never become public through a dashboard change.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'recipe-images';

commit;

-- Read-only verification report. Every listed table should show rowsecurity=true
-- and the recipe-images bucket should show public=false.
select relname as table_name, relrowsecurity as rowsecurity
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
  and relname in (
    'profiles', 'households', 'household_members', 'recipes',
    'ingredient_groups', 'recipe_ingredients', 'recipe_sections',
    'recipe_steps', 'recipe_step_ingredients', 'tags', 'recipe_tags',
    'recipe_favorites', 'ratings', 'recipe_sources', 'import_jobs',
    'recipe_images'
  )
order by relname;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'recipe-images';
