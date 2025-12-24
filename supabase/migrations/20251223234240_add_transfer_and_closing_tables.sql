-- 1. Cash Adjustments mein 'transfer_to' column add karein
ALTER TABLE cash_adjustments ADD COLUMN IF NOT EXISTS transfer_to TEXT;

-- 2. Daily Closings (Galla Milana) ki table banayein
CREATE TABLE IF NOT EXISTS daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    closing_date DATE DEFAULT CURRENT_DATE,
    expected_cash DECIMAL(12,2) NOT NULL, -- App ke mutabiq kitna hona chahiye
    actual_cash DECIMAL(12,2) NOT NULL,   -- User ne gin kar kitna likha
    difference DECIMAL(12,2) NOT NULL,    -- Dono ka farq
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own closings" ON daily_closings
    FOR ALL USING (auth.uid() = user_id);