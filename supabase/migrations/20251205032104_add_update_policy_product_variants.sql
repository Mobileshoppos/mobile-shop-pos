-- Product Variants table par UPDATE ki ijazat (Policy) add karna
CREATE POLICY "Users can update their own product variants"
ON "public"."product_variants"
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);