-- 1. Inventory aur Products ka Rishta (Hifazat ka Izafa)
-- Pehle purana CASCADE wala qanoon hatayenge
ALTER TABLE "public"."inventory" DROP CONSTRAINT IF EXISTS "inventory_product_id_fkey";
-- Phir wahi qanoon RESTRICT ke saath dobara lagayenge
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_product_id_fkey" 
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;


-- 2. Sale Items aur Sales ka Rishta (History Mehfooz karne ke liye)
-- Pehle purana CASCADE wala qanoon hatayenge
ALTER TABLE "public"."sale_items" DROP CONSTRAINT IF EXISTS "sale_items_sale_id_fkey";
-- Phir wahi qanoon RESTRICT ke saath dobara lagayenge
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" 
FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE RESTRICT;


-- 3. Purchase Items aur Purchases ka Rishta (Record Permanent karne ke liye)
-- Pehle purana CASCADE wala qanoon hatayenge
ALTER TABLE "public"."purchase_items" DROP CONSTRAINT IF EXISTS "purchase_items_purchase_id_fkey";
-- Phir wahi qanoon RESTRICT ke saath dobara lagayenge
ALTER TABLE "public"."purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" 
FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE RESTRICT;