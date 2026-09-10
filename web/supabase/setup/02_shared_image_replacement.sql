-- Run once in the Supabase SQL Editor for an existing Cookbook project.
-- Both members share the cookbook, so either member may replace a recipe photo.

begin;

drop policy if exists "images_delete_self" on public.recipe_images;
drop policy if exists "images_delete_household_member" on public.recipe_images;

create policy "images_delete_household_member"
on public.recipe_images for delete to authenticated
using (public.can_access_recipe(recipe_id));

drop policy if exists "recipe_images_storage_delete" on storage.objects;

create policy "recipe_images_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recipe-images'
  and public.is_household_member(public.storage_household_id(name))
);

commit;
