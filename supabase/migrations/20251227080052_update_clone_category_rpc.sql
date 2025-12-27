CREATE OR REPLACE FUNCTION public.clone_category_for_user(
    p_local_id uuid, -- Naya Parameter
    source_category_id bigint
)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  new_category_id bigint;
begin
  -- Duplicate Check
  IF EXISTS (SELECT 1 FROM public.categories WHERE local_id = p_local_id) THEN
      SELECT id INTO new_category_id FROM public.categories WHERE local_id = p_local_id;
      RETURN new_category_id;
  END IF;

  insert into public.categories (local_id, name, is_imei_based, user_id)
  select
    p_local_id,
    src.name,
    src.is_imei_based,
    auth.uid()
  from public.categories as src
  where src.id = source_category_id
  returning id into new_category_id;

  insert into public.category_attributes (category_id, attribute_name, attribute_type, options, is_required)
  select
    new_category_id,
    src_attr.attribute_name,
    src_attr.attribute_type,
    src_attr.options,
    src_attr.is_required
  from public.category_attributes as src_attr
  where src_attr.category_id = source_category_id;

  return new_category_id;
end;
$function$;