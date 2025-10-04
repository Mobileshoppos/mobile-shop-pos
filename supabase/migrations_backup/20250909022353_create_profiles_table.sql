-- Step 1: Create the 'profiles' table
-- This table will store user-specific information that is not in auth.users.
create table public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_name text,
  phone_number text,
  address text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  -- Ensure that each user can only have one profile
  constraint profiles_user_id_key unique (user_id)
);

-- Add comments to explain what each column is for
comment on table public.profiles is 'Stores public profile information for each user.';
comment on column public.profiles.id is 'Primary key for the profile.';
comment on column public.profiles.user_id is 'Foreign key reference to the auth.users table.';

-- Step 2: Enable Row Level Security (RLS)
-- This is a crucial security step. It ensures no one can access data unless a policy allows them to.
alter table public.profiles enable row level security;

-- Step 3: Create RLS policies
-- These policies define who can do what with the data in the 'profiles' table.

-- Policy 1: Allow users to view their own profile
create policy "Users can view their own profile."
on public.profiles for select
using (auth.uid() = user_id);

-- Policy 2: Allow users to update their own profile
create policy "Users can update their own profile."
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Step 4: Create a function to automatically create a profile on new user sign-up
-- This function will be triggered every time a new user is created in the 'auth.users' table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert a new row into public.profiles, setting the user_id to the new user's id
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

-- Step 5: Create a trigger to call the function
-- This trigger will execute the 'handle_new_user' function after a new user is inserted.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Step 6 (Optional but Recommended): Function and Trigger to auto-update 'updated_at' column
-- This function automatically sets the 'updated_at' timestamp whenever a row is changed.
create or replace function public.moddatetime()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to call the 'moddatetime' function before any update on the 'profiles' table.
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.moddatetime();