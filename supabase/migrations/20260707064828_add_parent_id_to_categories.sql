-- Categories table mein parent_id ka column add kar rahe hain
ALTER TABLE public.categories 
ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;