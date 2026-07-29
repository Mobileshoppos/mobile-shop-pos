// --- IMPORTANT REMINDER / ZAROORI HIDAYAT ---
// Agar aap yahan koi bhi limit change karte hain, to Supabase Database mein 
// mojood in specific SQL Functions ko update karna lazmi hai:
// 
// 1. max_items          -> Function: check_user_inventory_limit()
// 2. max_models         -> Function: check_model_limit()
// 3. max_customers      -> Function: check_customer_limit()
// 4. max_suppliers      -> Function: check_supplier_limit()
// 5. max_staff          -> Function: check_staff_limit()
// 6. max_counters       -> Function: check_register_limit()
// 7. warranty_system    -> Function: check_warranty_limit()
// ---------------------------------------------

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    // --- Ginti (Limits) - Products & Stock Unlimited Kar Diye Hain ---
    max_items: 50000,           // Stock Limit (Unlimited jaisa)
    max_models: 10000,          // Model Limit (Unlimited jaisa)
    max_customers: 1,           // Sirf Walk-in Customer
    max_suppliers: 1,           // Sirf Cash Purchase Supplier
    max_staff: 0,               // No Staff (Sirf Owner)
    max_total_staff: 500,       // Global Safety Limit
    max_counters: 1,            // Sirf 1 Main Counter
    always_show_badge: true,

    // --- Feature Flags (Restricted) ---
    allow_reports: false,                 // Reports 100% Locked (Blur Overlay)
    allow_backup: false,                  // No Offline Backup
    allow_custom_categories: false,       
    allow_customer_management: false,     // Udhar/Customer Khata Locked
    allow_supplier_management: false,     // Supplier Ledger Locked
    allow_warranty_system: false,         // Warranty Locked
    allow_advanced_settings: false,       
    allow_custom_threshold: false,        
    allow_monthly_reports: false,         
    allow_custom_date_reports: false,     
    allow_price_change_control: false,
    allow_wholesale_pricing: false,
    allow_customer_credit_limits: false,
    allow_stock_location: false,
    allow_balance_sheet: false,            // Balance Sheet Locked
    allow_stock_flow_audit: false,        // Stock Flow Audit Locked
    allow_master_export: false            // Master Export Locked
  },

  growth: {
    name: 'Growth Plan',
    // --- Ginti (Limits) ---
    max_items: 50000,           // Stock Unlimited
    max_models: 10000,          // Models Unlimited
    max_customers: 1000,        // Up to 1000 Customers
    max_suppliers: 100,         // Up to 100 Suppliers
    max_staff: 1,               // Up to 1 Staff Account (Salesman with PIN)
    max_total_staff: 500,       
    max_counters: 1,            // Single Counter Shop
    always_show_badge: false,   
    badge_threshold: 0.8,       

    // --- Feature Flags (Full Single-Counter POS Features) ---
    allow_reports: true,                  // Sales, Inventory & Ledger Reports Allowed
    allow_backup: true,                   // Backup Allowed
    allow_custom_categories: true,
    allow_customer_management: true,      // Udhar / Khata System ON
    allow_supplier_management: true,      // Supplier Ledger ON
    allow_warranty_system: true,          // IMEI & Warranty ON
    allow_advanced_settings: true,     
    allow_custom_threshold: true,      
    allow_monthly_reports: true,       
    allow_custom_date_reports: true,   
    allow_price_change_control: true,
    allow_wholesale_pricing: true,        // Wholesale Pricing ON
    allow_customer_credit_limits: true,   // Credit Limits ON
    allow_stock_location: true,
    allow_balance_sheet: false,            // Balance Sheet Locked
    allow_stock_flow_audit: false,        // Stock Flow Audit Locked
    allow_master_export: false            // Master Export Locked
  },

  pro: {
    name: 'Pro Plan',
    // --- Ginti (Limits) ---
    max_items: 50000,           
    max_models: 10000,          
    max_customers: 5000,        
    max_suppliers: 500,         
    max_staff: 2,               // Up to 2 Staff Accounts
    max_total_staff: 500,       
    max_counters: 3,            // Up to 3 Counters / Registers
    always_show_badge: false,   
    badge_threshold: 0.8,       

    // --- Feature Flags (Advanced Audit & Multi-Counter Features) ---
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
    allow_price_change_control: true,
    allow_wholesale_pricing: true,
    allow_customer_credit_limits: true,
    allow_stock_location: true,
    allow_balance_sheet: false,            // Balance Sheet Locked
    allow_stock_flow_audit: false,        // Stock Flow Audit Locked
    allow_master_export: false            // Master Export Locked
  },

  scale: {
    name: 'Scale Plan',
    // --- Ginti (Limits) ---
    max_items: 50000,           
    max_models: 10000,          
    max_customers: 50000,       
    max_suppliers: 5000,        
    max_staff: 4,               // Up to 4 Staff Accounts
    max_total_staff: 500,       
    max_counters: 10,           // Up to 10 Billing Counters
    always_show_badge: false,   
    badge_threshold: 0.8,       

    // --- Feature Flags (All Features Unlocked + FBR Included) ---
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
    allow_price_change_control: true,
    allow_wholesale_pricing: true,
    allow_customer_credit_limits: true,
    allow_stock_location: true,
    allow_balance_sheet: true,             // UNLOCKED for Scale
    allow_stock_flow_audit: true,         // UNLOCKED for Scale
    allow_master_export: true             // UNLOCKED for Scale
  }
};

export const getPlanLimits = (tier) => {
  const planKey = tier ? tier.toLowerCase() : 'free';
  return SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;
};