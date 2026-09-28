import { createClient } from '@supabase/supabase-js';

// Khởi tạo client đặc quyền (Chỉ được chạy trên Server, tuyệt đối không dùng ở Client)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
