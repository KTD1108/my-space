-- ========================================================
-- TỐI ƯU HÓA HIỆU NĂNG DATABASE POSTGRESQL (SUPABASE)
-- Tạo Composite Indexes cho RLS (Row Level Security) và Sắp xếp
-- ========================================================

-- 1. Bảng Documents: Tăng tốc truy vấn theo người dùng và thời gian
CREATE INDEX IF NOT EXISTS idx_documents_user_created 
ON documents (user_id, created_at DESC);

-- 2. Bảng Photos: Tăng tốc lọc album và lấy ảnh mới nhất
CREATE INDEX IF NOT EXISTS idx_photos_user_created 
ON photos (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photos_user_album 
ON photos (user_id, album);

-- 3. Bảng Songs: Tăng tốc lấy danh sách nhạc
CREATE INDEX IF NOT EXISTS idx_songs_user_created 
ON songs (user_id, created_at DESC);

-- 4. Bảng Study Schedules: Tăng tốc lọc theo ngày và thời gian bắt đầu
CREATE INDEX IF NOT EXISTS idx_study_schedules_user_date 
ON study_schedules (user_id, date ASC, start_time ASC);

-- 5. Bảng Shared Links: Tăng tốc tra cứu liên kết chia sẻ
CREATE INDEX IF NOT EXISTS idx_shared_links_type_item 
ON shared_links (item_type, item_id);

-- 6. Bảng Categories & Albums: Tăng tốc phân loại
CREATE INDEX IF NOT EXISTS idx_categories_user 
ON categories (user_id);

CREATE INDEX IF NOT EXISTS idx_albums_user 
ON albums (user_id);
