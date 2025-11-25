import { supabase } from '../supabaseClient';

// Yeh function Device ID layega (Local ya Server se)
export const getDeviceId = async () => {
  // 1. Pehle Local Storage check karein (Offline support ke liye)
  let deviceId = localStorage.getItem('pos_device_id');
  
  // Agar ID pehle se hai, to wohi wapis karein
  if (deviceId) {
    return parseInt(deviceId);
  }

  // 2. Agar ID nahi hai (New Device ya Cache Cleared), to Server se maangein
  try {
    // Iske liye internet zaroori hai.
    // Usually jab cache clear hota hai to banda logout hota hai, to login ke liye net chahiye hi hota hai.
    const { data, error } = await supabase
      .from('device_registry')
      .insert([{ device_info: navigator.userAgent }]) // Browser ki info bhej dein
      .select()
      .single();

    if (error) throw error;

    // 3. Naya ID mil gaya (e.g., 5)
    let newId = data.id;
    
    // Agar ID 99 se bara ho jaye, to hum usay chota kar lenge (Loop)
    // Taake hamare 6 digits ka formula kharab na ho
    if (newId > 99) {
        newId = newId % 100; // e.g. 105 ban jayega 05
        if (newId === 0) newId = 1;
    }
    
    // Local Storage mein save karein
    localStorage.setItem('pos_device_id', newId);
    return newId;

  } catch (err) {
    console.error("Error getting Device ID:", err);
    // Agar Internet nahi hai aur ID bhi nahi hai (Bohot rare case), 
    // to majboori mein Random ID lein (10-99 range mein)
    const tempId = Math.floor(Math.random() * 90) + 10;
    return tempId;
  }
};

// Yeh function 6 digit ka unique ID banayega
export const generateInvoiceId = async (db) => {
  // Device ID hasil karein
  const deviceId = await getDeviceId();
  
  let isUnique = false;
  let newId;

  // Loop chalayein jab tak unique ID na mil jaye
  while (!isUnique) {
    let randomPart;
    
    // Logic: Total 6 Digits maintain karne hain
    if (deviceId < 10) {
        // Device ID 1 digit (e.g., 5) -> Random 10000-99999
        // Result: 512345
        randomPart = Math.floor(10000 + Math.random() * 90000);
    } else {
        // Device ID 2 digits (e.g., 12) -> Random 1000-9999
        // Result: 123456
        randomPart = Math.floor(1000 + Math.random() * 9000);
    }
    
    // Combine karein
    newId = Number(`${deviceId}${randomPart}`);

    // Local DB check (Double safety)
    const existing = await db.sales.get(newId);
    if (!existing) {
      isUnique = true;
    }
  }
  
  return newId;
};