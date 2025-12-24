-- Hum 'gen_random_uuid()' istemal karenge jo built-in hota hai aur error nahi deta
CREATE TABLE IF NOT EXISTS cash_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL, -- 'In' (Paisa dala) ya 'Out' (Paisa nikala)
    payment_method TEXT NOT NULL, -- 'Cash' ya 'Bank'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE cash_adjustments ENABLE ROW LEVEL SECURITY;

-- Purani policy agar koi bani ho to delete karein (Safety)
DROP POLICY IF EXISTS "Users can manage their own cash adjustments" ON cash_adjustments;

CREATE POLICY "Users can manage their own cash adjustments" ON cash_adjustments
    FOR ALL USING (auth.uid() = user_id);