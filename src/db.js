import Dexie from 'dexie';

// Hum naya database bana rahe hain jiska naam 'MobileShopDB' hai
export const db = new Dexie('MobileShopDB');

// Yahan hum tables define kar rahe hain.
// Note: Hum sirf wohi columns likhte hain jin se hamein search ya filter karna ho.
// Baqi data khud ba khud save ho jata hai.

db.version(29).stores({
  // --- Business Data Tables (Jo Supabase se sync honge) ---
  
  // Products: ID, Category, Name aur Barcode se search karne ke liye
  products: 'id, local_id, category_id, name, barcode, user_id, is_active, updated_at', 
  
  // Categories
  categories: 'id, local_id, user_id, name, updated_at',
  
  // Customers: Phone number se dhoondne ke liye
  customers: 'id, local_id, phone, name, user_id, is_active, updated_at',
  
  // Suppliers
  suppliers: 'id, local_id, name, email, tax_id, city, country, bank_name, user_id, updated_at',
  
  // Purchases (Khareedari)
  purchases: 'id, local_id, invoice_id, supplier_id, purchase_date, user_id, updated_at',
  purchase_items: 'id, purchase_id, product_id', // Purchase ke andar kya items thay
  
  // Sales (Farokht)
  sales: 'id, local_id, invoice_id, customer_id, sale_date, user_id, payment_method, updated_at',
  sale_items: 'id, local_id, sale_id, product_id, product_name_snapshot',
  
  // Expenses (Akhrajat)
  expenses: 'id, local_id, category_id, expense_date, user_id, payment_method, updated_at',
  expense_categories: 'id, local_id, user_id',

  inventory: 'id, local_id, product_id, purchase_id, status, user_id, variant_id, imei, available_qty, sold_qty, updated_at', 
  customer_payments: 'id, local_id, customer_id, user_id, payment_method, updated_at',
  sale_returns: 'id, local_id, sale_id, customer_id, user_id, updated_at',
  sale_return_items: 'id, return_id, inventory_id',
  purchase_return_items: 'id, return_id, product_id',
  credit_payouts: 'id, local_id, customer_id, user_id, payment_method',
  category_attributes: 'id, category_id',
  supplier_payments: 'id, local_id, supplier_id, user_id, payment_method',
  product_variants: 'id, product_id, barcode',
  supplier_refunds: 'id, local_id, supplier_id, refund_date, user_id, payment_method',
  id_mappings: '++id, local_id, server_id, table_name',
  cash_adjustments: 'id, local_id, user_id, type, payment_method, created_at, transfer_to, updated_at',
  daily_closings: 'id, local_id, user_id, closing_date, created_at, updated_at',
  warranty_claims: 'id, local_id, user_id, inventory_id, customer_id, imei, status, updated_at',
  
  // --- Offline System Tables (Jo sirf Local rahenge) ---
  
  // Sync Queue: Jab internet na ho, to naya data yahan qatar (queue) mein lagega
  // ++id ka matlab hai number khud barhta rahega (1, 2, 3...)
  sync_queue: '++id, table_name, action, status, retry_count', 
  
  // Offline Session: User ka login data yahan save hoga taake offline mein bhi app khule
  offline_session: 'id', 
  
  // User Settings: Profile aur dukan ki settings
  user_settings: 'id' 
});