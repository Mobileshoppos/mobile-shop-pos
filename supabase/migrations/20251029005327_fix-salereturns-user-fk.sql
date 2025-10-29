-- Step 1: Purani aur ghalat Foreign Key ko is table se hatayein.
-- Yeh 'sale_returns' table ka 'public.profiles' se connection torr dega.

alter table public.sale_returns
  drop constraint sale_returns_user_id_fkey;


-- Step 2: Nayi aur sahi Foreign Key banayein.
-- Yeh 'sale_returns' table ke 'user_id' column ko asal 'auth.users' table se jor dega.

alter table public.sale_returns
  add constraint sale_returns_user_id_fkey
  foreign key (user_id)
  references auth.users (id);