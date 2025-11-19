-- Function 1: Sab se ziyada bikne wale products hasil karne ke liye
CREATE OR REPLACE FUNCTION get_top_selling_products_for_pos()
RETURNS SETOF products_display_view -- Yeh bhi products_display_view jaisa hi result dega
LANGUAGE sql
AS $$
  SELECT pdv.*
  FROM public.products_display_view pdv
  JOIN (
      SELECT
          si.product_id,
          COUNT(si.product_id) AS sale_count
      FROM public.sale_items si
      -- Pata nahi ki "created_at" column ka naam kya hai, isliye isay comment kar diya gaya hai
      -- WHERE si.created_at > now() - interval '90 days' -- Pچھले 90 din ka data
      GROUP BY si.product_id
      ORDER BY sale_count DESC
      LIMIT 10 -- Top 10 products
  ) AS top_products ON pdv.id = top_products.product_id
  ORDER BY top_products.sale_count DESC;
$$;

-- Function 2: Mash'hoor categories hasil karne ke liye
CREATE OR REPLACE FUNCTION get_popular_categories_for_pos(p_limit INT DEFAULT 4)
RETURNS TABLE(category_id BIGINT, category_name TEXT, product_count BIGINT)
LANGUAGE sql
AS $$
  SELECT
      pdv.category_id,
      pdv.category_name,
      COUNT(pdv.id) AS product_count
  FROM public.products_display_view pdv
  WHERE pdv.quantity > 0 -- Sirf un categories ko shamil karein jin mein stock hai
  GROUP BY pdv.category_id, pdv.category_name
  ORDER BY product_count DESC
  LIMIT p_limit; -- Di gayi limit tak categories (default 4)
$$;