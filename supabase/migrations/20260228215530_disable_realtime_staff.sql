-- Disable Realtime for staff_members to save costs and bandwidth
ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."staff_members";