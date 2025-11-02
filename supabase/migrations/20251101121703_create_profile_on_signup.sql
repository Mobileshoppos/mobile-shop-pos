-- Creates or replaces the trigger function that inserts a new row into public.profiles
-- for each new user in auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

-- First, drop the trigger if it exists, to avoid errors.
drop trigger if exists on_auth_user_created on auth.users;

-- Then, create the trigger that calls the handle_new_user function
-- after a new user is inserted into auth.users.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();