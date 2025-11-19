CREATE OR REPLACE FUNCTION search_products_for_pos(p_search_text TEXT)
RETURNS SETOF products_display_view -- Yeh hamare products_display_view jaisa hi result dega
LANGUAGE plpgsql
AS $$
BEGIN
  -- Agar search text khali ho to kuch bhi wapas na bhejein
  IF p_search_text IS NULL OR trim(p_search_text) = '' THEN
    RETURN;
  END IF;

  -- Products ko talash karein aur wapas bhejein
  RETURN QUERY
  SELECT *
  FROM public.products_display_view
  WHERE
    -- Naam, Brand, ya Category mein kahin bhi search text milay (case-insensitive)
    name ILIKE '%' || p_search_text || '%' OR
    brand ILIKE '%' || p_search_text || '%' OR
    category_name ILIKE '%' || p_search_text || '%'
  ORDER BY
    -- Natijay ko naam se tartdeeb dein
    name ASC
  LIMIT 15; -- Sirf 15 natijay dikhayein taake UI tez rahe

END;
$$;