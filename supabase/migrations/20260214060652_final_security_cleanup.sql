-- ==========================================
-- 1. PURCHASE_ITEMS TABLE (FIXING LEAK)
-- ==========================================
-- Purani kamzor policy khatam karein
DROP POLICY IF EXISTS "Allow authenticated users to manage purchase_items" ON "public"."purchase_items";

-- Nayi mahfooz policy: Sirf apni purchase ke items dekh/manage sakein
-- Hum isay 'purchases' table se jorr rahe hain kyunke purchase_items mein user_id nahi hai
CREATE POLICY "Users can manage their own purchase items"
ON "public"."purchase_items"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.purchases p
    WHERE p.id = purchase_items.purchase_id
    AND p.user_id = auth.uid()
  )
);

-- ==========================================
-- 2. DEVICE_REGISTRY TABLE (FIXING LEAK)
-- ==========================================
DROP POLICY IF EXISTS "Enable select for authenticated users only" ON "public"."device_registry";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."device_registry";

CREATE POLICY "Users can only manage their own device registry"
ON "public"."device_registry"
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. INVENTORY TABLE (CLEANUP)
-- ==========================================
-- Inventory par boht zyada policies thin, hum unhein aik mazboot policy mein badalte hain
DROP POLICY IF EXISTS "Allow users to view their own inventory" ON "public"."inventory";
DROP POLICY IF EXISTS "Allow users to update their own inventory" ON "public"."inventory";
DROP POLICY IF EXISTS "Allow users to delete their own inventory" ON "public"."inventory";
DROP POLICY IF EXISTS "Allow insert by owner" ON "public"."inventory";
DROP POLICY IF EXISTS "Users can manage inventory for their own products." ON "public"."inventory";
DROP POLICY IF EXISTS "Users can manage their own inventory" ON "public"."inventory";

-- Aik hi "Master Policy" jo sab kuch sambhaal le
CREATE POLICY "Master inventory policy"
ON "public"."inventory"
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. SYSTEM_LOGS (SECURITY)
-- ==========================================
-- Normal users sirf apne logs dekh sakein (Admin wali policy pehle se mojood hai)
DROP POLICY IF EXISTS "Users can view their own logs" ON "public"."system_logs";
CREATE POLICY "Users can manage their own logs"
ON "public"."system_logs"
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);