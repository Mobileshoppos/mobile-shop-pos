-- 1. Purani kamzor policy ko khatam karein
DROP POLICY IF EXISTS "Allow authenticated users to read variants" ON "public"."product_variants";

-- 2. Nayi mahfooz policy lagayein jo sirf apna data dikhaye
CREATE POLICY "Users can only view their own product variants" 
ON "public"."product_variants" 
FOR SELECT 
USING (auth.uid() = user_id);