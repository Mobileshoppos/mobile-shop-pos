-- Pehle purane (galat type wale) function ko khatam karna zaroori hai
DROP FUNCTION IF EXISTS "public"."get_sale_details"(bigint);

-- Naya mehfooz function (Sirf UUID aur Security check ka izafa)
CREATE OR REPLACE FUNCTION "public"."get_sale_details"("p_sale_id" uuid) RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
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
    s.id = p_sale_id
    AND s.user_id = auth.uid(); -- [SECURITY FIX]: Sirf apni dukan ka data dekhne ka check
$$;

-- Permissions dobara set karna
ALTER FUNCTION "public"."get_sale_details"("p_sale_id" uuid) OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."get_sale_details"("p_sale_id" uuid) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_sale_details"("p_sale_id" uuid) TO "service_role";