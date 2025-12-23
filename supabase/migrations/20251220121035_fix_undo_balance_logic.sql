CREATE OR REPLACE FUNCTION public.undo_return_item(p_inventory_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_return_id bigint;
    v_purchase_id bigint;
    v_supplier_id bigint;
    v_price numeric;
    v_old_total numeric;
    v_new_total numeric;
    v_amount_paid numeric;
    v_old_credit_contrib numeric;
    v_new_credit_contrib numeric;
    v_final_balance numeric;
BEGIN
    -- 1. Return ki maloomat nikalein
    SELECT return_id, purchase_price INTO v_return_id, v_price
    FROM purchase_return_items 
    WHERE inventory_id_original = p_inventory_id;

    IF v_return_id IS NULL THEN
        RAISE EXCEPTION 'Return record not found for this item';
    END IF;

    SELECT purchase_id, supplier_id INTO v_purchase_id, v_supplier_id
    FROM purchase_returns WHERE id = v_return_id;

    -- 2. Return History se delete karein
    DELETE FROM purchase_return_items WHERE inventory_id_original = p_inventory_id;

    -- 3. Inventory ko wapis 'Available' karein
    UPDATE inventory SET status = 'Available' WHERE id = p_inventory_id;

    -- 4. Return Record ka Total kam karein
    UPDATE purchase_returns 
    SET total_return_amount = total_return_amount - v_price 
    WHERE id = v_return_id;

    -- 5. Purchase ka Total aur Balance Update (FIXED LOGIC)
    SELECT total_amount, amount_paid INTO v_old_total, v_amount_paid 
    FROM purchases WHERE id = v_purchase_id;

    v_new_total := v_old_total + v_price;
    
    -- Balance kabhi negative nahi hona chahiye
    v_final_balance := GREATEST(0, v_new_total - v_amount_paid);

    UPDATE purchases
    SET total_amount = v_new_total,
        balance_due = v_final_balance
    WHERE id = v_purchase_id;

    -- 6. Supplier Credit Adjust karein
    -- Formula: Pehle kitna credit ban raha tha vs Ab kitna ban raha hai
    v_old_credit_contrib := GREATEST(0, v_amount_paid - v_old_total);
    v_new_credit_contrib := GREATEST(0, v_amount_paid - v_new_total);

    -- Agar Credit kam hona chahiye (Kyunke item wapis aa gaya aur bill barh gaya)
    IF (v_old_credit_contrib - v_new_credit_contrib) > 0 THEN
        UPDATE suppliers
        SET credit_balance = credit_balance - (v_old_credit_contrib - v_new_credit_contrib)
        WHERE id = v_supplier_id;
    END IF;

    -- 7. Status Update
    UPDATE purchases 
    SET status = CASE 
        WHEN v_final_balance <= 0 THEN 'paid' 
        ELSE 'partially_paid' 
    END 
    WHERE id = v_purchase_id;

    -- 8. Agar Return Record khali ho gaya hai, to delete karein
    DELETE FROM purchase_returns WHERE id = v_return_id AND total_return_amount <= 0;

END;
$$;