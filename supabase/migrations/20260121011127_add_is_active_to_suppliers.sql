-- 1. Suppliers table mein is_active column add karein
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- 2. Purani View ko khatam karein taake columns ki tartib badli ja sake
DROP VIEW IF EXISTS "public"."suppliers_with_balance";

-- 3. Nayi View banayein (Aap ke mojooda code ke mutabiq, bas is_active ka izafa kiya hai)
CREATE VIEW "public"."suppliers_with_balance" AS
 SELECT "s"."id",
    "s"."name",
    "s"."contact_person",
    "s"."phone",
    "s"."address",
    "s"."created_at",
    "s"."credit_balance",
    "s"."user_id",
    "s"."local_id",
    "s"."updated_at",
    "s"."is_active", -- Naya column shamil kiya gaya
    COALESCE("sum"("p"."balance_due"), (0)::numeric) AS "balance_due"
   FROM ("public"."suppliers" "s"
     LEFT JOIN "public"."purchases" "p" ON (("s"."id" = "p"."supplier_id")))
  GROUP BY "s"."id", "s"."name", "s"."contact_person", "s"."phone", "s"."address", "s"."created_at", "s"."credit_balance", "s"."user_id", "s"."local_id", "s"."updated_at", "s"."is_active"
  ORDER BY "s"."name";

-- View ka owner wapis set karein (Aap ke original code ke mutabiq)
ALTER VIEW "public"."suppliers_with_balance" OWNER TO "postgres";