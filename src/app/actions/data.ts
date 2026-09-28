"use server"
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-server' 

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Từ chối truy cập: Bạn chưa đăng nhập.')
  return user
}

export async function getUploadUrl(path: string) {
  const user = await getUser();
  const fullPath = `${user.id}/${path}`;
  const supabase = await createClient();
  const { data, error } = await supabaseAdmin.storage.from('personal_files').createSignedUploadUrl(fullPath);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, fullPath };
}

export async function addRecord(table: string, payload: any) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert([{ ...payload, user_id: user.id }]);
  if (error) throw new Error(error.message);
}

export async function deleteRecord(table: string, id: string, path: string) {
  const supabase = await createClient();
  
  if (path && !path.startsWith('http')) {
    await supabaseAdmin.storage.from('personal_files').remove([path]);
  }
  
  await supabase.from(table).delete().eq('id', id);
}

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
  return Promise.all(data.map(async (s) => {
    if (s.url && s.url.startsWith('http')) {
      return { ...s, publicUrl: s.url, isLink: true };
    }
    return { ...s, publicUrl: await generateSignedUrl(s.url), isLink: false };
  }));
}

export async function getDocs() {
  const supabase = await createClient();
  const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (!data) return [];
  return Promise.all(data.map(async (d) => {
    if (d.type === 'link') {
      return { ...d, publicUrl: d.url };
    }
    return { ...d, publicUrl: await generateSignedUrl(d.url) };
  }));
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

// ---- API QUẢN LÝ CHỦ ĐỀ TÀI LIỆU ----
export async function getCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
  return data || [];
}

export async function addCategory(name: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from('categories').select('id').eq('name', name).eq('user_id', user.id);
  if (existing && existing.length > 0) throw new Error('Chủ đề này đã tồn tại!');
  
  const { error } = await supabase.from('categories').insert([{ name, user_id: user.id }]);
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string, name: string) {
  const supabase = await createClient();
  await supabase.from('documents').update({ category: 'Chung' }).eq('category', name);
  await supabase.from('categories').delete().eq('id', id);
}

// ---- API QUẢN LÝ ALBUM ẢNH ----
export async function getAlbums() {
  const supabase = await createClient();
  const { data } = await supabase.from('albums').select('*').order('created_at', { ascending: true });
  return data || [];
}

export async function addAlbum(name: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from('albums').select('id').eq('name', name).eq('user_id', user.id);
  if (existing && existing.length > 0) throw new Error('Album này đã tồn tại!');
  
  const { error } = await supabase.from('albums').insert([{ name, user_id: user.id }]);
  if (error) throw new Error(error.message);
}

export async function deleteAlbum(id: string, name: string) {
  const supabase = await createClient();
  await supabase.from('photos').update({ album: 'Chung' }).eq('album', name);
  await supabase.from('albums').delete().eq('id', id);
}

export async function movePhotoToAlbum(photoId: string, newAlbum: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('photos').update({ album: newAlbum }).eq('id', photoId);
  if (error) throw new Error(error.message);
}
