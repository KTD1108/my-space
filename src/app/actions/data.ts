"use server"
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-server' // Vẫn giữ để tạo link tải xuống an toàn nếu cần, tuy nhiên dùng client là tốt nhất

// 1. Hàm gác cổng tự động lấy thông tin người dùng đang đăng nhập
async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Từ chối truy cập: Bạn chưa đăng nhập.')
  return user
}

// 2. Tạo link upload riêng cho Từng người dùng
export async function getUploadUrl(path: string) {
  const user = await getUser();
  // Bắt buộc đẩy file vào đúng thư mục có tên là Mã ID của người đó
  const fullPath = `${user.id}/${path}`;
  
  const supabase = await createClient();
  const { data, error } = await supabaseAdmin.storage.from('personal_files').createSignedUploadUrl(fullPath);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, fullPath };
}

// 3. Hàm lưu thông tin file (Tự động gán user_id)
export async function addRecord(table: string, payload: any) {
  const user = await getUser();
  const supabase = await createClient();
  // Khi insert, tự chèn thêm user_id vào
  const { error } = await supabase.from(table).insert([{ ...payload, user_id: user.id }]);
  if (error) throw new Error(error.message);
}

// 4. Hàm xóa file
export async function deleteRecord(table: string, id: string, path: string) {
  const supabase = await createClient();
  
  // Xóa vật lý
  await supabaseAdmin.storage.from('personal_files').remove([path]);
  
  // Xóa Database (RLS sẽ tự chặn nếu không phải file của user đó)
  await supabase.from(table).delete().eq('id', id);
}

// 5. Các hàm lấy dữ liệu (Supabase RLS sẽ TỰ ĐỘNG CHỈ TRẢ VỀ DATA CỦA NGƯỜI ĐĂNG NHẬP)
async function generateSignedUrl(path: string) {
  const { data } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl || '';
}

export async function getPhotos() {
  const supabase = await createClient();
  const { data } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (p) => ({ ...p, publicUrl: await generateSignedUrl(p.url) })));
}

export async function getSongs() {
  const supabase = await createClient();
  const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (s) => ({ ...s, publicUrl: await generateSignedUrl(s.url) })));
}

export async function getDocs() {
  const supabase = await createClient();
  const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (d) => ({ ...d, publicUrl: await generateSignedUrl(d.url) })));
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const [docsData, songsData, photosData] = await Promise.all([
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('songs').select('id', { count: 'exact', head: true }),
    supabase.from('photos').select('id', { count: 'exact', head: true })
  ]);
  
  return {
    docs: docsData.count || 0,
    songs: songsData.count || 0,
    photos: photosData.count || 0
  };
}
