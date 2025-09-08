// src/DataService.js (Updated Code)

import { supabase } from './supabaseClient';

const DataService = {

  /**
   * Fetches all necessary data for the inventory page.
   * This includes products with their stock quantity and user-specific categories.
   */
  async getInventoryData() {
    // Fetch products with quantity using the view
    const { data: productsData, error: productsError } = await supabase
      .from('products_with_quantity')
      .select('*, categories(name)')
      .order('name', { ascending: true });

    if (productsError) {
      console.error('DataService Error: Could not fetch products.', productsError);
      throw productsError; // The component's try/catch will handle this
    }

    // Fetch user categories using the RPC function
    const { data: categoriesData, error: categoriesError } = await supabase
      .rpc('get_user_categories_with_settings');
      
    if (categoriesError) {
      console.error('DataService Error: Could not fetch categories.', categoriesError);
      throw categoriesError; // The component's try/catch will handle this
    }
    
    // Return both sets of data together
    return { productsData, categoriesData };
  },

  /**
   * Adds a single new product model to the 'products' table.
   * @param {Object} productData - The product object to insert.
   */
  async addProduct(productData) {
    const { error } = await supabase
      .from('products')
      .insert([productData]); // .insert() expects an array of objects

    if (error) {
      console.error('DataService Error: Could not add product.', error);
      throw error;
    }
    // For this operation, we don't need to return the data, just confirm success.
    return true;
  },

  /**
   * Adds a batch of new stock entries to the 'inventory' table.
   * @param {Array<Object>} stockEntries - An array of stock entry objects.
   */
  async addBulkStock(stockEntries) {
    const { error } = await supabase
      .from('inventory')
      .insert(stockEntries);

    if (error) {
      console.error('DataService Error: Could not add bulk stock.', error);
      throw error;
    }
    return true;
  },

};

export default DataService;