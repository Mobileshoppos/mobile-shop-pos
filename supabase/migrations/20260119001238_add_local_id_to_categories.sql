-- 1. categories table mein local_id column add karein
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS local_id UUID;

-- 2. local_id par unique constraint lagayein taake duplicates na hon
ALTER TABLE public.categories ADD CONSTRAINT categories_local_id_key UNIQUE (local_id);