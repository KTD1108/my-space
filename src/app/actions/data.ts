"use server"
import { createClient } from '@/utils/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-server' 

// Bộ nhớ đệm In-Memory lưu trữ các Signed URL hợp lệ (TTL mặc định đến 12h)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

// Bộ nhớ đệm In-Memory cho Dashboard (giúp chuyển trang và revalidate trong 0ms)
const homeDashboardCache = new Map<string, { data: any; expiresAt: number }>();

function invalidateUserDashboardCache(userId?: string) {
  if (userId) homeDashboardCache.delete(userId);
  else homeDashboardCache.clear();
}

export async function getCachedSignedUrl(path: string, expiresInSec: number = 86400): Promise<string> {
  if (!path || path.startsWith('http')) return path || '';
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.url;
  }
  const { data, error } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(path, expiresInSec);
  if (error || !data?.signedUrl) return '';
  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + expiresInSec * 1000 });
  return data.signedUrl;
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Từ chối truy cập: Bạn chưa đăng nhập.')
  return user
}

export async function getUploadUrl(path: string) {
  const user = await getUser();
  const fullPath = `${user.id}/${path}`;
  const { data, error } = await supabaseAdmin.storage.from('personal_files').createSignedUploadUrl(fullPath);
  if (error) throw new Error(error.message);
  return { signedUrl: data.signedUrl, fullPath };
}

export async function addRecord(table: string, payload: Record<string, unknown>) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert([{ ...payload, user_id: user.id }]);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache(user.id);
}

export async function deleteRecord(table: string, id: string, path: string) {
  const user = await getUser();
  const supabase = await createClient();
  const { error: dbError } = await supabase.from(table).delete().eq('id', id);
  if (dbError) throw new Error(`Lỗi xóa bản ghi: ${dbError.message}`);
  invalidateUserDashboardCache(user.id);

  if (path && !path.startsWith('http')) {
    signedUrlCache.delete(path);
    const { error: storageError } = await supabaseAdmin.storage.from('personal_files').remove([path]);
    if (storageError) {
      console.warn(`[Storage] Cảnh báo xóa file ${path}:`, storageError.message);
    }
  }
}

// Lấy 1 ảnh mới nhất phục vụ Dashboard nhanh nhất (chỉ tải 1 bản ghi và 1 signed URL)
export async function getRecentPhoto(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('photos').select('url').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!data?.url) return null;
  return getCachedSignedUrl(data.url);
}

// ---- TỐI ƯU HÓA: XIN GIẤY PHÉP (SIGNED URL) HÀNG LOẠT VỚI BỘ NHỚ ĐỆM ----
export async function getPhotos() {
  const supabase = await createClient();
  const { data } = await supabase.from('photos').select('*').order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  
  // Tận dụng cache trước, chỉ xin cấp phép cho những ảnh chưa có trong cache
  const uncachedPaths: string[] = [];
  const resultMap: Record<string, string> = {};

  for (const p of data) {
    const cached = signedUrlCache.get(p.url);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      resultMap[p.url] = cached.url;
    } else {
      uncachedPaths.push(p.url);
    }
  }

  if (uncachedPaths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(uncachedPaths, 60 * 60 * 24);
    uncachedPaths.forEach((path, i) => {
      const signedUrl = urls?.[i]?.signedUrl || '';
      if (signedUrl) {
        signedUrlCache.set(path, { url: signedUrl, expiresAt: Date.now() + 86400 * 1000 });
        resultMap[path] = signedUrl;
      }
    });
  }
  
  return data.map(p => ({ ...p, publicUrl: resultMap[p.url] || '' }));
}

