-- 1. Bật lại chế độ Bảo vệ nghiêm ngặt (Row Level Security) cho toàn bộ Bảng
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- 2. Đóng cửa hoàn toàn Thùng chứa (Bucket)
UPDATE storage.buckets SET public = false WHERE id = 'personal_files';

-- 3. Xóa các quyền truy cập tự do lúc nãy
DROP POLICY IF EXISTS "Cho_Phep_Tai_Len" ON storage.objects;
DROP POLICY IF EXISTS "Cho_Phep_Xem" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;
