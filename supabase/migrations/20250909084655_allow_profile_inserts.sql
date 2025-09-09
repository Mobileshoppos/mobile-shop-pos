-- Allow users to insert their own profile.
-- This policy is crucial for new users or existing users without a profile.
-- The 'with check' clause ensures that a user can only insert a row
-- where the user_id in the new row matches their own authenticated user ID.
create policy "Users can insert their own profile."
on public.profiles for insert
with check (auth.uid() = user_id);