export async function getSongs() {
  const supabase = await createClient();
  const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
  if (!data || data.length === 0) return [];
  
  const fileSongs = data.filter(s => !(s.url && s.url.startsWith('http')));
  const uncachedPaths: string[] = [];
  const signedUrlsMap: Record<string, string> = {};

  for (const s of fileSongs) {
    const cached = signedUrlCache.get(s.url);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      signedUrlsMap[s.url] = cached.url;
    } else {
      uncachedPaths.push(s.url);
    }
  }

  if (uncachedPaths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(uncachedPaths, 60 * 60 * 24);
    uncachedPaths.forEach((path, i) => {
      const signedUrl = urls?.[i]?.signedUrl || '';
      if (signedUrl) {
        signedUrlCache.set(path, { url: signedUrl, expiresAt: Date.now() + 86400 * 1000 });
        signedUrlsMap[path] = signedUrl;
      }
    });
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
  const uncachedPaths: string[] = [];
  const signedUrlsMap: Record<string, string> = {};

  for (const d of fileDocs) {
    const cached = signedUrlCache.get(d.url);
    if (cached && cached.expiresAt > Date.now() + 60000) {
      signedUrlsMap[d.url] = cached.url;
    } else {
      uncachedPaths.push(d.url);
    }
  }

  if (uncachedPaths.length > 0) {
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(uncachedPaths, 60 * 60 * 24);
    uncachedPaths.forEach((path, i) => {
      const signedUrl = urls?.[i]?.signedUrl || '';
      if (signedUrl) {
        signedUrlCache.set(path, { url: signedUrl, expiresAt: Date.now() + 86400 * 1000 });
        signedUrlsMap[path] = signedUrl;
      }
    });
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
  const { error: updateErr } = await supabase.from('documents').update({ category: 'Chung' }).eq('category', name);
  if (updateErr) throw new Error(`Lỗi cập nhật danh mục tài liệu: ${updateErr.message}`);
  const { error: delErr } = await supabase.from('categories').delete().eq('id', id);
  if (delErr) throw new Error(`Lỗi xóa danh mục: ${delErr.message}`);
}

export async function getCommandSearchData() {
  const supabase = await createClient();
  const [docsRes, songsRes, schedsRes] = await Promise.all([
    supabase.from('documents').select('id, title, category, type, url').order('created_at', { ascending: false }).limit(25),
    supabase.from('songs').select('id, title, url').order('created_at', { ascending: false }).limit(25),
    supabase.from('study_schedules').select('id, title, date, start_time, is_completed').order('date', { ascending: false }).limit(25)
  ]);

  return {
    docs: docsRes.data || [],
    songs: songsRes.data || [],
    schedules: schedsRes.data || []
  };
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
  const { error: updateErr } = await supabase.from('photos').update({ album: 'Chung' }).eq('album', name);
  if (updateErr) throw new Error(`Lỗi cập nhật album ảnh: ${updateErr.message}`);
  const { error: delErr } = await supabase.from('albums').delete().eq('id', id);
  if (delErr) throw new Error(`Lỗi xóa album: ${delErr.message}`);
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
  const updates: Record<string, string> = { display_name: name };
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
    publicAvatarUrl = await getCachedSignedUrl(user.user_metadata.avatar_url, 60 * 60 * 24 * 7);
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

export async function addSchedule(payload: Record<string, unknown>) {
  const user = await getUser();
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').insert([{ ...payload, user_id: user.id }]);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache(user.id);
}

export async function addSchedules(payloads: Record<string, unknown>[]) {
  if (!payloads || payloads.length === 0) return;
  const user = await getUser();
  const supabase = await createClient();
  const records = payloads.map(p => ({ ...p, user_id: user.id }));
  const { error } = await supabase.from('study_schedules').insert(records);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache(user.id);
}

export async function updateScheduleStatus(id: string, is_completed: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').update({ is_completed }).eq('id', id);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache();
}

export async function updateSchedule(id: string, payload: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache();
}

export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('study_schedules').delete().eq('id', id);
  if (error) throw new Error(error.message);
  invalidateUserDashboardCache();
}

// ---- API CHIA SẺ (SHARING) ----
export async function createShareLink(type: 'photo' | 'doc', itemId: string) {
  const user = await getUser();
  const supabase = await createClient();
  
  const { data: existing } = await supabase.from('shared_links').select('id').eq('item_type', type).eq('item_id', itemId).maybeSingle();
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

  // Tối ưu hóa: Chạy song song truy vấn item và thông tin người sở hữu
  const [itemRes, userRes] = await Promise.all([
    link.item_type === 'photo' 
      ? supabaseAdmin.from('photos').select('*').eq('id', link.item_id).single()
      : supabaseAdmin.from('documents').select('*').eq('id', link.item_id).single(),
    supabaseAdmin.auth.admin.getUserById(link.user_id)
  ]);

  const itemDetails = itemRes.data;
  if (!itemDetails) throw new Error('Tệp này đã bị chủ sở hữu xóa.');

  const [publicUrl, ownerAvatar] = await Promise.all([
    getCachedSignedUrl(itemDetails.url),
    userRes.data?.user?.user_metadata?.avatar_url 
      ? getCachedSignedUrl(userRes.data.user.user_metadata.avatar_url)
      : Promise.resolve(null)
  ]);

  const ownerName = userRes.data?.user?.user_metadata?.display_name || 'Một người dùng';
  return { type: link.item_type, item: { ...itemDetails, publicUrl }, ownerName, ownerAvatar };
}

// ---- BULK PHOTO ACTIONS ----
export async function deletePhotosBulk(photosToDelete: Array<{ id: string; url: string }>) {
  if (!photosToDelete || photosToDelete.length === 0) return;
  const user = await getUser();
  const supabase = await createClient();

  const ids = photosToDelete.map(p => p.id);
  const { error: dbError } = await supabase.from('photos').delete().in('id', ids).eq('user_id', user.id);
  if (dbError) {
    console.error(`[DataAction] Lỗi xóa ảnh hàng loạt trong DB:`, dbError);
    throw new Error(`Lỗi xóa ảnh hàng loạt: ${dbError.message}`);
  }

  // Xóa file tương ứng trong Supabase Storage
  const pathsToRemove = photosToDelete
    .map(p => p.url)
    .filter(url => url && !url.startsWith('http'));

  if (pathsToRemove.length > 0) {
    pathsToRemove.forEach(path => signedUrlCache.delete(path));
    const { error: storageError } = await supabaseAdmin.storage.from('personal_files').remove(pathsToRemove);
    if (storageError) {
      console.warn(`[Storage] Cảnh báo xóa file hàng loạt trong storage:`, storageError.message);
    }
  }
}

export async function movePhotosBulk(photoIds: string[], newAlbum: string) {
  if (!photoIds || photoIds.length === 0) return;
  const user = await getUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('photos')
    .update({ album: newAlbum })
    .in('id', photoIds)
    .eq('user_id', user.id);

  if (error) {
    console.error(`[DataAction] Lỗi chuyển album hàng loạt:`, error);
    throw new Error(`Lỗi chuyển album hàng loạt: ${error.message}`);
  }
}

// ---- FOCUS POMODORO STATS PERSISTENCE ----
export async function saveFocusSession(payload: { duration_minutes: number; goal?: string; completed_at?: string }) {
  try {
    const user = await getUser();
    const supabase = await createClient();
    const completedAt = payload.completed_at || new Date().toISOString();
    
    const { error } = await supabase.from('focus_sessions').insert([{
      user_id: user.id,
      duration_minutes: payload.duration_minutes,
      goal: payload.goal?.trim() || '',
      completed_at: completedAt
    }]);

    if (error) {
      console.warn(`[Focus] Lưu DB chưa khả dụng (bảng có thể chưa tạo): ${error.message}`);
      return { success: false, fallback: true, error: error.message };
    }
    return { success: true, fallback: false };
  } catch (err: any) {
    console.warn(`[Focus] Lỗi máy chủ khi lưu phiên học:`, err.message);
    return { success: false, fallback: true, error: err.message };
  }
}

export async function getTodayFocusStats(): Promise<{ total_minutes: number; sessions_count: number } | null> {
  try {
    const user = await getUser();
    const supabase = await createClient();

    // Lấy thời điểm bắt đầu ngày hôm nay (00:00:00 local)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfDayIso = now.toISOString();

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id)
      .gte('completed_at', startOfDayIso);

    if (error) {
      return null;
    }

    const totalMinutes = (data || []).reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
    return {
      total_minutes: totalMinutes,
      sessions_count: data?.length || 0
    };
  } catch (err: any) {
    console.warn(`[Focus] getTodayFocusStats fallback:`, err.message);
    return null;
  }
}

