-- Sale Returns ke local_id par unique constraint lagana taake sync error khatam ho jaye
ALTER TABLE public.sale_returns 
ADD CONSTRAINT sale_returns_local_id_unique UNIQUE (local_id);