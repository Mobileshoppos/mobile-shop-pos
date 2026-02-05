-- Purane 4-parameters wale function ko rename kar rahe hain taake wo active na rahay
ALTER FUNCTION "public"."process_purchase_return"("p_purchase_id" "uuid", "p_return_items" "jsonb", "p_return_date" "date", "p_notes" "text") 
RENAME TO "old_v1_process_purchase_return";