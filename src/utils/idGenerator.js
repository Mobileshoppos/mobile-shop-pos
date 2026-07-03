import { supabase } from '../supabaseClient';
import { db } from '../db';

// 1. Device Letter (A, B, C... AA, AB...) lene ka function (Per-User Safe)
const getDeviceLetter = async () => {
  let letter = localStorage.getItem('pos_device_letter');
  if (letter) return letter;

  try {
    // A. Pehle check karein ke current user kon hai
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // B. Device ko register karein
    await supabase
      .from('device_registry')
      .insert([{ device_info: navigator.userAgent, user_id: user.id }]);

    // C. NAYA IZAFA: Global ID ke bajaye SIRF IS USER ke total devices ginein
    const { count, error } = await supabase
      .from('device_registry')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) throw error;

    // Agar user ka pehla device hai to 1, doosra hai to 2...
    let num = count || 1;
    let generatedLetter = '';
    
    // D. Excel-Style Infinite Letters Logic (1=A, 2=B... 27=AA)
    while (num > 0) {
      let rem = (num - 1) % 26;
      generatedLetter = String.fromCharCode(65 + rem) + generatedLetter;
      num = Math.floor((num - 1) / 26);
    }

    localStorage.setItem('pos_device_letter', generatedLetter);
    return generatedLetter;

  } catch (err) {
    console.error("Error getting Device ID from Server:", err);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }
};

// 2. Helper Function: Yeh check karega ke kya yeh number KISI BHI voucher mein istemal to nahi hua?
const isIdInUse = async (baseId) => {
  const [sales, pur, exp, cPay, sPay, cOut, sRef, adj] = await Promise.all([
    db.sales.where('invoice_id').equals(baseId).count(),
    db.purchases.where('invoice_id').equals(`PUR-${baseId}`).count(),
    db.expenses.where('voucher_no').equals(`EXP-${baseId}`).count(),
    // Customer payment mein RCPT aur RET dono ho sakte hain
    db.customer_payments.where('voucher_no').anyOf([`RCPT-${baseId}`, `RET-${baseId}`]).count(),
    db.supplier_payments.where('voucher_no').equals(`PAY-${baseId}`).count(),
    db.credit_payouts.where('voucher_no').equals(`PAY-${baseId}`).count(),
    db.supplier_refunds.where('voucher_no').equals(`RCPT-${baseId}`).count(),
    db.cash_adjustments.where('voucher_no').equals(`ADJ-${baseId}`).count()
  ]);
  
  // Agar kisi ek table mein bhi yeh number mil gaya, to iska matlab yeh istemal ho chuka hai (Clash)
  return (sales + pur + exp + cPay + sPay + cOut + sRef + adj) > 0;
};

// 3. Main Function: Naya Voucher Number Banana
export const generateInvoiceId = async () => {
  const letter = await getDeviceLetter(); 
  
  // A. LocalStorage se aakhri number nikalain, agar na ho to 1000 se shuru karein
  let lastNum = parseInt(localStorage.getItem('last_voucher_sequence')) || 1000;
  
  // --- BULLETPROOF LOGIC START ---
  // Agar cache clear hone ki wajah se lastNum wapis 1000 par aagaya hai, 
  // to hum check karenge ke kya A1001 pehle se mojood hai?
  const testId = `${letter}${lastNum + 1}`;
  const isClashing = await isIdInUse(testId);

  if (isClashing) {
    // Agar A1001 pehle se hai, to loop ko hang hone se bachane ke liye 
    // hum database se sab se bara number dhoond lenge.
    const allSales = await db.sales.toArray();
    let maxFound = lastNum;
    
    allSales.forEach(sale => {
      if (sale.invoice_id && sale.invoice_id.startsWith(letter)) {
        const numPart = parseInt(sale.invoice_id.replace(letter, ''));
        if (!isNaN(numPart) && numPart > maxFound) {
          maxFound = numPart;
        }
      }
    });
    
    // Seedha sab se bare number par jump kar jayen
    lastNum = maxFound; 
  }
  // --- BULLETPROOF LOGIC END ---

  let isUnique = false;
  let finalId = "";

  // B. Safety Loop (Naya number banayein aur tasdeeq karein)
  while (!isUnique) {
    lastNum += 1; 
    finalId = `${letter}${lastNum}`; 

    const exists = await isIdInUse(finalId);
    if (!exists) {
      isUnique = true;
    }
  }
  
  // C. Naye number ko hamesha ke liye save kar lein
  localStorage.setItem('last_voucher_sequence', lastNum.toString());
  
  return finalId; 
};