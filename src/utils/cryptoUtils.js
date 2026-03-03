import { db } from '../db';
import { supabase } from '../supabaseClient';

const KEY_NAME = 'staff_permissions_key';

// Helper: Chabi ko text (JWK) mein badalne ke liye (Upload ke liye)
async function exportKey(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}

// Helper: Text (JWK) ko wapis Chabi mein badalne ke liye (Download ke baad)
async function importKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "AES-GCM", length: 256 },
    false, // non-extractable (Local DB mein save hone ke baad)
    ["encrypt", "decrypt"]
  );
}

// 1. Chabi nikalne, banane, ya Server se lanay ka function (THE MAIN FIX)
async function getOrCreateKey() {
    // A. Pehle Local DB check karein
    const existingKeyRecord = await db.secure_keys.get(KEY_NAME);
    if (existingKeyRecord && existingKeyRecord.key) {
        return existingKeyRecord.key; 
    }

    // B. Agar Local nahi mili, to Server (Supabase Profile) check karein
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('encryption_key')
                .eq('user_id', user.id)
                .single();

            // Agar Server par chabi mil gayi!
            if (profile && profile.encryption_key) {
                console.log("Restoring encryption key from Server...");
                const importedKey = await importKey(profile.encryption_key);
                // Local DB mein save kar lein taake baar baar server na jana pare
                await db.secure_keys.put({ id: KEY_NAME, key: importedKey });
                return importedKey;
            }
        }
    } catch (err) {
        console.error("Failed to fetch key from server:", err);
    }

    // C. Agar Server par bhi nahi mili (Bilkul nayi dukan), to Nayi Banayen
    console.log("Generating NEW encryption key...");
    const newKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true, // extractable=true (Sirf abhi ke liye taake hum isay server par bhej sakein)
        ["encrypt", "decrypt"]
    );

    // D. Nayi Chabi ko Server par Upload karein (Backup)
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const exportedKey = await exportKey(newKey);
            await supabase
                .from('profiles')
                .update({ encryption_key: exportedKey })
                .eq('user_id', user.id);
            console.log("New key backed up to Server.");
        }
    } catch (err) {
        console.error("Failed to backup key to server:", err);
    }

    // E. Local DB mein save karein
    await db.secure_keys.put({ id: KEY_NAME, key: newKey });
    
    return newKey;
}

// 2. Data ko Taala lagane (Encrypt) ka function
export async function encryptData(dataObject) {
    try {
        const key = await getOrCreateKey();
        const dataString = JSON.stringify(dataObject);
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(dataString);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encryptedBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedData
        );

        const encryptedArray = new Uint8Array(encryptedBuffer);
        const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
        combinedArray.set(iv, 0);
        combinedArray.set(encryptedArray, iv.length);

        return btoa(String.fromCharCode.apply(null, combinedArray));
    } catch (error) {
        console.error("Encryption failed:", error);
        return null;
    }
}

// 3. Taala kholne (Decrypt) ka function
export async function decryptData(encryptedBase64) {
    try {
        if (!encryptedBase64) return {}; 
        const key = await getOrCreateKey();

        const binaryString = atob(encryptedBase64);
        const combinedArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            combinedArray[i] = binaryString.charCodeAt(i);
        }

        const iv = combinedArray.slice(0, 12);
        const encryptedData = combinedArray.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer));
    } catch (error) {
        console.error("Decryption failed (Key mismatch or Tampering):", error);
        return {}; 
    }
}