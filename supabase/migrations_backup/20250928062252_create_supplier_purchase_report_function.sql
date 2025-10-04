-- supabase/migrations/20250928062252_create_supplier_purchase_report_function.sql

CREATE OR REPLACE FUNCTION public.get_supplier_purchase_report(
    start_date date,
    end_date date
)
RETURNS TABLE (
    supplier_name text,
    total_purchase_amount numeric,
    purchase_count bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        s.name AS supplier_name,
        SUM(p.total_amount) AS total_purchase_amount,
        COUNT(p.id) AS purchase_count
    FROM
        public.purchases p
    JOIN
        public.suppliers s ON p.supplier_id = s.id
    WHERE
        p.purchase_date >= start_date AND p.purchase_date <= end_date
    GROUP BY
        s.name
    ORDER BY
        total_purchase_amount DESC;
$$;