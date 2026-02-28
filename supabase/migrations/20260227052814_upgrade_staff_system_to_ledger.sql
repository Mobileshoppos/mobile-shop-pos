-- 1. Staff Members table mein naye columns ka izafa
ALTER TABLE public.staff_members 
ADD COLUMN IF NOT EXISTS "salary" numeric(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS "balance" numeric(12,2) DEFAULT 0.00;

-- 2. Aik Smart Function jo Balance aur Timestamp dono handle karega
CREATE OR REPLACE FUNCTION "public"."fn_sync_staff_balance_and_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_staff_id uuid;
    v_total_credits numeric;
    v_total_debits numeric;
BEGIN
    -- A. Pehle Timestamp update karein (Purana kaam)
    NEW.updated_at = now();

    -- B. Staff ID pakrein
    IF (TG_OP = 'DELETE') THEN
        v_staff_id := OLD.staff_id;
    ELSE
        v_staff_id := NEW.staff_id;
    END IF;

    -- C. Credits ginein (Salary + Commission)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_credits 
    FROM public.staff_ledger 
    WHERE staff_id = v_staff_id AND (type = 'Salary' OR type = 'Commission');

    -- D. Debits ginein (Advance + Deduction)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_debits 
    FROM public.staff_ledger 
    WHERE staff_id = v_staff_id AND (type = 'Advance' OR type = 'Deduction');

    -- E. Staff Members table mein balance update karein
    UPDATE public.staff_members
    SET balance = (v_total_credits - v_total_debits)
    WHERE id = v_staff_id;

    RETURN NEW;
END;
$$;

-- 3. Purane trigger ko khatam karna (Clean up)
DROP TRIGGER IF EXISTS "set_staff_ledger_updated_at" ON "public"."staff_ledger";

-- 4. Naya Super Trigger lagana
CREATE TRIGGER "trg_staff_ledger_master"
    BEFORE INSERT OR UPDATE OR DELETE ON "public"."staff_ledger"
    FOR EACH ROW EXECUTE FUNCTION "public"."fn_sync_staff_balance_and_timestamp"();