import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Khởi tạo client để toàn bộ dự án có thể gọi đến Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
