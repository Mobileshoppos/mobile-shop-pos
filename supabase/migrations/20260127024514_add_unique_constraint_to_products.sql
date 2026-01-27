-- Aik unique index banayen jo User, Category, Brand aur Name ke combination ko check kare
-- LOWER() ka istemal kiya gaya hai taake Case-Insensitivity (A vs a) ka masla na ho
CREATE UNIQUE INDEX unique_product_model_per_user 
ON public.products (user_id, category_id, LOWER(brand), LOWER(name));