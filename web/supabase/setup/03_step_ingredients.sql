-- Run once in the Supabase SQL Editor for an existing Cookbook project.
-- Safe to run again: the table, index, policy and Realtime entry are idempotent.

create table if not exists public.recipe_step_ingredients (
  step_id uuid not null references public.recipe_steps (id) on delete cascade,
  ingredient_id uuid not null references public.recipe_ingredients (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (step_id, ingredient_id)
);

create index if not exists recipe_step_ingredients_ingredient_idx
  on public.recipe_step_ingredients (ingredient_id);

alter table public.recipe_step_ingredients enable row level security;

drop policy if exists "step_ingredients_member" on public.recipe_step_ingredients;
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

grant select, insert, update, delete on public.recipe_step_ingredients to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.recipe_step_ingredients;
exception
  when duplicate_object then null;
end
$$;
