-- 1. Pehle purani kamzor policy ko khatam karte hain
DROP POLICY IF EXISTS "allow_read_for_all_authenticated_users" ON "public"."category_attributes";

-- 2. Nayi mahfooz policy lagate hain
-- Yeh policy kahegi: "Sirf wo attributes dikhao jin ki Category is user ki apni hai"
CREATE POLICY "Users can only view attributes of their own categories" 
ON "public"."category_attributes" 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.categories 
        WHERE categories.id = category_attributes.category_id 
        AND categories.user_id = auth.uid()
    )
);