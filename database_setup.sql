-- 1. Bảng lưu trữ danh sách Tài liệu
CREATE TABLE documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng lưu trữ danh sách Nhạc
CREATE TABLE songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text DEFAULT 'Ẩn danh',
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Bảng lưu trữ danh sách Ảnh
CREATE TABLE photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
