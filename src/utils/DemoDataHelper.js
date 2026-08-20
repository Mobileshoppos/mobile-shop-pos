import { db } from '../db';
import { supabase } from '../supabaseClient';

// --- TAMAM BUSINESSES KE DEMO PRODUCTS (NON-SERIAL / 1-CLICK POS COMPATIBLE) ---
const BUSINESS_DEMO_CATALOG = {
  'Mobile Shop': {
    category: 'Mobile Accessories & Gadgets',
    products: [
      { name: 'Fast Charging Type-C Data Cable', brand: 'Anker', price: 1200, cost: 650 },
      { name: 'Wireless Bluetooth TWS Earbuds', brand: 'Audionic', price: 3800, cost: 2400 }
    ]
  },
  'Crockery': {
    category: 'Dining & Kitchenware',
    products: [
      { name: 'Glass Water Set (Jug + 6 Glasses)', brand: 'Toyo Glass', price: 2800, cost: 1800 },
      { name: 'Non-Stick Cooking Frying Pan 24cm', brand: 'Prestige', price: 2200, cost: 1400 }
    ]
  },
  'Grocery & Minimart': {
    category: 'Daily Grocery & Staples',
    products: [
      { name: 'Super Basmati Rice (5 Kg Pack)', brand: 'Guard', price: 2400, cost: 1950 },
      { name: 'Pure Cooking Oil Pouch 1 Litre', brand: 'Dalda', price: 580, cost: 510 }
    ]
  },
  'Pharmacy & Medical': {
    category: 'General Medicines & OTC',
    products: [
      { name: 'Panadol Extra Tablets (Pack of 100)', brand: 'GSK', price: 480, cost: 410 },
      { name: 'First Aid Antiseptic Liquid 250ml', brand: 'Dettol', price: 350, cost: 280 }
    ]
  },
  'Garments & Boutique': {
    category: 'Casual & Formal Wear',
    products: [
      { name: 'Men Cotton Casual Polo T-Shirt', brand: 'Outfitters', price: 2200, cost: 1300 },
      { name: 'Denim Jeans Regular Fit (Blue)', brand: 'Levis', price: 3500, cost: 2200 }
    ]
  },
  'Footwear & Shoes': {
    category: 'Men & Women Footwear',
    products: [
      { name: 'Lightweight Running Sports Sneakers', brand: 'Service', price: 3200, cost: 2000 },
      { name: 'Men Leather Casual Loafers', brand: 'Bata', price: 4200, cost: 2700 }
    ]
  },
  'Hardware & Sanitary': {
    category: 'Sanitary Fittings & Hardware',
    products: [
      { name: 'Stainless Steel Basin Mixer Tap', brand: 'Master', price: 4500, cost: 3100 },
      { name: 'Energy Saver LED Ceiling Light 18W', brand: 'Philips', price: 850, cost: 580 }
    ]
  },
  'Cosmetics & Beauty': {
    category: 'Skin Care & Cosmetics',
    products: [
      { name: 'Hydrating Daily Face Wash 150ml', brand: 'CeraVe', price: 2400, cost: 1650 },
      { name: 'Velvet Matte Long Lasting Lipstick', brand: 'Maybelline', price: 1600, cost: 1050 }
    ]
  },
  'Auto Parts & Accessories': {
    category: 'Car Maintenance & Lubricants',
    products: [
      { name: 'Fully Synthetic Engine Oil 4L (5W-30)', brand: 'Total', price: 6800, cost: 5400 },
      { name: 'Universal Car Wiper Blades (Pair)', brand: 'Bosch', price: 1400, cost: 850 }
    ]
  },
  'Power Tools & Machinery': {
    category: 'Hand & Power Tools',
    products: [
      { name: 'Impact Drill Machine 13mm 650W', brand: 'Bosch', price: 7800, cost: 5900 },
      { name: 'Heavy Duty Screwdriver Set (6 Pcs)', brand: 'Stanley', price: 1800, cost: 1150 }
    ]
  },
  'Books & Stationery': {
    category: 'Office & School Stationery',
    products: [
      { name: 'Hardcover Spiral Notebook A4 (200 Pgs)', brand: 'Oxford', price: 380, cost: 240 },
      { name: 'Smooth Ballpoint Pen Box (10 Pcs)', brand: 'Piano', price: 260, cost: 170 }
    ]
  },
  'Toys & Games': {
    category: 'Children Toys & Board Games',
    products: [
      { name: 'Creative Building Blocks Set (100 Pcs)', brand: 'Lego', price: 2900, cost: 1850 },
      { name: 'Classic Family Board Game Set', brand: 'Monopoly', price: 1600, cost: 1050 }
    ]
  },
  'Sports & Outdoors': {
    category: 'Fitness & Sports Gear',
    products: [
      { name: 'Kashmir Willow Hard Ball Cricket Bat', brand: 'CA Plus', price: 4200, cost: 2800 },
      { name: 'Anti-Slip Gym & Yoga Exercise Mat', brand: 'Reebok', price: 2500, cost: 1600 }
    ]
  },
  'Furniture & Home Decor': {
    category: 'Home Furnishing & Decor',
    products: [
      { name: 'Ergonomic Mesh Office Desk Chair', brand: 'Interwood', price: 13500, cost: 9200 },
      { name: 'Pure Cotton Double Bed Sheet Set', brand: 'ChenOne', price: 3800, cost: 2400 }
    ]
  },
  'Jewelry & Watches': {
    category: 'Fashion Watches & Jewelry',
    products: [
      { name: 'Classic Quartz Leather Strap Watch', brand: 'Casio', price: 6800, cost: 4400 },
      { name: 'Gold Plated Zircon Bangle Set', brand: 'Royal Gems', price: 3200, cost: 1900 }
    ]
  },
  'Pet Supplies': {
    category: 'Pet Nutrition & Food',
    products: [
      { name: 'Complete Dry Cat Food Pack 1.5 Kg', brand: 'Whiskas', price: 1950, cost: 1450 },
      { name: 'Adjustable Dog Harness Leash Set', brand: 'PetCare', price: 1300, cost: 800 }
    ]
  }
};

