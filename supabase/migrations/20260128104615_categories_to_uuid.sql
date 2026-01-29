-- 1. Pehle un Views aur Functions ko hatate hain jo category_id par depend karte hain
DROP VIEW IF EXISTS "public"."products_display_view" CASCADE;
DROP VIEW IF EXISTS "public"."products_with_quantity" CASCADE;
DROP VIEW IF EXISTS "public"."customers_with_balance" CASCADE;
DROP VIEW IF EXISTS "public"."suppliers_with_balance" CASCADE;

-- Functions ko drop karna zaroori hai kyunke unke parameters 'bigint' hain
DROP FUNCTION IF EXISTS "public"."get_inventory_details"(text, bigint, jsonb, numeric, numeric, text);
DROP FUNCTION IF EXISTS "public"."get_distinct_attribute_values"(bigint, text);
DROP FUNCTION IF EXISTS "public"."get_popular_categories_for_pos"(integer);
DROP FUNCTION IF EXISTS "public"."get_user_categories_with_settings"();

-- 2. Purane Talluqaat (Constraints) khatam karte hain
ALTER TABLE IF EXISTS "public"."products" DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
ALTER TABLE IF EXISTS "public"."category_attributes" DROP CONSTRAINT IF EXISTS "fk_category";
ALTER TABLE IF EXISTS "public"."user_category_settings" DROP CONSTRAINT IF EXISTS "user_category_settings_category_id_fkey";
ALTER TABLE IF EXISTS "public"."user_category_settings" DROP CONSTRAINT IF EXISTS "user_category_settings_pkey";

-- 3. Columns ka type badal kar UUID karte hain
ALTER TABLE "public"."products" ALTER COLUMN "category_id" TYPE uuid USING NULL;
ALTER TABLE "public"."user_category_settings" ALTER COLUMN "category_id" TYPE uuid USING NULL;

-- 4. Categories Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."categories" CASCADE;
CREATE TABLE "public"."categories" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" text NOT NULL,
    "user_id" uuid DEFAULT "auth"."uid"(),
    "is_imei_based" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "local_id" uuid,
    PRIMARY KEY ("id"),
    CONSTRAINT "categories_local_id_key" UNIQUE ("local_id")
);
COMMENT ON COLUMN "public"."categories"."is_imei_based" IS 'If TRUE, items in this category are tracked individually (like with IMEI). If FALSE, they are tracked in bulk by quantity.';

-- 5. Category Attributes Table ko UUID ke saath dobara banate hain
DROP TABLE IF EXISTS "public"."category_attributes" CASCADE;
CREATE TABLE "public"."category_attributes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" uuid NOT NULL,
    "attribute_name" text NOT NULL,
    "attribute_type" text NOT NULL,
    "options" jsonb,
    "is_required" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id"),
    CONSTRAINT "category_attributes_attribute_type_check" CHECK (("attribute_type" = ANY (ARRAY['text'::text, 'number'::text, 'select'::text]))),
    CONSTRAINT "unique_category_attribute_name" UNIQUE ("category_id", "attribute_name")
);

-- 6. User Category Settings Table ko update karte hain
ALTER TABLE ONLY "public"."user_category_settings"
    ADD CONSTRAINT "user_category_settings_pkey" PRIMARY KEY ("user_id", "category_id");

-- 7. Talluqaat (Foreign Keys) dobara jorte hain
ALTER TABLE ONLY "public"."category_attributes"
    ADD CONSTRAINT "fk_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY "public"."user_category_settings"
    ADD CONSTRAINT "user_category_settings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;

-- 8. Views ko dobara banate hain (Ab yeh UUID ko support karenge)
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

