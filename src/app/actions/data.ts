"use server"
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'

// 1. Hàm kiểm tra bảo mật: Chỉ ai có mã PIN mới được chạy các lệnh bên dưới
async function checkAuth() {
  const cookieStore = await cookies()
  if (cookieStore.get('site_auth')?.value !== 'authenticated') {
    throw new Error('Từ chối truy cập: Bạn chưa nhập mã PIN hợp lệ.')
  }
}

// 2. Tạo link tải file tạm thời (Signed URL) cho Trình duyệt
export async function getUploadUrl(path: string) {
  await checkAuth();
  const { data, error } = await supabaseAdmin.storage.from('personal_files').createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// 3. Hàm lưu thông tin file vào CSDL
export async function addRecord(table: string, payload: any) {
  await checkAuth();
  const { error } = await supabaseAdmin.from(table).insert([payload]);
  if (error) throw new Error(error.message);
}

// 4. Hàm xóa file và xóa thông tin
export async function deleteRecord(table: string, id: string, path: string) {
  await checkAuth();
  await supabaseAdmin.storage.from('personal_files').remove([path]);
  await supabaseAdmin.from(table).delete().eq('id', id);
}

// 5. Các hàm lấy dữ liệu kèm link an toàn
async function generateSignedUrl(path: string) {
  // Vì bucket đã bị khóa, ta phải tạo link dùng 1 lần (có hạn 24h) để trình duyệt xem được
  const { data } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl || '';
}

export async function getPhotos() {
  await checkAuth();
  const { data } = await supabaseAdmin.from('photos').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (p) => ({ ...p, publicUrl: await generateSignedUrl(p.url) })));
}

export async function getSongs() {
  await checkAuth();
  const { data } = await supabaseAdmin.from('songs').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (s) => ({ ...s, publicUrl: await generateSignedUrl(s.url) })));
}

export async function getDocs() {
  await checkAuth();
  const { data } = await supabaseAdmin.from('documents').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (d) => ({ ...d, publicUrl: await generateSignedUrl(d.url) })));
}

export async function getDashboardStats() {
  await checkAuth();
  const [docsData, songsData, photosData] = await Promise.all([
    supabaseAdmin.from('documents').select('id', { count: 'exact' }),
    supabaseAdmin.from('songs').select('id', { count: 'exact' }),
    supabaseAdmin.from('photos').select('id', { count: 'exact' })
  ]);
  
  return {
    docs: docsData.count || 0,
    songs: songsData.count || 0,
    photos: photosData.count || 0
  };
}
