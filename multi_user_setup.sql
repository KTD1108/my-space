-- 1. Xóa dữ liệu cũ (không thuộc về ai) để tránh lỗi
TRUNCATE TABLE documents, songs, photos CASCADE;

-- 2. Thêm cột user_id (Bắt buộc) vào tất cả các bảng. Cột này liên kết với hệ thống Đăng nhập của Supabase
ALTER TABLE documents ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
ALTER TABLE songs ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;
ALTER TABLE photos ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;

-- 3. Xóa các quyền cũ
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

DROP POLICY IF EXISTS "Users can view own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;

DROP POLICY IF EXISTS "Users can view own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;

-- 4. Bật RLS và thiết lập quyền mới: TÀI KHOẢN NÀO CHỈ ĐƯỢC THAO TÁC TRÊN DỮ LIỆU CỦA NGƯỜI ĐÓ
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own songs" ON songs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own songs" ON songs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own songs" ON songs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own photos" ON photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own photos" ON photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON photos FOR DELETE USING (auth.uid() = user_id);

-- 5. Thiết lập quyền cho ổ đĩa Storage: File của ai người nấy giữ (dựa vào thư mục có tên là ID của họ)
DROP POLICY IF EXISTS "Cho_Phep_Tai_Len" ON storage.objects;
DROP POLICY IF EXISTS "Cho_Phep_Xem" ON storage.objects;

CREATE POLICY "Users can upload their own files" 
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'personal_files' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Users can view their own files" 
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'personal_files' AND (storage.foldername(name))[1] = auth.uid()::text );

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'personal_files' AND (storage.foldername(name))[1] = auth.uid()::text );
