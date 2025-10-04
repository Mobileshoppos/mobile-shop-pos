-- supabase/migrations/20250927125427_create_suppliers_with_balance_view.sql

CREATE OR REPLACE VIEW public.suppliers_with_balance AS
SELECT
    s.id,
    s.name,
    s.contact_person,
    s.phone,
    s.address,
    s.created_at,
    COALESCE(SUM(p.balance_due), 0) AS balance_due
FROM
    public.suppliers s
LEFT JOIN
    public.purchases p ON s.id = p.supplier_id
GROUP BY
    s.id,
    s.name,
    s.contact_person,
    s.phone,
    s.address,
    s.created_at
ORDER BY
    s.name;