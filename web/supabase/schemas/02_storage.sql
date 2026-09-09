-- Private recipe image bucket and access policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_household_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

revoke all on function public.storage_household_id(text) from public;
grant execute on function public.storage_household_id(text) to authenticated;

create policy "recipe_images_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'recipe-images'
  and public.is_household_member(public.storage_household_id(name))
);

create policy "recipe_images_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'recipe-images'
  and owner_id = auth.uid()::text
  and public.is_household_member(public.storage_household_id(name))
);

create policy "recipe_images_storage_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'recipe-images'
  and owner_id = auth.uid()::text
  and public.is_household_member(public.storage_household_id(name))
)
with check (
  bucket_id = 'recipe-images'
  and owner_id = auth.uid()::text
  and public.is_household_member(public.storage_household_id(name))
);

create policy "recipe_images_storage_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'recipe-images'
  and owner_id = auth.uid()::text
  and public.is_household_member(public.storage_household_id(name))
);
