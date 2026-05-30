-- Ek khufiya function jo andar se tasveeron ke naam nikal kar Edge Function ko dega
CREATE OR REPLACE FUNCTION public.get_user_image_names(target_uid uuid)
RETURNS text[] AS $$
DECLARE
  file_names text[];
BEGIN
  -- Storage table se is user ki tasveeron ke naam jama karna
  SELECT array_agg(name) INTO file_names
  FROM storage.objects
  WHERE bucket_id = 'product-images' AND owner = target_uid;
  
  -- Agar koi tasveer na ho to khali list bhejna
  RETURN COALESCE(file_names, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;