// --- IMPORTANT REMINDER / ZAROORI HIDAYAT ---
// Agar aap yahan koi bhi limit change karte hain (maslan Max Items 50 se 100 karte hain),
// to aapko Database (Supabase) mein mojood SQL Functions ko bhi update karna hoga.
// React sirf User ko rokta hai, lekin Database asal Security Guard hai.
// Dono jagah limits same honi chahiye.
// ---------------------------------------------

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    max_items: 50,       
    max_staff: 0,        
    allow_reports: false, 
    allow_backup: false,
    // --- Naye Feature Flags ---
    allow_custom_categories: false,   // Categories & Expenses
    allow_customer_management: false, // Add Customer
    allow_supplier_management: false, // Add Supplier
    allow_warranty_system: false,     // Warranty Page & Settings
    allow_advanced_settings: true    // QR, Discount, Threshold
  },
  growth: {
    name: 'Growth Plan',
    max_items: 500,      
    max_staff: 1,        
    allow_reports: true,
    allow_backup: true,
    // --- Naye Feature Flags ---
    allow_custom_categories: true,
    allow_customer_management: true,
    allow_supplier_management: true,
    allow_warranty_system: false,     // Warranty sirf Pro mein hai
    allow_advanced_settings: true
  },
  pro: {
    name: 'Pro Plan',
    max_items: 1000000,  
    max_staff: 3,        
    allow_reports: true,
    allow_backup: true,
    // --- Naye Feature Flags ---
    allow_custom_categories: true,
    allow_customer_management: true,
    allow_supplier_management: true,
    allow_warranty_system: true,
    allow_advanced_settings: true
  }
};

export const getPlanLimits = (tier) => {
  const planKey = tier ? tier.toLowerCase() : 'free';
  return SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.free;
};