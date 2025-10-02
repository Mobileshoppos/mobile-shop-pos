-- supabase/migrations/[TIMESTAMP]_create_get_sale_details_function.sql

CREATE OR REPLACE FUNCTION get_sale_details(p_sale_id bigint)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'shopName', prof.shop_name,
    'shopAddress', prof.address,
    'shopPhone', prof.phone_number,
    'saleId', s.id,
    'saleDate', s.created_at,
    'customerName', COALESCE(c.name, 'Walk-in Customer'),
    'items', (
      SELECT json_agg(
        json_build_object(
          'name', p.name,
          'quantity', si.quantity,
          'price_at_sale', si.price_at_sale
        )
      )
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = s.id
    ),
    'subtotal', s.subtotal,
    'discount', s.discount,
    'grandTotal', s.total_amount,
    'amountPaid', s.amount_paid_at_sale,
    'paymentStatus', s.payment_status
  )
  FROM 
    sales s
  LEFT JOIN 
    customers c ON s.customer_id = c.id
  LEFT JOIN 
    profiles prof ON s.user_id = prof.user_id
  WHERE 
    s.id = p_sale_id;
$$;