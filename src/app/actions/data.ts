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

// ---- TỐI ƯU HÓA: XIN GIẤY PHÉP (SIGNED URL) HÀNG LOẠT (BULK) ----
export async function getPhotos() {
  const supabase = await createClient();
  const { data } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  
  // Tối ưu: Xin giấy phép 1 lần duy nhất cho toàn bộ ảnh
  const paths = data.map(p => p.url);
  const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
  
  return data.map((p, i) => ({ ...p, publicUrl: urls?.[i]?.signedUrl || '' }));
}

export async function getSongs() {
  const supabase = await createClient();
  const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  
  const fileSongs = data.filter(s => !(s.url && s.url.startsWith('http')));
  const paths = fileSongs.map(s => s.url);
  
  let signedUrlsMap: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
    fileSongs.forEach((s, i) => { signedUrlsMap[s.url] = urls?.[i]?.signedUrl || ''; });
  }

  return data.map(s => {
    if (s.url && s.url.startsWith('http')) {
      return { ...s, publicUrl: s.url, isLink: true };
    }
    return { ...s, publicUrl: signedUrlsMap[s.url] || '', isLink: false };
  });
}

export async function getDocs() {
  const supabase = await createClient();
  const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  
  const fileDocs = data.filter(d => d.type !== 'link');
  const paths = fileDocs.map(d => d.url);
  
  let signedUrlsMap: Record<string, string> = {};
  if (paths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
    fileDocs.forEach((d, i) => { signedUrlsMap[d.url] = urls?.[i]?.signedUrl || ''; });
  }

  return data.map(d => {
    if (d.type === 'link') {
      return { ...d, publicUrl: d.url };
    }
    return { ...d, publicUrl: signedUrlsMap[d.url] || '' };
  });
}

// -----------------------------------------------------------

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

export async function updateDocCategory(docId: string, newCategory: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('documents').update({ category: newCategory }).eq('id', docId);
  if (error) throw new Error(error.message);
}

export async function updateProfileMetadata(name: string, avatarPath?: string) {
  const supabase = await createClient();
  const updates: any = { display_name: name };
  if (avatarPath) updates.avatar_url = avatarPath;
  const { error } = await supabase.auth.updateUser({ data: updates });
  if (error) throw new Error(error.message);
}

export async function getProfileData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let publicAvatarUrl = null;
  if (user.user_metadata?.avatar_url) {
    const { data } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(user.user_metadata.avatar_url, 60 * 60 * 24 * 7);
    publicAvatarUrl = data?.signedUrl;
  }
  return {
    email: user.email,
    name: user.user_metadata?.display_name || user.email?.split('@')[0],
    avatar: publicAvatarUrl
  };
}

// ---- API LỊCH HỌC TẬP (SCHEDULE) ----
export async function getSchedules() {
  const supabase = await createClient();
  const { data } = await supabase.from('study_schedules').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });
  return data || [];
}

export async function addSchedule(payload: any) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').insert([{ ...payload, user_id: user.id }]);
  if (error) throw new Error(error.message);
}

export async function updateScheduleStatus(id: string, is_completed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').update({ is_completed }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateSchedule(id: string, payload: any) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- API CHIA SẺ (SHARING) ----
export async function createShareLink(type: 'photo' | 'doc', itemId: string) {
  const user = await getUser();
  const supabase = await createClient();
  
  const { data: existing } = await supabase.from('shared_links').select('id').eq('item_type', type).eq('item_id', itemId).single();
  if (existing) return existing.id;
  
  const { data, error } = await supabase.from('shared_links').insert([{
    user_id: user.id,
    item_type: type,
    item_id: itemId
  }]).select('id').single();
  
  if (error) throw new Error(error.message);
  return data.id;
}

export async function getSharedItemInfo(shareId: string) {
  // Dùng quyền Admin để lấy dữ liệu cho khách (vì khách không có quyền RLS)
  const { data: link, error: linkErr } = await supabaseAdmin.from('shared_links').select('*').eq('id', shareId).single();
  if (linkErr || !link) throw new Error('Liên kết không tồn tại hoặc đã bị khóa.');

  let itemDetails = null;
  if (link.item_type === 'photo') {
    const { data } = await supabaseAdmin.from('photos').select('*').eq('id', link.item_id).single();
    itemDetails = data;
  } else if (link.item_type === 'doc') {
    const { data } = await supabaseAdmin.from('documents').select('*').eq('id', link.item_id).single();
    itemDetails = data;
  }

  if (!itemDetails) throw new Error('Tệp này đã bị chủ sở hữu xóa.');

  let publicUrl = itemDetails.url;
  if (itemDetails.url && !itemDetails.url.startsWith('http')) {
     const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(itemDetails.url, 60 * 60 * 24); 
     publicUrl = urlData?.signedUrl;
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(link.user_id);
  const ownerName = userData?.user?.user_metadata?.display_name || 'Một người dùng';
  let ownerAvatar = null;
  if (userData?.user?.user_metadata?.avatar_url) {
    const { data: avaData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(userData.user.user_metadata.avatar_url, 60 * 60 * 24);
    ownerAvatar = avaData?.signedUrl;
  }

  return { type: link.item_type, item: { ...itemDetails, publicUrl }, ownerName, ownerAvatar };
}
