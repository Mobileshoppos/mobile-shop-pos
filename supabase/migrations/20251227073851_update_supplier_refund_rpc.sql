CREATE OR REPLACE FUNCTION public.record_supplier_refund(
    p_local_id uuid, -- Naya Parameter
    p_supplier_id bigint, 
    p_amount numeric, 
    p_refund_date date, 
    p_method text, 
    p_notes text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Duplicate Check
  IF EXISTS (SELECT 1 FROM supplier_refunds WHERE local_id = p_local_id) THEN
      RETURN;
  END IF;

  INSERT INTO supplier_refunds (local_id, supplier_id, amount, refund_date, payment_method, notes)
  VALUES (p_local_id, p_supplier_id, p_amount, p_refund_date, p_method, p_notes);

  UPDATE suppliers SET credit_balance = credit_balance - p_amount WHERE id = p_supplier_id;
END;
$$;