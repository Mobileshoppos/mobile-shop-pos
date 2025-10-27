-- This function creates a user-specific copy of a default category and its attributes.
-- It's designed to be "atomic": either everything succeeds, or nothing is saved.

create or replace function public.clone_category_for_user (
  source_category_id bigint
)
returns bigint -- It will return the ID of the new category created
language plpgsql
security definer -- Important: Runs with the permissions of the function owner
as $$
declare
  new_category_id bigint;
begin
  -- Step 1: Create a new category for the current user, copying details from the source category.
  -- The user_id is automatically set to the currently logged-in user's ID.
  insert into public.categories (name, is_imei_based, user_id)
  select
    src.name,
    src.is_imei_based,
    auth.uid() -- This is the key part that assigns ownership
  from public.categories as src
  where src.id = source_category_id
  returning id into new_category_id; -- Get the ID of the new category we just created.

  -- Step 2: Copy all attributes from the source category and link them to the new category.
  insert into public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
  select
    new_category_id, -- Link to the newly created category
    src_attr.attribute_name,
    src_attr.attribute_type,
    src_attr.options,
    src_attr.is_required
  from public.category_attributes as src_attr
  where src_attr.category_id = source_category_id;

  -- Step 3: Return the ID of the new, user-owned category.
  return new_category_id;
end;
$$;