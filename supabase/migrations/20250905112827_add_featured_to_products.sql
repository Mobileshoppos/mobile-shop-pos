-- Add a new column to mark products as featured
ALTER TABLE public.products
ADD COLUMN is_featured BOOLEAN DEFAULT false NOT NULL;