import fs from 'fs';
import assert from 'node:assert';

// 1. Nạp biến môi trường từ .env.local
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

async function runVerification() {
  console.log("====================================================");
  console.log("🧪 BẮT ĐẦU KIỂM THỬ CÁC TÍNH NĂNG MỚI (6 NHÁNH SUBAGENTS)");
  console.log("====================================================");

  // Dynamic import sau khi process.env đã sẵn sàng
  const { askGeneralAI } = await import('../src/app/actions/ai.ts');
  const { getTodayFocusStats } = await import('../src/app/actions/data.ts');
  const { resetPassword, updateUserPassword } = await import('../src/app/login/actions.ts');

  let passed = 0;
  let failed = 0;

  // 1. Kiểm thử askGeneralAI (Gemini 3.5 Flash Lite)
  try {
    const t0 = Date.now();
    const res = await askGeneralAI("Hãy giải thích ngắn gọn 1 câu về phương pháp Pomodoro.");
    const elapsed = Date.now() - t0;
    assert.strictEqual(res.success, true, "askGeneralAI phải trả về success: true");
    assert.ok(res.data && res.data.length > 10, "Phản hồi AI phải có nội dung");
    console.log(`  ✅ PASS: askGeneralAI (Gemini 3.5 Flash Lite) phản hồi chuẩn xác (${elapsed}ms)`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: askGeneralAI lỗi:`, err.message);
    failed++;
  }

  // 2. Kiểm thử resetPassword email validation
  try {
    const emptyRes = await resetPassword("");
    assert.strictEqual(emptyRes.success, false, "Email rỗng phải bị từ chối");
    
    const invalidRes = await resetPassword("invalid-email-format");
    assert.strictEqual(invalidRes.success, false, "Email sai cú pháp phải bị từ chối");
    console.log(`  ✅ PASS: resetPassword kiểm tra định dạng email và fail-fast an toàn`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: resetPassword validation lỗi:`, err.message);
    failed++;
  }

  // 3. Kiểm thử updateUserPassword validation
  try {
    const shortRes = await updateUserPassword("123");
    assert.strictEqual(shortRes.success, false, "Mật khẩu < 6 ký tự phải bị từ chối");
    console.log(`  ✅ PASS: updateUserPassword kiểm tra độ dài tối thiểu (>= 6 ký tự)`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: updateUserPassword validation lỗi:`, err.message);
    failed++;
  }

  // 4. Kiểm thử getTodayFocusStats fallback an toàn khi ngoài session
  try {
    const stats = await getTodayFocusStats();
    console.log(`  ✅ PASS: getTodayFocusStats chạy an toàn không làm sập ứng dụng (kết quả: ${stats ? JSON.stringify(stats) : 'null (an toàn fallback)'})`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: getTodayFocusStats lỗi:`, err.message);
    failed++;
  }

  console.log("====================================================");
  console.log(`📊 TỔNG KẾT: ${passed} PASS, ${failed} FAIL`);
  if (failed === 0) {
    console.log("🎉 TẤT CẢ CÁC SERVER ACTIONS MỚI HOẠT ĐỘNG HOÀN HẢO!");
  }
  console.log("====================================================");
}

runVerification();
