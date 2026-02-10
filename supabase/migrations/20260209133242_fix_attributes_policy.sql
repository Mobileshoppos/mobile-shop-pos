-- Category Attributes ko Update karne ki ijazat
CREATE POLICY "Users can update their own category attributes" ON "public"."category_attributes"
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.categories
        WHERE categories.id = category_attributes.category_id
        AND categories.user_id = auth.uid()
    )
);

-- Category Attributes ko Delete karne ki ijazat
CREATE POLICY "Users can delete their own category attributes" ON "public"."category_attributes"
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.categories
        WHERE categories.id = category_attributes.category_id
        AND categories.user_id = auth.uid()
    )
);