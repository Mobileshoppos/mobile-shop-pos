-- 1. Pehle un Views ko hatate hain jo Products par depend karte hain
DROP VIEW IF EXISTS "public"."products_display_view" CASCADE;
DROP VIEW IF EXISTS "public"."products_with_quantity" CASCADE;
DROP VIEW IF EXISTS "public"."sales_history_view" CASCADE;

-- 2. Un Policies ko hatate hain jo product_id ya variant_id istemal karti hain
DROP POLICY IF EXISTS "Users can manage inventory for their own products." ON "public"."inventory";
DROP POLICY IF EXISTS "Users can update their own product variants" ON "public"."product_variants";
DROP POLICY IF EXISTS "Allow authenticated users to read variants" ON "public"."product_variants";
DROP POLICY IF EXISTS "Allow users to insert their own product variants" ON "public"."product_variants";

-- 3. Purane Talluqaat (Constraints) khatam karte hain
ALTER TABLE IF EXISTS "public"."product_variants" DROP CONSTRAINT IF EXISTS "product_variants_product_id_fkey";
ALTER TABLE IF EXISTS "public"."inventory" DROP CONSTRAINT IF EXISTS "inventory_product_id_fkey";
ALTER TABLE IF EXISTS "public"."inventory" DROP CONSTRAINT IF EXISTS "inventory_variant_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_product_id_fkey";
ALTER TABLE IF EXISTS "public"."purchase_items" DROP CONSTRAINT IF EXISTS "purchase_items_product_id_fkey";
ALTER TABLE IF EXISTS "public"."sale_return_items" DROP CONSTRAINT IF EXISTS "sale_return_items_product_id_fkey";
ALTER TABLE IF EXISTS "public"."purchase_return_items" DROP CONSTRAINT IF EXISTS "purchase_return_items_product_id_fkey";

-- 4. 'NOT NULL' pabandi aarzi tor par hatate hain taake type badli ja sakay
ALTER TABLE "public"."inventory" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "public"."inventory" ALTER COLUMN "variant_id" DROP NOT NULL;
ALTER TABLE "public"."sale_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "public"."purchase_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "product_id" DROP NOT NULL;

-- 5. Columns ka type badal kar UUID karte hain
ALTER TABLE "public"."inventory" ALTER COLUMN "product_id" TYPE uuid USING NULL;
ALTER TABLE "public"."inventory" ALTER COLUMN "variant_id" TYPE uuid USING NULL;
ALTER TABLE "public"."sale_items" ALTER COLUMN "product_id" TYPE uuid USING NULL;
ALTER TABLE "public"."purchase_items" ALTER COLUMN "product_id" TYPE uuid USING NULL;
ALTER TABLE "public"."sale_return_items" ALTER COLUMN "product_id" TYPE uuid USING NULL;
ALTER TABLE "public"."purchase_return_items" ALTER COLUMN "product_id" TYPE uuid USING NULL;

-- 6. Products Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."products" CASCADE;
CREATE TABLE "public"."products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" text,
    "brand" text,
    "purchase_price" double precision,
    "sale_price" double precision,
    "user_id" uuid DEFAULT "auth"."uid"(),
    "category_id" uuid,
    "is_featured" boolean DEFAULT false NOT NULL,
    "barcode" text,
    "is_active" boolean DEFAULT true NOT NULL,
    "local_id" uuid,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_warranty_days" integer DEFAULT 0,
    PRIMARY KEY ("id"),
    CONSTRAINT "products_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "products_user_id_barcode_key" UNIQUE ("user_id", "barcode")
);
COMMENT ON COLUMN "public"."products"."barcode" IS 'Stores the barcode or QR code value associated with the product model.';

-- 7. Product Variants Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."product_variants" CASCADE;
CREATE TABLE "public"."product_variants" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "product_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attributes" jsonb,
    "barcode" text,
    "purchase_price" numeric,
    "sale_price" numeric,
    "local_id" uuid,
    PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_local_id_key" UNIQUE ("local_id"),
    CONSTRAINT "unique_barcode_per_user" UNIQUE ("user_id", "barcode")
);
COMMENT ON TABLE "public"."product_variants" IS 'Defines specific variants of a product, each with its own attributes, price, and barcode.';

-- 8. Talluqaat (Foreign Keys) dobara jorte hain
ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;

-- 9. Views ko dobara banate hain
CREATE OR REPLACE VIEW "public"."products_with_quantity" AS
 SELECT "p"."id", "p"."name", "p"."brand", "p"."purchase_price", "p"."sale_price", "p"."category_id", "p"."user_id", "p"."created_at",
    "count"("i"."id") AS "quantity"
   FROM ("public"."products" "p" LEFT JOIN "public"."inventory" "i" ON (("p"."id" = "i"."product_id")))
  GROUP BY "p"."id", "p"."name", "p"."brand", "p"."purchase_price", "p"."sale_price", "p"."category_id", "p"."user_id", "p"."created_at";

CREATE OR REPLACE VIEW "public"."products_display_view" AS
 SELECT "p"."id", "p"."name", "p"."brand", "p"."barcode", "p"."category_id", "p"."purchase_price" AS "default_purchase_price", "p"."sale_price" AS "default_sale_price", "c"."name" AS "category_name",
    COALESCE("sum"("i"."available_qty") FILTER (WHERE ("i"."status" = 'Available'::"text")), (0)::bigint) AS "quantity",
    "avg"("i"."purchase_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "avg_purchase_price",
    "min"("i"."sale_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "min_sale_price",
    "max"("i"."sale_price") FILTER (WHERE ("i"."status" = 'Available'::"text")) AS "max_sale_price"
   FROM (("public"."products" "p" LEFT JOIN "public"."inventory" "i" ON (("p"."id" = "i"."product_id"))) LEFT JOIN "public"."categories" "c" ON (("p"."category_id" = "c"."id")))
  WHERE ("p"."user_id" = "auth"."uid"())
  GROUP BY "p"."id", "c"."name";

-- 10. Index aur Triggers
CREATE UNIQUE INDEX "unique_product_model_per_user" ON "public"."products" USING "btree" ("user_id", "category_id", "lower"("brand"), "lower"("name"));
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- 11. Policies dobara lagate hain (Dropped policies restored)
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own products" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can view their own products" ON "public"."products" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own products" ON "public"."products" FOR UPDATE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own products" ON "public"."products" FOR DELETE USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Allow users to insert their own product variants" ON "public"."product_variants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Allow authenticated users to read variants" ON "public"."product_variants" FOR SELECT USING (("auth"."role"() = 'authenticated'::text));
CREATE POLICY "Users can update their own product variants" ON "public"."product_variants" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));

-- Restore the inventory management policy
CREATE POLICY "Users can manage inventory for their own products." ON "public"."inventory" USING (("auth"."uid"() = ( SELECT "products"."user_id" FROM "public"."products" WHERE ("products"."id" = "inventory"."product_id"))));

-- 12. Permissions (Grants)
GRANT ALL ON TABLE "public"."products" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."product_variants" TO "anon", "authenticated", "service_role";