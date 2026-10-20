-- 1. Product Variants aur Inventory tables mein distributor_price ka column shamil karna
ALTER TABLE "public"."product_variants" 
ADD COLUMN IF NOT EXISTS "distributor_price" numeric;

ALTER TABLE "public"."inventory" 
ADD COLUMN IF NOT EXISTS "distributor_price" numeric;

-- 2. Customer Groups ka Master Table banana
CREATE TABLE IF NOT EXISTS "public"."customer_groups" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "local_id" "uuid" DEFAULT gen_random_uuid(),
    "user_id" "uuid" DEFAULT auth.uid() NOT NULL,
    "name" "text" NOT NULL,
    "pricing_tier" "text" DEFAULT 'retail'::"text" NOT NULL,
    "default_discount_percentage" numeric DEFAULT 0,
    "default_credit_limit" numeric,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_groups_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "customer_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "customer_groups_pricing_tier_check" CHECK (("pricing_tier" = ANY (ARRAY['retail'::"text", 'wholesale'::"text", 'distributor'::"text"])))
);

-- 3. Row Level Security (RLS) aur Trigger lagana
ALTER TABLE "public"."customer_groups" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own customer groups" ON "public"."customer_groups"
    FOR ALL TO "authenticated"
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER "set_updated_at" 
BEFORE UPDATE ON "public"."customer_groups" 
FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 4. Permissions (Grants) faraham karna
GRANT ALL ON TABLE "public"."customer_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_groups" TO "service_role";

-- 5. Customers table mein customer_group_id foreign key ka column add karna
ALTER TABLE "public"."customers" 
ADD COLUMN IF NOT EXISTS "customer_group_id" "uuid" REFERENCES "public"."customer_groups"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_customers_customer_group_id" ON "public"."customers" USING btree ("customer_group_id");

-- 6. Mojooda users ke liye 3 Default Groups khud ba khud banana
INSERT INTO "public"."customer_groups" ("user_id", "name", "pricing_tier", "is_default", "default_credit_limit")
SELECT "user_id", 'Retail / Walk-in', 'retail', true, 0
FROM "public"."profiles"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."customer_groups" ("user_id", "name", "pricing_tier", "is_default", "default_credit_limit")
SELECT "user_id", 'Wholesale', 'wholesale', false, 100000
FROM "public"."profiles"
ON CONFLICT DO NOTHING;

INSERT INTO "public"."customer_groups" ("user_id", "name", "pricing_tier", "is_default", "default_credit_limit")
SELECT "user_id", 'Distributor', 'distributor', false, 500000
FROM "public"."profiles"
ON CONFLICT DO NOTHING;

-- 7. Purane customers jin ka group 'wholesale' tha, unhein naye wholesale group se link karna
UPDATE "public"."customers" c
SET "customer_group_id" = cg.id
FROM "public"."customer_groups" cg
WHERE c.user_id = cg.user_id 
  AND cg.pricing_tier = 'wholesale'
  AND c.customer_group ILIKE '%wholesale%'
  AND c.customer_group_id IS NULL;