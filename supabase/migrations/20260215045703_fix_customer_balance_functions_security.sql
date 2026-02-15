-- 1. Pehle purane integer wale functions ko khatam karna zaroori hai
DROP FUNCTION IF EXISTS "public"."add_to_customer_balance"(integer, double precision);
DROP FUNCTION IF EXISTS "public"."subtract_from_customer_balance"(integer, double precision);

-- 2. Naya add_to_customer_balance (Asli code ka ehtram, sirf security ka izafa)
CREATE OR REPLACE FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" uuid, "amount_to_add" double precision) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.customers
  set balance = balance + amount_to_add
  where id = customer_id_to_update
  and user_id = auth.uid(); -- [SECURITY FIX]: Sirf apni dukan ke customer ka balance update karein
$$;

-- 3. Naya subtract_from_customer_balance (Asli code ka ehtram, sirf security ka izafa)
CREATE OR REPLACE FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" uuid, "amount_to_subtract" double precision) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.customers
  set balance = balance - amount_to_subtract
  where id = customer_id_to_update
  and user_id = auth.uid(); -- [SECURITY FIX]: Sirf apni dukan ke customer ka balance update karein
$$;

-- Permissions set karna
ALTER FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" uuid, "amount_to_add" double precision) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" uuid, "amount_to_add" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_to_customer_balance"("customer_id_to_update" uuid, "amount_to_add" double precision) TO "service_role";

ALTER FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" uuid, "amount_to_subtract" double precision) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" uuid, "amount_to_subtract" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subtract_from_customer_balance"("customer_id_to_update" uuid, "amount_to_subtract" double precision) TO "service_role";