import { supabase } from '../supabaseClient';
import { db } from '../db';

// 1. Yeh function Server se Unique Device ID layega aur usay Letter (A-Z) mein badal dega
const getDeviceLetter = async () => {
  // A. Pehle Local Storage check karein (Agar pehle se assigned hai)
  let letter = localStorage.getItem('pos_device_letter');
  if (letter) return letter;

  // B. Agar nahi hai, to Server (Supabase) se maangein
  try {
    // Hum wahi purana table 'device_registry' use kar rahe hain
    const { data, error } = await supabase
      .from('device_registry')
      .insert([{ device_info: navigator.userAgent }]) 
      .select()
      .single();

    if (error) throw error;

    // Server ne ID diya (e.g., 1, 2, 3...)
    const serverId = data.id;

    // C. Number ko Letter banayen (Algorithm)
    // 1 -> A, 2 -> B, ... 26 -> Z, 27 -> A (Loop)
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    // (serverId - 1) is liye kiya taake ID 1 ka index 0 bane (yani 'A')
    const letterIndex = (serverId - 1) % 26; 
    letter = alphabet[letterIndex];

    // D. Hamesha ke liye save kar lein
    localStorage.setItem('pos_device_letter', letter);
    return letter;

  } catch (err) {
    console.error("Error getting Device ID from Server:", err);
    
    // E. FALLBACK (Sirf tab jab pehli baar install karte waqt Internet na ho)
    // Majboori mein random uthana parega, lekin yeh bohot rare case hai.
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
    return randomLetter;
  }
};

// 2. Yeh function poora Invoice ID banayega (e.g., A-4921)
export const generateInvoiceId = async () => {
  // Ab yeh function async hai kyunke yeh server call kar sakta hai
  const letter = await getDeviceLetter(); 
  
  let isUnique = false;
  let finalId = "";

  // Jab tak unique ID na mil jaye
  while (!isUnique) {
    // 4 digits ka random number (1000 se 9999 tak)
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    // Format: "A-4521"
    finalId = `${letter}-${randomNum}`;

    // Local DB mein check karein
    const existing = await db.sales.where('invoice_id').equals(finalId).first();
    
    if (!existing) {
      isUnique = true;
    }
  }
  
  return finalId;
};