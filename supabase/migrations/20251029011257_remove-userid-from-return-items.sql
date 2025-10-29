-- Step 1: Pehle is column se jura hua ghalat Foreign Key constraint hatayein.
alter table public.sale_return_items
  drop constraint sale_return_items_user_id_fkey;

-- Step 2: Ab is be-faida (redundant) user_id column ko table se mukammal tor par delete kar dein.
alter table public.sale_return_items
  drop column user_id;