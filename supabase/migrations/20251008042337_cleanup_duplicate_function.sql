-- This command drops the old version of the function that accepts 'integer' as the first parameter.
DROP FUNCTION IF EXISTS public.create_new_purchase(integer, text, jsonb);