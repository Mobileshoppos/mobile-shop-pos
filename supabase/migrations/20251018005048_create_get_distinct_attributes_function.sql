-- supabase\migrations\20251018005048_create_get_distinct_attributes_function.sql

CREATE OR REPLACE FUNCTION public.get_distinct_attribute_values(
    p_category_id BIGINT, -- The ID of the category, e.g., 'Smart Phones & Tablets'
    p_attribute_name TEXT -- The name of the attribute, e.g., 'Color' or 'RAM'
)
RETURNS TEXT[] -- This function will return an array of text, like ["Black", "White", "Blue"]
LANGUAGE sql
STABLE
AS $$
  SELECT
    ARRAY_AGG(DISTINCT value ORDER BY value) -- Create an ordered array of unique values
  FROM (
    SELECT
      -- The ->> operator pulls the value of a key from a JSON object as text
      pv.attributes ->> p_attribute_name AS value
    FROM
      public.product_variants AS pv
    JOIN
      public.products AS p ON pv.product_id = p.id
    WHERE
      -- Filter by the specific category
      p.category_id = p_category_id
      -- Security: Only get values from the current user's data
      AND pv.user_id = auth.uid()
      -- Ensure the attribute actually exists in the JSON object
      AND pv.attributes ? p_attribute_name
  ) AS distinct_values
  WHERE
    -- Final check to make sure we don't include empty or null values in our list
    value IS NOT NULL AND value <> '';
$$;