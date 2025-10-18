-- supabase\migrations\20251018013231_add_rls_to_category_attributes.sql

-- Step 1: Enable Row Level Security on the table
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;

-- Step 2: Create a policy to allow all logged-in users to READ attributes.
-- This is needed for the filter dropdowns to work for everyone. This data is not sensitive.
CREATE POLICY "allow_read_for_all_authenticated_users"
ON public.category_attributes
FOR SELECT
USING (auth.role() = 'authenticated');


-- Step 3: Create a policy to allow users to INSERT attributes ONLY for categories they own.
CREATE POLICY "allow_insert_for_category_owner"
ON public.category_attributes
FOR INSERT
WITH CHECK (
  -- Check if a category exists with this 'category_id' AND its 'user_id' matches the current user.
  EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = category_attributes.category_id AND c.user_id = auth.uid()
  )
);


-- Step 4: Create a policy to allow users to UPDATE attributes ONLY for categories they own.
CREATE POLICY "allow_update_for_category_owner"
ON public.category_attributes
FOR UPDATE
USING (
  -- A user can only see/target rows for updating if they own the category.
  EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = category_attributes.category_id AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  -- After updating, the row must still satisfy the same condition.
  EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = category_attributes.category_id AND c.user_id = auth.uid()
  )
);


-- Step 5: Create a policy to allow users to DELETE attributes ONLY for categories they own.
CREATE POLICY "allow_delete_for_category_owner"
ON public.category_attributes
FOR DELETE
USING (
  -- A user can only delete rows if they own the parent category.
  EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = category_attributes.category_id AND c.user_id = auth.uid()
  )
);