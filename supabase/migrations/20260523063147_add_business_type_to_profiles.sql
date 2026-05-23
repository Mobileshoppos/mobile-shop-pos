-- Profiles table mein business_type ka column add karna
ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "business_type" TEXT DEFAULT 'Mobile Shop';