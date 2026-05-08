-- FBR Integration ke liye naye columns
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS hs_code text,
ADD COLUMN IF NOT EXISTS uom text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS province text;