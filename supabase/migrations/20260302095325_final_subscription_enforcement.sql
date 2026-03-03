-- ==========================================
-- SADAPOS MASTER SUBSCRIPTION ENFORCEMENT
-- ==========================================

-- 1. INVENTORY (STOCK) GUARD
CREATE OR REPLACE FUNCTION "public"."check_user_inventory_limit"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_plan TEXT; v_current INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'pro' THEN v_limit := 50000;
    ELSIF v_plan = 'growth' THEN v_limit := 2500;
    ELSE v_limit := 200; END IF;

    SELECT COALESCE(SUM(available_qty), 0) INTO v_current FROM public.inventory 
    WHERE user_id = auth.uid() AND status = 'Available';

    IF (v_current + COALESCE(NEW.available_qty, 1)) > v_limit THEN
        RAISE EXCEPTION 'Stock Limit Reached: Your % plan allows % available items.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 2. STAFF GUARD (Active Seats + Global Safety)
CREATE OR REPLACE FUNCTION "public"."check_staff_limit"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_plan TEXT; v_active INT; v_total INT; v_limit INT;
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
        
        IF v_plan = 'pro' THEN v_limit := 5;
        ELSIF v_plan = 'growth' THEN v_limit := 2;
        ELSE v_limit := 0; END IF;

        SELECT COUNT(*) INTO v_active FROM public.staff_members WHERE user_id = auth.uid() AND is_active = true;
        SELECT COUNT(*) INTO v_total FROM public.staff_members WHERE user_id = auth.uid();

        IF v_active >= v_limit AND NEW.is_active = true THEN
            RAISE EXCEPTION 'Staff Seats Full: Your % plan allows % active staff.', v_plan, v_limit;
        END IF;

        IF v_total >= 500 THEN
            RAISE EXCEPTION 'Safety Limit: Maximum 500 staff records (including archived) allowed.';
        END IF;
    END IF;
    RETURN NEW;
END; $$;

-- 3. CUSTOMER GUARD (Total Records)
CREATE OR REPLACE FUNCTION "public"."check_customer_limit"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'pro' THEN v_limit := 5000;
    ELSIF v_plan = 'growth' THEN v_limit := 1000;
    ELSE v_limit := 50; END IF;

    SELECT COUNT(*) INTO v_total FROM public.customers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Customer Limit Reached: Your % plan allows % total customers.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 4. SUPPLIER GUARD (Total Records)
CREATE OR REPLACE FUNCTION "public"."check_supplier_limit"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'pro' THEN v_limit := 500;
    ELSIF v_plan = 'growth' THEN v_limit := 100;
    ELSE v_limit := 10; END IF;

    SELECT COUNT(*) INTO v_total FROM public.suppliers WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Supplier Limit Reached: Your % plan allows % total suppliers.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- 5. PRODUCT MODEL GUARD (Total Records)
CREATE OR REPLACE FUNCTION "public"."check_model_limit"() 
RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER AS $$
DECLARE
    v_plan TEXT; v_total INT; v_limit INT;
BEGIN
    SELECT subscription_tier INTO v_plan FROM public.profiles WHERE user_id = auth.uid();
    
    IF v_plan = 'pro' THEN v_limit := 5000;
    ELSIF v_plan = 'growth' THEN v_limit := 1000;
    ELSE v_limit := 100; END IF;

    SELECT COUNT(*) INTO v_total FROM public.products WHERE user_id = auth.uid();

    IF v_total >= v_limit THEN
        RAISE EXCEPTION 'Product Model Limit Reached: Your % plan allows % models.', v_plan, v_limit;
    END IF;
    RETURN NEW;
END; $$;

-- ==========================================
-- ATTACHING TRIGGERS TO TABLES
-- ==========================================

-- Customers
DROP TRIGGER IF EXISTS trg_check_customer_limit ON public.customers;
CREATE TRIGGER trg_check_customer_limit BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION check_customer_limit();

-- Suppliers
DROP TRIGGER IF EXISTS trg_check_supplier_limit ON public.suppliers;
CREATE TRIGGER trg_check_supplier_limit BEFORE INSERT ON public.suppliers FOR EACH ROW EXECUTE FUNCTION check_supplier_limit();

-- Product Models
DROP TRIGGER IF EXISTS trg_check_model_limit ON public.products;
CREATE TRIGGER trg_check_model_limit BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION check_model_limit();

-- Staff (Insert and Update for Restore)
DROP TRIGGER IF EXISTS trg_check_staff_limit ON public.staff_members;
CREATE TRIGGER trg_check_staff_limit BEFORE INSERT OR UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION check_staff_limit();

-- Inventory (Already exists, but we re-attach to be sure)
DROP TRIGGER IF EXISTS trg_check_inventory_limit ON public.inventory;
CREATE TRIGGER trg_check_inventory_limit BEFORE INSERT ON public.inventory FOR EACH ROW EXECUTE FUNCTION check_user_inventory_limit();