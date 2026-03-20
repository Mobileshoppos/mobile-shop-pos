// --- IMPORTANT REMINDER / ZAROORI HIDAYAT ---
// Agar aap yahan koi bhi limit change karte hain, to Supabase Database mein 
// mojood in specific SQL Functions ko update karna lazmi hai:
// 
// 1. max_items          -> Function: check_user_inventory_limit()
// 2. max_models         -> Function: check_model_limit()
// 3. max_customers      -> Function: check_customer_limit()
// 4. max_suppliers      -> Function: check_supplier_limit()
// 5. max_staff          -> Function: check_staff_limit()
// 6. warranty_system    -> Function: check_warranty_limit() (Free plan block + 1000 safety max limit)
//
// React sirf User ko rokta hai (UI), lekin Database asal Security Guard hai.
// Dono jagah limits same honi chahiye.
// ---------------------------------------------

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    // --- Ginti (Limits) ---
    max_items: 200,             // Kul Available Stock (IMEI/Quantity)
    max_models: 20,            // Kul Product Models (Active + Archive)
    max_customers: 24,          // Kul Customers (Active + Archive)
    max_suppliers: 1,          // Kul Suppliers (Active + Archive)
    max_staff: 0,               // Sirf Active Staff Seats
    max_total_staff: 500,       // Global Safety Limit (Active + Archive)
    always_show_badge: true,    // Free plan par hamesha dikhao

    // --- Feature Flags ---
    allow_reports: false, 
    allow_backup: false,
    allow_custom_categories: false,       
    allow_customer_management: true,     
    allow_supplier_management: true,     
    allow_warranty_system: false,         
    allow_advanced_settings: false,       
    allow_custom_threshold: false,        
    allow_monthly_reports: false,         
    allow_custom_date_reports: false,     
    allow_price_change_control: true      
  },

  growth: {
    name: 'Growth Plan',
    // --- Ginti (Limits) ---
    max_items: 2500,            // Kul Available Stock (Busy Shop ke liye kafi hai)
    max_models: 1000,           // Kul Product Models (Active + Archive)
    max_customers: 999,        // Kul Customers (Active + Archive)
    max_suppliers: 99,         // Kul Suppliers (Active + Archive)
    max_staff: 2,               // 2 Salesmen allow hain
    max_total_staff: 500,       // Global Safety Limit (Active + Archive)
    always_show_badge: false,   // Hamesha mat dikhao
    badge_threshold: 0.8,       // Jab 80% quota khatam ho tab dikhao

    // --- Feature Flags ---
    allow_reports: true,
    allow_backup: true,
    allow_custom_categories: true,
    allow_customer_management: true,
    allow_supplier_management: true,
    allow_warranty_system: true,      
    allow_advanced_settings: true,     
    allow_custom_threshold: true,      
    allow_monthly_reports: true,       
    allow_custom_date_reports: true,   
    allow_price_change_control: true   
  },

  pro: {
    name: 'Pro Plan',
    // --- Ginti (Limits) ---
    max_items: 50000,           // Unlimited jaisa (Large Inventory)
    max_models: 5000,           // Kul Product Models (Active + Archive)
    max_customers: 4999,        // Kul Customers (Active + Archive)
    max_suppliers: 499,         // Kul Suppliers (Active + Archive)
    max_staff: 5,               // 5 Salesmen allow hain
    max_total_staff: 500,       // Global Safety Limit (Active + Archive)
    always_show_badge: false,   // Hamesha mat dikhao
    badge_threshold: 0.8,       // Jab 80% quota khatam ho tab dikhao

    // --- Feature Flags ---
    allow_reports: true,
    allow_backup: true,
    allow_custom_categories: true,
    allow_customer_management: true,
    allow_supplier_management: true,
    allow_warranty_system: true,
    allow_advanced_settings: true,
    allow_custom_threshold: true,      
    allow_monthly_reports: true,       
    allow_custom_date_reports: true,   
    allow_price_change_control: true   
  }
};

export const getPlanLimits = (tier) => {
  const planKey = tier ? tier.toLowerCase() : 'free';
  return SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;
};