export const DemoDataHelper = {
  
  // 1. Demo Data Insert Karne Ka Function (Business Type ke hisaab se)
  async injectDemoData(userId, currency = 'Rs', businessType = 'Mobile Shop') {
    try {
      const now = new Date().toISOString();
      const defaultWarehouse = await db.warehouses.filter(w => w.is_default === true).first();
      const warehouseId = defaultWarehouse ? defaultWarehouse.id : null;

      // Default Register & Session dhoondein taake Cash drawer mein paisa foran show ho
      const defaultRegister = await db.registers.where('user_id').equals(userId).first() || await db.registers.first();
      const defaultSession = defaultRegister ? await db.register_sessions.where('register_id').equals(defaultRegister.id).first() : null;

      // Select demo catalog based on user's chosen business
      const demoConfig = BUSINESS_DEMO_CATALOG[businessType] || BUSINESS_DEMO_CATALOG['Mobile Shop'];

      // A. Create Demo Category (is_imei_based: FALSE taake popup na aaye!)
      const categoryId = crypto.randomUUID();
      const demoCategory = {
        id: categoryId,
        local_id: categoryId,
        name: demoConfig.category,
        is_imei_based: false, // Non-Serial (Bulk item)
        user_id: userId,
        updated_at: now
      };
      await db.categories.add(demoCategory);
      await db.sync_queue.add({ table_name: 'categories', action: 'create', data: demoCategory });

      // B. Create Demo Products & Non-Serial Stock (Quantity: 15-20 each)
      const createdProducts = [];
      for (const prod of demoConfig.products) {
        const prodId = crypto.randomUUID();
        const productData = {
          id: prodId,
          local_id: prodId,
          category_id: categoryId,
          name: prod.name,
          brand: prod.brand,
          purchase_price: prod.cost,
          sale_price: prod.price,
          user_id: userId,
          is_active: true,
          updated_at: now,
          is_dummy: true
        };
        await db.products.add(productData);
        await db.sync_queue.add({ table_name: 'products', action: 'create', data: productData });

        // C. Create Bulk Inventory Item (Direct 1-Click Sale Compatible)
        const invId = crypto.randomUUID();
        const initialStockQty = 15; // 15 items in stock
        
        // Local DB mein 1 sold karke 14 available dikhayenge
        const invItemLocal = {
          id: invId,
          local_id: invId,
          product_id: prodId,
          purchase_price: prod.cost,
          sale_price: prod.price,
          quantity: initialStockQty,
          available_qty: initialStockQty,
          sold_qty: 0,
          status: 'Available',
          user_id: userId,
          imei: null, // Non-serial (no IMEI)
          item_attributes: {},
          warehouse_id: warehouseId,
          is_dummy: true,
          updated_at: now
        };
        await db.inventory.add(invItemLocal);

        // Cloud sync queue
        await db.sync_queue.add({ table_name: 'inventory', action: 'create', data: invItemLocal });

        createdProducts.push({ ...productData, invId: invId });
      }

      // D. Create a Demo Customer
      const customerId = crypto.randomUUID();
      const demoCustomer = {
        id: customerId,
        local_id: customerId,
        name: 'Walk-in Customer (Demo)',
        phone_number: '0000000000',
        address: 'Market / Walk-in',
        balance: 0,
        user_id: userId,
        is_active: true,
        updated_at: now,
        is_dummy: true
      };
      await db.customers.add(demoCustomer);
      await db.sync_queue.add({ table_name: 'customers', action: 'create', data: demoCustomer });

      // E. Create 1 Completed Demo Sale on First Product (Taake Dashboard Stats & Cash active hon)
      const saleId = crypto.randomUUID();
      const invoiceId = Math.floor(10000 + Math.random() * 90000); 
      const soldItem = createdProducts[0]; 

      // Pehle product ka stock local DB mein 1 minus karein (15 -> 14)
      await db.inventory.update(soldItem.invId, {
        available_qty: 14,
        sold_qty: 1
      });

      const saleData = {
        id: saleId,
        local_id: saleId,
        invoice_id: `DEMO-${invoiceId}`,
        customer_id: customerId,
        subtotal: soldItem.sale_price,
        discount: 0,
        tax_amount: 0,
        total_amount: soldItem.sale_price,
        amount_paid_at_sale: soldItem.sale_price,
        payment_status: 'Paid',
        payment_method: 'Cash',
        user_id: userId,
        register_id: defaultRegister ? defaultRegister.id : null,
        session_id: defaultSession ? defaultSession.id : null,
        created_at: now,
        updated_at: now,
        is_dummy: true
      };

      const saleItemData = {
        id: crypto.randomUUID(),
        local_id: crypto.randomUUID(),
        sale_id: saleId,
        inventory_id: soldItem.invId,
        product_id: soldItem.id,
        product_name_snapshot: soldItem.name,
        quantity: 1,
        price_at_sale: soldItem.sale_price,
        purchase_price: soldItem.purchase_price,
        user_id: userId,
        is_dummy: true
      };

      await db.sales.add(saleData);
      await db.sale_items.add(saleItemData);
      await db.sync_queue.add({ 
        table_name: 'sales', 
        action: 'create_full_sale', 
        data: { 
          sale: saleData, 
          items: [saleItemData], 
          inventory_ids: [{ id: soldItem.invId, qtySold: 1 }] 
        } 
      });

      return true;
    } catch (error) {
      console.error("Demo Data Injection Error:", error);
      throw error;
    }
  },

  // 2. Demo Data Delete Karne Ka Function (Smart & Comprehensive)
  async removeDemoData() {
    try {
      // A. Supabase Cloud se delete karein
      const { error } = await supabase.rpc('clear_dummy_data');
      if (error) console.error("Supabase clear error:", error);

      // B. Local DB mein Demo Products dhoondein
      const demoProducts = await db.products.filter(x => x.is_dummy === true || x.name?.includes('Demo')).toArray();
      const demoProductIds = new Set(demoProducts.map(p => p.id));

      // C. Wo tamam Sale Items dhoondein jo Demo Products ke thay (chahe user ne khud A1001 sale ki ho)
      const demoSaleItems = await db.sale_items.filter(si => demoProductIds.has(si.product_id) || si.is_dummy === true).toArray();
      const testSaleIds = new Set(demoSaleItems.map(si => si.sale_id));

      // D. Wo sales bhi shamil karein jo DEMO- invoice wali thin
      const allDemoSales = await db.sales.filter(s => s.is_dummy === true || s.invoice_id?.startsWith('DEMO-') || testSaleIds.has(s.id)).toArray();
      const allSaleIdsToDelete = new Set(allDemoSales.map(s => s.id));

      // E. Local Database (Dexie) se mukammal safai (User ki ki hui A1001 test sale bhi delete hogi)
      await db.sale_items.filter(x => x.is_dummy === true || allSaleIdsToDelete.has(x.sale_id) || demoProductIds.has(x.product_id)).delete();
      await db.sales.filter(x => allSaleIdsToDelete.has(x.id)).delete();
      await db.inventory.filter(x => x.is_dummy === true || demoProductIds.has(x.product_id) || x.imei?.startsWith('DEMO-')).delete();
      await db.product_variants.filter(x => x.is_dummy === true || demoProductIds.has(x.product_id)).delete();
      await db.products.filter(x => demoProductIds.has(x.id)).delete();
      await db.purchases.filter(x => x.is_dummy === true).delete();
      await db.suppliers.filter(x => x.is_dummy === true).delete();
      await db.categories.filter(x => x.is_dummy === true || x.name?.includes('Demo')).delete();
      await db.customers.filter(x => x.is_dummy === true || x.name?.includes('(Demo)')).delete();

      // F. Sync Queue se bhi saaf karein
      await db.sync_queue.filter(item => {
        const d = item.data;
        if (!d) return false;
        const saleId = d.id || d.sale?.id;
        const prodId = d.id || d.product_id;
        return d.is_dummy === true || 
               d.sale?.is_dummy === true || 
               d.invoice_id?.startsWith('DEMO-') || 
               d.name?.includes('(Demo)') || 
               d.name?.includes('Demo') ||
               allSaleIdsToDelete.has(saleId) ||
               demoProductIds.has(prodId);
      }).delete();

      // G. Live UI refresh signal
      window.dispatchEvent(new CustomEvent('local-db-updated'));

      return true;
    } catch (error) {
      console.error("Demo Data Deletion Error:", error);
      throw error;
    }
  }
};