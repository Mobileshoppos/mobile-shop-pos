-- Add a new column 'full_name' to the 'profiles' table to store the user's personal name.
alter table public.profiles
add column full_name text;

-- Add a comment to the new column for clarity.
comment on column public.profiles.full_name is 'Stores the full name of the user.';