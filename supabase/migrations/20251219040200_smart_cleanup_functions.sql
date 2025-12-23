-- Smart Cleanup Script
-- Yeh script khud dhoondega ke kon se functions 'Integer' (Old) use kar rahe hain aur unhein delete karega.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Hum system catalog (pg_proc) se dhoond rahe hain
    FOR r IN
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          -- In 3 names wale functions ko target karein
          AND p.proname IN ('record_supplier_refund', 'record_supplier_payment', 'record_bulk_supplier_payment')
          -- Sirf wo functions jinka pehla parameter INTEGER (OID 23) hai
          AND p.proargtypes[0] = 23 
    LOOP
        -- Function ko Delete (Drop) karein
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ')';
        RAISE NOTICE 'Dropped old function: %', r.proname;
    END LOOP;
END $$;