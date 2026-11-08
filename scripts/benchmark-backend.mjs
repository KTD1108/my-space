import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function measure(name, fn, iterations = 3) {
  const times = [];
  let lastResult = null;
  let error = null;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      lastResult = await fn();
      const elapsed = performance.now() - start;
      times.push(elapsed);
    } catch (err) {
      error = err.message;
      break;
    }
  }

  if (error) {
    return { name, error, avg: 0, min: 0, max: 0, times: [] };
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    name,
    count: Array.isArray(lastResult) ? lastResult.length : (lastResult?.count ?? (typeof lastResult === 'object' ? Object.keys(lastResult || {}).length : 1)),
    avg: Math.round(avg * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    times: times.map(t => Math.round(t * 10) / 10)
  };
}

async function run() {
  const results = [];

  // 1. Dashboard Stats
  results.push(await measure('getDashboardStats (3x HEAD count)', async () => {
    const [docsData, songsData, photosData] = await Promise.all([
      supabaseAdmin.from('documents').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('songs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('photos').select('id', { count: 'exact', head: true })
    ]);
    return { docs: docsData.count, songs: songsData.count, photos: photosData.count };
  }));

  // 2. Photos DB Only
  results.push(await measure('getPhotos [DB select(*) only]', async () => {
    const { data } = await supabaseAdmin.from('photos').select('*').order('created_at', { ascending: false });
    return data || [];
  }));

  // 3. Photos Full (DB + Bulk Signed URLs)
  results.push(await measure('getPhotos [DB + Bulk createSignedUrls]', async () => {
    const { data } = await supabaseAdmin.from('photos').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) return [];
    const paths = data.map(p => p.url);
    const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
    return data.map((p, i) => ({ ...p, publicUrl: urls?.[i]?.signedUrl || '' }));
  }));

  // 4. Songs DB Only
  results.push(await measure('getSongs [DB select(*) only]', async () => {
    const { data } = await supabaseAdmin.from('songs').select('*').order('created_at', { ascending: false });
    return data || [];
  }));

  // 5. Songs Full (DB + Bulk Signed URLs)
  results.push(await measure('getSongs [DB + Bulk createSignedUrls]', async () => {
    const { data } = await supabaseAdmin.from('songs').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) return [];
    const fileSongs = data.filter(s => !(s.url && s.url.startsWith('http')));
    const paths = fileSongs.map(s => s.url);
    let signedUrlsMap = {};
    if (paths.length > 0) {
      const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
      fileSongs.forEach((s, i) => { signedUrlsMap[s.url] = urls?.[i]?.signedUrl || ''; });
    }
    return data.map(s => s);
  }));

  // 6. Docs DB Only
  results.push(await measure('getDocs [DB select(*) only]', async () => {
    const { data } = await supabaseAdmin.from('documents').select('*').order('created_at', { ascending: false });
    return data || [];
  }));

  // 7. Docs Full (DB + Bulk Signed URLs)
  results.push(await measure('getDocs [DB + Bulk createSignedUrls]', async () => {
    const { data } = await supabaseAdmin.from('documents').select('*').order('created_at', { ascending: false });
    if (!data || data.length === 0) return [];
    const fileDocs = data.filter(d => d.type !== 'link');
    const paths = fileDocs.map(d => d.url);
    let signedUrlsMap = {};
    if (paths.length > 0) {
      const { data: urls } = await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
      fileDocs.forEach((d, i) => { signedUrlsMap[d.url] = urls?.[i]?.signedUrl || ''; });
    }
    return data.map(d => d);
  }));

  // 8. Schedules DB
  results.push(await measure('getSchedules (DB query)', async () => {
    const { data } = await supabaseAdmin.from('study_schedules').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });
    return data || [];
  }));

  // 9. Command Search Data
  results.push(await measure('getCommandSearchData (3 queries)', async () => {
    const [docsRes, songsRes, schedsRes] = await Promise.all([
      supabaseAdmin.from('documents').select('id, title, category, type, url').order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('songs').select('id, title, url').order('created_at', { ascending: false }).limit(25),
      supabaseAdmin.from('study_schedules').select('id, title, date, start_time, is_completed').order('date', { ascending: false }).limit(25)
    ]);
    return { docs: docsRes.data?.length, songs: songsRes.data?.length, scheds: schedsRes.data?.length };
  }));

  // 10. Storage createSignedUrl (single item)
  const { data: photoSample } = await supabaseAdmin.from('photos').select('url').limit(1).single();
  if (photoSample?.url) {
    results.push(await measure('storage.createSignedUrl (1 file)', async () => {
      const { data } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(photoSample.url, 60 * 60 * 24);
      return data?.signedUrl;
    }));
    results.push(await measure('storage.getPublicUrl (sync, 0ms network)', async () => {
      const { data } = supabaseAdmin.storage.from('personal_files').getPublicUrl(photoSample.url);
      return data?.publicUrl;
    }));
  }

  // 11. Profile Data Simulation
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = usersData?.users?.[0];
  if (testUser) {
    results.push(await measure('getProfileData (getUserById + createSignedUrl)', async () => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUser.id);
      const user = userData?.user;
      let publicAvatarUrl = null;
      if (user?.user_metadata?.avatar_url) {
        const { data } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(user.user_metadata.avatar_url, 60 * 60 * 24 * 7);
        publicAvatarUrl = data?.signedUrl;
      }
      return { name: user?.user_metadata?.display_name, avatar: publicAvatarUrl };
    }));
  }

  // 12. ClientLayout Route Change Overhead (simulate what happens on EVERY route change):
  // ClientLayout calls getProfileData()
  results.push(await measure('ClientLayout Route Switch Overhead (getProfileData)', async () => {
    if (!testUser) return null;
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUser.id);
    const user = userData?.user;
    if (user?.user_metadata?.avatar_url) {
      await supabaseAdmin.storage.from('personal_files').createSignedUrl(user.user_metadata.avatar_url, 60 * 60 * 24 * 7);
    }
    return true;
  }));

  // 13. Home Page Load Waterfall / Overhead
  results.push(await measure('Home Page Total Data Fetch (Stats + Profile + Scheds + Photos)', async () => {
    return await Promise.all([
      supabaseAdmin.from('documents').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('songs').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('photos').select('id', { count: 'exact', head: true }),
      testUser ? supabaseAdmin.auth.admin.getUserById(testUser.id) : null,
      supabaseAdmin.from('study_schedules').select('*').order('date', { ascending: true }),
      (async () => {
        const { data } = await supabaseAdmin.from('photos').select('*').order('created_at', { ascending: false });
        if (data?.length) {
          const paths = data.map(p => p.url);
          await supabaseAdmin.storage.from('personal_files').createSignedUrls(paths, 60 * 60 * 24);
        }
      })()
    ]);
  }));

  console.log('| Thao tác (Action / Operation) | Số lượng bản ghi | Tối thiểu (Min ms) | Trung bình (Avg ms) | Tối đa (Max ms) | Ghi chú |');
  console.log('|---|---|---|---|---|---|');
  for (const r of results) {
    let note = '';
    if (r.name.includes('createSignedUrls')) note = 'Thêm 1 roundtrip sang Storage API';
    else if (r.name.includes('getPublicUrl')) note = '0ms mạng (String format)';
    else if (r.name.includes('Route Switch')) note = 'BỊ GỌI MỖI LẦN ĐỔI ROUTE';
    else if (r.name.includes('Home Page')) note = 'Tải đồng thời khi vào Dashboard';
    console.log(`| \`${r.name}\` | ${r.count ?? '-'} | ${r.min} ms | ${r.avg} ms | ${r.max} ms | ${note} |`);
  }
}

run().catch(console.error);
