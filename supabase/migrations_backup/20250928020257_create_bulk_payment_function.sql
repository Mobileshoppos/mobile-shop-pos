-- supabase/migrations/20250928020257_create_bulk_payment_function.sql

CREATE OR REPLACE FUNCTION public.record_bulk_supplier_payment(
    p_supplier_id integer,
    p_amount numeric,
    p_payment_method text,
    p_payment_date date,
    p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unpaid_purchase RECORD;
    remaining_amount numeric := p_amount;
    payment_to_apply numeric;
BEGIN
    -- Step 1: Sab se pehle, asal payment ko 'supplier_payments' table mein record karein.
    -- Yahan purchase_id NULL rahega kyun ke yeh ek bulk payment hai.
    INSERT INTO public.supplier_payments (supplier_id, amount, payment_method, payment_date, notes, purchase_id)
    VALUES (p_supplier_id, p_amount, p_payment_method, p_payment_date, p_notes, NULL);

    -- Step 2: Supplier ki tamam unpaid purchases ko, sab se purani pehle, loop karein.
    FOR unpaid_purchase IN
        SELECT id, balance_due
        FROM public.purchases
        WHERE supplier_id = p_supplier_id AND balance_due > 0
        ORDER BY purchase_date ASC
    LOOP
        -- Agar payment ki poori raqam istemal ho chuki hai, to loop se bahar nikal jayein.
        IF remaining_amount <= 0 THEN
            EXIT;
        END IF;

        -- Tay karein ke is purchase par kitni payment lagani hai.
        IF remaining_amount >= unpaid_purchase.balance_due THEN
            payment_to_apply := unpaid_purchase.balance_due;
        ELSE
            payment_to_apply := remaining_amount;
        END IF;

        -- Purchase record ko update karein.
        UPDATE public.purchases
        SET
            amount_paid = amount_paid + payment_to_apply,
            balance_due = balance_due - payment_to_apply
        WHERE id = unpaid_purchase.id;

        -- Bulk payment ki baqi raqam ko kam karein.
        remaining_amount := remaining_amount - payment_to_apply;
    END LOOP;

    -- Step 3: Payment lagane ke baad, is supplier ki tamam purchases ka status update karein.
    -- Yeh loop ke andar status update karne se ziyada efficient hai.
    UPDATE public.purchases
    SET status = CASE
        WHEN balance_due <= 0 THEN 'paid'
        WHEN amount_paid > 0 AND balance_due > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END
    WHERE supplier_id = p_supplier_id;

END;
$$;