-- 9. Functions ko dobara banate hain (UUID parameter ke saath)
CREATE OR REPLACE FUNCTION "public"."get_inventory_details"("p_search_query" text, "p_category_id" uuid DEFAULT NULL, "p_filter_attributes" jsonb DEFAULT '{}'::jsonb, "p_min_price" numeric DEFAULT NULL, "p_max_price" numeric DEFAULT NULL, "p_sort_by" text DEFAULT 'name_asc'::text) 
RETURNS SETOF "public"."unified_product_type" LANGUAGE "plpgsql" AS $$
BEGIN
    RETURN QUERY
    WITH filtered_products AS (
        SELECT pdv.* FROM public.products_display_view AS pdv
        WHERE (p_category_id IS NULL OR pdv.category_id = p_category_id)
          AND ((p_min_price IS NULL OR pdv.max_sale_price >= p_min_price) AND (p_max_price IS NULL OR pdv.min_sale_price <= p_max_price))
          AND (p_filter_attributes = '{}'::jsonb OR EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND i.item_attributes @> p_filter_attributes))
          AND (p_search_query IS NULL OR p_search_query = '' OR pdv.name ILIKE '%' || p_search_query || '%' OR pdv.brand ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM public.inventory i WHERE i.product_id = pdv.id AND i.status = 'Available' AND (i.imei ILIKE '%' || p_search_query || '%' OR EXISTS (SELECT 1 FROM jsonb_each_text(i.item_attributes) AS t(key, value) WHERE value ILIKE '%' || p_search_query || '%'))))
    )
    SELECT fp.id, fp.name, fp.brand, fp.category_id, fp.category_name, fp.quantity, fp.min_sale_price, fp.max_sale_price,
        (SELECT jsonb_agg(v) FROM (SELECT i.id, i.imei, i.item_attributes, i.purchase_price, i.sale_price FROM public.inventory i WHERE i.product_id = fp.id AND i.status = 'Available' ORDER BY i.created_at DESC) v) AS variants
    FROM filtered_products fp;
END; $$;

CREATE OR REPLACE FUNCTION "public"."get_distinct_attribute_values"("p_category_id" uuid, "p_attribute_name" text) 
RETURNS text[] LANGUAGE "sql" STABLE AS $$
  SELECT ARRAY_AGG(DISTINCT value ORDER BY value) FROM (
    SELECT pv.attributes ->> p_attribute_name AS value FROM public.product_variants AS pv
    JOIN public.products AS p ON pv.product_id = p.id
    WHERE p.category_id = p_category_id AND pv.user_id = auth.uid() AND pv.attributes ? p_attribute_name
  ) AS distinct_values WHERE value IS NOT NULL AND value <> '';
$$;

CREATE OR REPLACE FUNCTION "public"."get_popular_categories_for_pos"("p_limit" integer DEFAULT 4) 
RETURNS TABLE("category_id" uuid, "category_name" text, "product_count" bigint) LANGUAGE "sql" AS $$
  SELECT pdv.category_id, pdv.category_name, COUNT(pdv.id) AS product_count
  FROM public.products_display_view pdv WHERE pdv.quantity > 0
  GROUP BY pdv.category_id, pdv.category_name ORDER BY product_count DESC LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION "public"."get_user_categories_with_settings"() 
RETURNS TABLE("id" uuid, "created_at" timestamp with time zone, "name" text, "user_id" uuid, "is_visible" boolean, "is_imei_based" boolean) LANGUAGE "plpgsql" AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.created_at, c.name, c.user_id, COALESCE(ucs.is_visible, TRUE) as is_visible, c.is_imei_based
    FROM categories c LEFT JOIN user_category_settings ucs ON c.id = ucs.category_id AND ucs.user_id = auth.uid()
    WHERE c.user_id IS NULL OR c.user_id = auth.uid();
END; $$;

-- 10. RLS, Triggers aur Grants (Wohi purane)
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."category_attributes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow viewing of own and default categories" ON "public"."categories" FOR SELECT USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can create categories" ON "public"."categories" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can delete their own categories" ON "public"."categories" FOR DELETE USING (("auth"."uid"() = "user_id"));
CREATE POLICY "Users can update their own categories" ON "public"."categories" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "allow_read_for_all_authenticated_users" ON "public"."category_attributes" FOR SELECT USING (("auth"."role"() = 'authenticated'::text));
CREATE POLICY "allow_insert_for_category_owner" ON "public"."category_attributes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1 FROM "public"."categories" "c" WHERE (("c"."id" = "category_attributes"."category_id") AND ("c"."user_id" = "auth"."uid"())))));

CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();
CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."category_attributes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

GRANT ALL ON TABLE "public"."categories" TO "anon", "authenticated", "service_role";
GRANT ALL ON TABLE "public"."category_attributes" TO "anon", "authenticated", "service_role";