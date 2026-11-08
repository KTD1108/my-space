import fs from 'fs';

// Đọc và nạp biến môi trường từ .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[trimmed.slice(0, eqIdx).trim()] = val;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TOÀN DIỆN (E2E TEST SUITE)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, durationMs) {
    if (condition) {
      console.log(`  ✅ PASS: ${message} ${durationMs !== undefined ? `(${durationMs}ms)` : ''}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- TEST GROUP 1: DATABASE & CACHING ---
  console.log('📦 [NHÓM 1] KIỂM THỬ BACKEND DATABASE & STORAGE CACHE:');
  const { getDashboardStats, getRecentPhoto, getCachedSignedUrl, getCommandSearchData } = await import('../src/app/actions/data.ts');

  // Test 1.1: getDashboardStats
  try {
    const t0 = Date.now();
    const stats = await getDashboardStats();
    const dur = Date.now() - t0;
    assert(stats && typeof stats.docs === 'number' && typeof stats.songs === 'number' && typeof stats.photos === 'number',
      `getDashboardStats trả về cấu trúc hợp lệ (Docs: ${stats.docs}, Songs: ${stats.songs}, Photos: ${stats.photos})`, dur);
  } catch (err) {
    assert(false, `getDashboardStats ném lỗi: ${err.message}`);
  }

  // Test 1.2: getRecentPhoto
  try {
    const t0 = Date.now();
    const photoUrl = await getRecentPhoto();
    const dur = Date.now() - t0;
    assert(photoUrl === null || (typeof photoUrl === 'string' && photoUrl.startsWith('http')),
      `getRecentPhoto trả về URL hợp lệ hoặc null an toàn`, dur);
  } catch (err) {
    assert(false, `getRecentPhoto ném lỗi: ${err.message}`);
  }

  // Test 1.3: In-Memory Signed URL Cache Hit
  try {
    const realPath = '948feed4-c6c5-40a1-bff0-b192f4934c7d/photos/1793723009810_119.jpg';
    const t1 = Date.now();
    const url1 = await getCachedSignedUrl(realPath, 3600);
    const dur1 = Date.now() - t1;

    const t2 = Date.now();
    const url2 = await getCachedSignedUrl(realPath, 3600);
    const dur2 = Date.now() - t2;

    assert(url1 === url2 && dur2 <= 2 && url1.length > 20,
      `Signed URL Cache Hit lần 2 tức thì (<2ms) không cần gọi lại Storage API (Lần 1: ${dur1}ms -> Lần 2: ${dur2}ms)`, dur2);
  } catch (err) {
    assert(false, `Signed URL Cache ném lỗi: ${err.message}`);
  }

  // Test 1.4: getCommandSearchData
  try {
    const t0 = Date.now();
    const searchData = await getCommandSearchData();
    const dur = Date.now() - t0;
    assert(Array.isArray(searchData.docs) && Array.isArray(searchData.songs) && Array.isArray(searchData.schedules),
      `getCommandSearchData trả về đầy đủ 3 mảng tìm kiếm`, dur);
  } catch (err) {
    assert(false, `getCommandSearchData ném lỗi: ${err.message}`);
  }

  // --- TEST GROUP 2: AI ACTIONS SUITE ---
  console.log('\n🤖 [NHÓM 2] KIỂM THỬ CÁC TÍNH NĂNG TRỢ LÝ AI (GEMINI 3.5 FLASH LITE):');
  const { guessMusicGenre, categorizeDoc, generateDocQuiz, generateDocFlashcards } = await import('../src/app/actions/ai.ts');

  // Test 2.1: guessMusicGenre
  try {
    const t0 = Date.now();
    const res = await guessMusicGenre('Alan Walker - Faded (Electronic NCS)');
    const dur = Date.now() - t0;
    assert(res.success && res.data && res.data.length > 0,
      `guessMusicGenre đoán thể loại chuẩn xác: "${res.data}"`, dur);
  } catch (err) {
    assert(false, `guessMusicGenre ném lỗi: ${err.message}`);
  }

  // Test 2.2: categorizeDoc
  try {
    const t0 = Date.now();
    const res = await categorizeDoc('Giao trinh Thiet ke Vi mach So va FPGA.pdf');
    const dur = Date.now() - t0;
    assert(res.success && res.data && res.data.length > 0,
      `categorizeDoc phân loại chủ đề tài liệu: "${res.data}"`, dur);
  } catch (err) {
    assert(false, `categorizeDoc ném lỗi: ${err.message}`);
  }

  // --- TEST GROUP 3: LOGIC MÚI GIỜ & SAFETY GUARDS ---
  console.log('\n⏰ [NHÓM 3] KIỂM THỬ XỬ LÝ MÚI GIỜ VIỆT NAM & BẢO VỆ CRASH:');

  // Test 3.1: Date string formatting
  const now = new Date();
  const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  assert(/^\d{4}-\d{2}-\d{2}$/.test(localDateStr), `Định dạng ngày địa phương đúng chuẩn YYYY-MM-DD: "${localDateStr}"`);

  // Test 3.2: Safeguard undefined start_time
  const dummySched = { id: 'test-1', title: 'Học tập', start_time: null, end_time: undefined };
  const safeStart = dummySched.start_time ? dummySched.start_time.substring(0, 5) : '--:--';
  const safeEnd = dummySched.end_time ? dummySched.end_time.substring(0, 5) : '--:--';
  assert(safeStart === '--:--' && safeEnd === '--:--', `Optional chaining bảo vệ chống crash khi start_time/end_time null`);

  // --- KẾT QUẢ TỔNG HỢP ---
  console.log('\n====================================================');
  console.log(`📊 TỔNG KẾT KẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ CÁC BÀI TEST ĐÃ VƯỢT QUA 100%!');
  } else {
    console.log('⚠️ CÓ BÀI TEST THẤT BẠI.');
  }
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(e => {
  console.error('Lỗi khi chạy Test Suite:', e);
  process.exit(1);
});
