-- Insert default categories that are available to all users (user_id is NULL)
INSERT INTO public.categories (name) VALUES
('Smart Phones / Devices'),
('Protective Accessories'),
('Charging & Power'),
('Audio Accessories'),
('Wearable Tech'),
('Storage & Other Accessories'),
('Services & Repairs');

-- Insert default expense categories as well
INSERT INTO public.expense_categories (name) VALUES
('Marketing'),
('Other'),
('Rent'),
('Salaries'),
('Utilities');