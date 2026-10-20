CREATE OR REPLACE FUNCTION "public"."get_inventory_details"("p_search_query" "text", "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_filter_attributes" "jsonb" DEFAULT '{}'::"jsonb", "p_min_price" numeric DEFAULT NULL::numeric, "p_max_price" numeric DEFAULT NULL::numeric, "p_sort_by" "text" DEFAULT 'name_asc'::"text") RETURNS SETOF "public"."unified_product_type"
    LANGUAGE "plpgsql"
    AS $$
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
        -- NAYA IZAFA: Subquery mein i.distributor_price shamil kiya gaya hai
        (SELECT jsonb_agg(v) FROM (SELECT i.id, i.imei, i.item_attributes, i.purchase_price, i.sale_price, i.wholesale_price, i.distributor_price FROM public.inventory i WHERE i.product_id = fp.id AND i.status = 'Available' ORDER BY i.created_at DESC) v) AS variants
    FROM filtered_products fp;
END; $$;

ALTER FUNCTION "public"."get_inventory_details"("p_search_query" "text", "p_category_id" "uuid", "p_filter_attributes" "jsonb", "p_min_price" numeric, "p_max_price" numeric, "p_sort_by" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_inventory_details"("p_search_query" "text", "p_category_id" "uuid", "p_filter_attributes" "jsonb", "p_min_price" numeric, "p_max_price" numeric, "p_sort_by" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_inventory_details"("p_search_query" "text", "p_category_id" "uuid", "p_filter_attributes" "jsonb", "p_min_price" numeric, "p_max_price" numeric, "p_sort_by" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_inventory_details"("p_search_query" "text", "p_category_id" "uuid", "p_filter_attributes" "jsonb", "p_min_price" numeric, "p_max_price" numeric, "p_sort_by" "text") TO "supabase_auth_admin";