// ---- TẠO & ĐỌC GHI CHÚ NHANH (QUICK NOTES) ----
export async function saveQuickNote(payload: {
  title: string;
  content: string;
  category?: string;
  type?: 'note' | 'txt';
}) {
  const user = await getUser();
  const supabase = await createClient();

  const title = payload.title?.trim() || "Ghi chú mới";
  const content = payload.content?.trim();
  const type = payload.type === 'txt' ? 'txt' : 'note';
  const category = payload.category?.trim() || "Chung";

  if (!content) {
    throw new Error("Nội dung ghi chú không được để trống.");
  }

  const timestamp = Date.now();
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .substring(0, 30);
  const fileName = `docs/${timestamp}_${safeTitle || 'note'}.txt`;
  const fullPath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('personal_files')
    .upload(fullPath, Buffer.from(content, 'utf-8'), {
      contentType: 'text/plain; charset=utf-8',
      upsert: true
    });

  if (uploadError) {
    throw new Error(`Lỗi lưu tệp ghi chú vào kho lưu trữ: ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabase.from('documents').insert([{
    user_id: user.id,
    title,
    type,
    url: fullPath,
    category
  }]).select().single();

  if (insertError) {
    throw new Error(`Lỗi lưu bản ghi ghi chú: ${insertError.message}`);
  }

  invalidateUserDashboardCache(user.id);
  return { success: true, doc: data };
}

export async function getNoteContent(docUrl: string): Promise<string> {
  if (!docUrl || docUrl.startsWith('http')) return '';
  const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
  if (error || !blob) {
    throw new Error("Không thể tải nội dung ghi chú từ kho lưu trữ.");
  }
  return await blob.text();
}

// ---- TỐI ƯU HÓA HIỆU NĂNG CAO: GỘP TOÀN BỘ TRUY VẤN DASHBOARD VÀO 1 SERVER ACTION DUY NHẤT ----
export interface HomeDashboardData {
  stats: { docs: number; songs: number; photos: number };
  profile: { name: string; avatar?: string | null; email?: string } | null;
  todaySchedules: any[];
  recentPhoto: string | null;
  focusStats: { totalMinutes: number; sessionsCount: number };
}

export async function getHomeDashboardData(): Promise<HomeDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      stats: { docs: 0, songs: 0, photos: 0 },
      profile: null,
      todaySchedules: [],
      recentPhoto: null,
      focusStats: { totalMinutes: 0, sessionsCount: 0 }
    };
  }

  // Nếu trong bộ nhớ đệm server còn hạn (15s), trả về ngay lập tức trong 0.01ms
  const cached = homeDashboardCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Kích hoạt giải mã Avatar song song ngay từ đầu cùng với các truy vấn DB
  const avatarPromise = user.user_metadata?.avatar_url
    ? getCachedSignedUrl(user.user_metadata.avatar_url, 60 * 60 * 24 * 7)
    : Promise.resolve(null);

  // Chạy song song tất cả các truy vấn trên 1 kết nối duy nhất ở server
  const [
    docsCountRes,
    songsCountRes,
    photosCountRes,
    todaySchedulesRes,
    recentPhotoRes,
    avatarUrl
  ] = await Promise.all([
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('study_schedules')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .eq('is_completed', false)
      .order('start_time', { ascending: true })
      .limit(3),
    supabase.from('photos')
      .select('url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    avatarPromise
  ]);

  // Xử lý signed URL ảnh gần nhất (nếu cache hit thì 0ms)
  const recentPhotoUrl = recentPhotoRes.data?.url
    ? await getCachedSignedUrl(recentPhotoRes.data.url)
    : null;

  const result: HomeDashboardData = {
    stats: {
      docs: docsCountRes.count || 0,
      songs: songsCountRes.count || 0,
      photos: photosCountRes.count || 0,
    },
    profile: {
      email: user.email,
      name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Bạn',
      avatar: avatarUrl
    },
    todaySchedules: todaySchedulesRes.data || [],
    recentPhoto: recentPhotoUrl,
    focusStats: {
      totalMinutes: 0,
      sessionsCount: 0
    }
  };

  homeDashboardCache.set(user.id, { data: result, expiresAt: Date.now() + 15000 });
  return result;
}


