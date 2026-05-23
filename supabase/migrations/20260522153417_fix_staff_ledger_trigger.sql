CREATE OR REPLACE FUNCTION public.fn_sync_staff_balance_and_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_staff_id uuid;
    v_total_credits numeric;
    v_total_debits numeric;
BEGIN
    -- 1. Check karein ke operation kya hai?
    IF (TG_OP = 'DELETE') THEN
        -- Agar Delete ho raha hai, to sirf ID pakrein (Tarikh update na karein)
        v_staff_id := OLD.staff_id;
    ELSE
        -- Agar Nayi entry hai ya Update hai, tab tarikh likhein
        NEW.updated_at := now();
        v_staff_id := NEW.staff_id;
    END IF;

    -- 2. Credits ginein (Salary + Commission)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_credits 
    FROM public.staff_ledger 
    WHERE staff_id = v_staff_id AND (type = 'Salary' OR type = 'Commission');

    -- 3. Debits ginein (Advance + Deduction)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_debits 
    FROM public.staff_ledger 
    WHERE staff_id = v_staff_id AND (type = 'Advance' OR type = 'Deduction');

    -- 4. Staff Members table mein balance update karein
    UPDATE public.staff_members
    SET balance = (v_total_credits - v_total_debits)
    WHERE id = v_staff_id;

    -- 5. Sahi cheez wapis bhejein taake database crash na ho
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;