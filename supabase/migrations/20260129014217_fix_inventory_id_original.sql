-- purchase_return_items table mein inventory_id_original ko UUID mein badalna
ALTER TABLE "public"."purchase_return_items" 
ALTER COLUMN "inventory_id_original" TYPE uuid USING NULL;