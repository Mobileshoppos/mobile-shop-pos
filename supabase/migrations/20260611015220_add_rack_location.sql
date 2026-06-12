-- Products table mein location save karne ke liye naya column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rack_location text;