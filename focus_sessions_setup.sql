-- ========================================================
-- BẢNG LƯU TRỮ LỊCH SỬ PHIÊN HỌC TẬP TRUNG (FOCUS POMODORO)
-- ========================================================

CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 25,
  goal text,
  completed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật Row Level Security (RLS)
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Thiết lập quyền truy cập cho từng người dùng
DROP POLICY IF EXISTS "Users can view own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete own focus sessions" ON focus_sessions;

CREATE POLICY "Users can view own focus sessions" ON focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own focus sessions" ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own focus sessions" ON focus_sessions FOR DELETE USING (auth.uid() = user_id);

-- Composite Index phục vụ truy vấn thống kê theo ngày và người dùng
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_completed 
ON focus_sessions (user_id, completed_at DESC);
