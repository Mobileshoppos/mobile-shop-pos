-- 1. Ek function banayein jo har update par waqt ko 'now()' par set karega
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Tamam tables mein 'updated_at' column add karein
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'products', 'categories', 'customers', 'suppliers', 
            'purchases', 'sales', 'expenses', 'inventory', 
            'cash_adjustments', 'daily_closings', 'customer_payments', 
            'supplier_payments', 'credit_payouts', 'expense_categories', 
            'category_attributes', 'sale_returns'
        )
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()', t);
        
        -- Purane triggers saaf karke naye lagayein (taake error na aaye)
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;