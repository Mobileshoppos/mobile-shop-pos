import Dexie from 'dexie';

// Hum naya database bana rahe hain jiska naam 'MobileShopDB' hai
export const db = new Dexie('MobileShopDB');

// Yahan hum tables define kar rahe hain.
// Note: Hum sirf wohi columns likhte hain jin se hamein search ya filter karna ho.
// Baqi data khud ba khud save ho jata hai.

db.version(9).stores({
  // --- Business Data Tables (Jo Supabase se sync honge) ---
  
  // Products: ID, Category, Name aur Barcode se search karne ke liye
  products: 'id, category_id, name, barcode, user_id, is_active', 
  
  // Categories
  categories: 'id, user_id, name',
  
  // Customers: Phone number se dhoondne ke liye
  customers: 'id, phone, name, user_id',
  
  // Suppliers
  suppliers: 'id, name, user_id',
  
  // Purchases (Khareedari)
  purchases: 'id, supplier_id, purchase_date, user_id',
  purchase_items: 'id, purchase_id, product_id', // Purchase ke andar kya items thay
  
  // Sales (Farokht)
  sales: 'id, customer_id, sale_date, user_id',
  sale_items: 'id, sale_id, product_id, product_name_snapshot',  // Sale ke andar kya items thay
  
  // Expenses (Akhrajat)
  expenses: 'id, category_id, expense_date, user_id',
  expense_categories: 'id, user_id',

  inventory: 'id, product_id, purchase_id, status, user_id, variant_id, imei', 
  customer_payments: 'id, customer_id, user_id',
  sale_returns: 'id, sale_id, customer_id, user_id',
  sale_return_items: 'id, return_id, inventory_id',
  purchase_return_items: 'id, return_id, product_id',
  credit_payouts: 'id, customer_id, user_id',
  category_attributes: 'id, category_id',
  supplier_payments: 'id, supplier_id, user_id',
  product_variants: 'id, product_id, barcode',
  
  // --- Offline System Tables (Jo sirf Local rahenge) ---
  
  // Sync Queue: Jab internet na ho, to naya data yahan qatar (queue) mein lagega
  // ++id ka matlab hai number khud barhta rahega (1, 2, 3...)
  sync_queue: '++id, table_name, action, status', 
  
  // Offline Session: User ka login data yahan save hoga taake offline mein bhi app khule
  offline_session: 'id', 
  
  // User Settings: Profile aur dukan ki settings
  user_settings: 'id' 
});