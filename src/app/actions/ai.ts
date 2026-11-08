"use server"
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@/utils/supabase/server';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong file .env.local để kích hoạt Trợ lý AI.");
  }
  return new GoogleGenAI({ apiKey });
}

// Danh sách mô hình ưu tiên: bắt đầu với mô hình tốc độ cao và ổn định nhất, có fallback tự động
const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash'
];

interface AIGenerateOptions {
  contents: string;
  isJson?: boolean;
  timeoutMs?: number;
}

// Helper thực thi gọi AI an toàn: Có Timeout guard, Model Fallback và Retry tự động
async function callGeminiSafe(options: AIGenerateOptions): Promise<string> {
  const ai = getAIClient();
  const timeoutMs = options.timeoutMs || 15000;
  let lastError: Error | null = null;

  for (const model of PREFERRED_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) khi gọi model ${model}`)), timeoutMs)
        );

        const config: Record<string, unknown> = {};
        if (options.isJson) {
          config.responseMimeType = "application/json";
        }

        const apiPromise = ai.models.generateContent({
          model,
          contents: options.contents,
          config: Object.keys(config).length > 0 ? config : undefined
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        const text = response?.text?.trim();
        if (text) return text;
      } catch (err: unknown) {
        lastError = err as Error;
        const errMsg = (err as Error)?.message || '';
        const status = (err as { status?: number })?.status;

        // Nếu model không tồn tại (404), chuyển ngay sang model tiếp theo
        if (status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          break;
        }

        // Nếu quá tải (503) hoặc rate limit (429), chờ backoff rồi thử lại
        if (status === 503 || status === 429 || errMsg.includes('demand')) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }

        // Lỗi khác: thử model dự phòng tiếp theo
        break;
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.");
}

// Tối ưu hóa: Trích xuất trực tiếp bằng storage.download() thay vì 2 chặng (createSignedUrl + fetch)
async function extractDocText(docType: string, docUrl: string): Promise<string> {
  let text = "";

  if (docType === 'link') {
    const res = await fetch(docUrl, { signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    text = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 16000); 
  } else if (docType === 'pdf') {
    if (typeof global !== 'undefined' && typeof (global as unknown as { DOMMatrix: unknown }).DOMMatrix === 'undefined') {
      (global as unknown as { DOMMatrix: unknown }).DOMMatrix = class DOMMatrix { constructor() {} };
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
    
    const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
    if (error || !blob) throw new Error("Không thể tải file PDF từ kho lưu trữ.");
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    const parsed = await pdfParse(buffer);
    text = parsed.text.substring(0, 16000); 
  } else if (docType === 'docx') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammothModule = require('mammoth');
    const mammoth = typeof mammothModule.extractRawText === 'function' ? mammothModule : mammothModule.default;
    
    const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
    if (error || !blob) throw new Error("Không thể tải file Word từ kho lưu trữ.");
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    text = result.value.substring(0, 16000);
  } else if (['txt', 'md', 'csv', 'json', 'note'].includes(docType?.toLowerCase())) {
    const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
    if (error || !blob) throw new Error("Không thể tải file văn bản từ kho lưu trữ.");
    
    text = (await blob.text()).substring(0, 16000);
  } else {
    throw new Error(`Định dạng .${docType} chưa được hỗ trợ đọc sâu. Vui lòng dùng file PDF, Word (.docx), TXT, hoặc Link Web.`);
  }

  if (!text || text.trim().length < 10) {
    throw new Error("Nội dung tài liệu quá ngắn hoặc chưa có nội dung văn bản để AI phân tích.");
  }

  return text;
}

export async function guessMusicGenre(songTitle: string) {
  try {
    const prompt = `Bạn là một chuyên gia âm nhạc. Dựa vào tên bài hát hoặc liên kết "${songTitle}", hãy đoán thể loại nhạc của nó (Ví dụ: Pop, EDM, Lofi, Ballad, Rap...). Trả về ĐÚNG 1 TỪ HOẶC CỤM TỪ NGẮN NHẤT mô tả thể loại, tuyệt đối không giải thích thêm.`;
    const text = await callGeminiSafe({ contents: prompt, timeoutMs: 8000 });
    return { success: true, data: text.replace(/[\[\]"']/g, '') }; 
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

export async function categorizeDoc(docTitle: string) {
  try {
    const prompt = `Dựa vào tên tài liệu hoặc liên kết URL sau: "${docTitle}", hãy phân loại nó thuộc chủ đề gì (Ví dụ: Lập trình, Toán học, Giải trí, Kinh tế, Ngoại ngữ, Khác...). Trả về đúng 1 cụm từ ngắn gọn làm tên Danh mục, tuyệt đối không giải thích.`;
    const text = await callGeminiSafe({ contents: prompt, timeoutMs: 8000 });
    return { success: true, data: text.replace(/[\[\]"']/g, '') };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// 1. TÓM TẮT TÀI LIỆU CỐT LÕI
export async function generateDocSummary(docId: string, docType: string, docUrl: string) {
  try {
    const content = await extractDocText(docType, docUrl);
    const prompt = `Hãy đóng vai một trợ lý học tập cao cấp. Tóm tắt nội dung tài liệu sau đây một cách súc tích, dễ hiểu, bằng tiếng Việt.
Yêu cầu:
- Nêu rõ 3 đến 5 ý cốt lõi quan trọng nhất dưới dạng gạch đầu dòng rõ ràng.
- Đưa ra 1 câu kết luận tổng kết giá trị của tài liệu.
Tài liệu:
${content}`;
    
    const summary = await callGeminiSafe({ contents: prompt, timeoutMs: 15000 });
    const supabase = await createClient();
    await supabase.from('documents').update({ ai_summary: summary }).eq('id', docId);

    return { success: true, data: summary };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// 2. HỎI ĐÁP TƯƠNG TÁC TRỰC TIẾP TRÊN TÀI LIỆU (IN-DOC Q&A)
export async function askDocQuestion(
  docType: string, 
  docUrl: string, 
  question: string,
  history: { role: 'user' | 'assistant'; text: string }[] = []
) {
  try {
    const content = await extractDocText(docType, docUrl);
    const historyPrompt = history.slice(-4).map(h => `${h.role === 'user' ? 'Người dùng' : 'AI'}: ${h.text}`).join('\n');

    const prompt = `Bạn là Trợ lý Học tập AI thông minh, hỗ trợ người dùng học và nghiên cứu tài liệu.
Dựa vào NỘI DUNG TÀI LIỆU dưới đây, hãy trả lời câu hỏi của người dùng một cách chính xác, sâu sắc và dễ hiểu bằng tiếng Việt.
Nếu thông tin không có trong tài liệu, hãy thành thật trả lời là tài liệu không đề cập và có thể gợi ý ngắn kiến thức liên quan.

--- NỘI DUNG TÀI LIỆU ---
${content}

--- LỊCH SỬ HỎI ĐÁP GẦN ĐÂY ---
${historyPrompt}

--- CÂU HỎI MỚI ---
${question}

Hãy trả lời trực tiếp, mạch lạc và trình bày đẹp mắt:`;

    const answer = await callGeminiSafe({ contents: prompt, timeoutMs: 15000 });
    return { success: true, answer };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// 3. TỰ ĐỘNG TẠO BÀI TRẮC NGHIỆM TỰ KIỂM TRA KIẾN THỨC (QUIZ GENERATOR)
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // 0, 1, 2, 3
  explanation: string;
}

export async function generateDocQuiz(docType: string, docUrl: string, count: number = 4) {
  try {
    const content = await extractDocText(docType, docUrl);
    const prompt = `Dựa vào nội dung tài liệu sau, hãy tạo chính xác ${count} câu hỏi trắc nghiệm khách quan để kiểm tra kiến thức của người đọc.
Mỗi câu hỏi phải có:
- Nội dung câu hỏi rõ ràng.
- 4 phương án lựa chọn A, B, C, D (ghi rõ nội dung phương án).
- Chỉ số đáp án đúng (correctAnswer là số nguyên từ 0 đến 3 tương ứng với A, B, C, D).
- Lời giải thích ngắn gọn tại sao phương án đó đúng.

YÊU CẦU: Trả về ĐÚNG định dạng JSON mảng (Array of objects), KHÔNG kèm markdown hoặc lời giải thích ngoài JSON.
Mẫu JSON:
[
  {
    "question": "Câu hỏi số 1 là gì?",
    "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
    "correctAnswer": 0,
    "explanation": "Giải thích ngắn gọn lý do..."
  }
]

Nội dung tài liệu:
${content}`;

    const text = await callGeminiSafe({ contents: prompt, isJson: true, timeoutMs: 18000 });
    let raw = text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();
    }

    const quiz: QuizQuestion[] = JSON.parse(raw);
    return { success: true, quiz };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// 4. TỰ ĐỘNG TẠO THẺ GHI NHỚ (FLASHCARDS)
export interface Flashcard {
  front: string; // Khái niệm / Thuật ngữ
  back: string;  // Định nghĩa / Giải thích
}

export async function generateDocFlashcards(docType: string, docUrl: string) {
  try {
    const content = await extractDocText(docType, docUrl);
    const prompt = `Dựa vào tài liệu sau, hãy trích xuất 4 đến 6 khái niệm, định nghĩa hoặc công thức cốt lõi nhất để làm Thẻ ghi nhớ (Flashcard) ôn thi.
Mỗi thẻ gồm:
- "front": Khái niệm hoặc câu hỏi ngắn ở mặt trước thẻ.
- "back": Định nghĩa, câu trả lời hoặc ví dụ ở mặt sau thẻ (ngắn gọn, dễ nhớ).

Trả về ĐÚNG định dạng JSON mảng:
[
  { "front": "Khái niệm A", "back": "Giải nghĩa ngắn gọn của khái niệm A..." }
]

Tài liệu:
${content}`;

    const text = await callGeminiSafe({ contents: prompt, isJson: true, timeoutMs: 18000 });
    let raw = text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();
    }

    const flashcards: Flashcard[] = JSON.parse(raw);
    return { success: true, flashcards };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

// 5. TRỢ LÝ TOÀN NĂNG HỎI ĐÁP TỰ DO & TRA CỨU KIẾN THỨC (UNIVERSAL AI ASSISTANT)
export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function askGeneralAI(
  prompt: string,
  history: AIChatMessage[] = []
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const cleanPrompt = prompt?.trim();
    if (!cleanPrompt) {
      return { success: false, error: "Nội dung câu hỏi không được để trống." };
    }

    const recentHistory = (history || []).slice(-8);
    const historyText = recentHistory.length > 0
      ? recentHistory
          .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý AI'}: ${m.content}`)
          .join('\n\n')
      : 'Chưa có lịch sử trước đó.';

    const systemPrompt = `Bạn là Trợ lý AI Toàn năng của nền tảng "My Space" — không gian học tập, làm việc và quản lý cá nhân thông minh.
Mô hình vận hành: Gemini 3.5 Flash Lite tốc độ phản hồi cực nhanh và hoàn toàn miễn phí.

Nhiệm vụ cốt lõi của bạn:
1. Giải đáp mọi thắc mắc học tập và nghiên cứu (Toán, Lý, Hóa, Sinh, Tin học, Lập trình, Ngoại ngữ, Kinh tế, Văn học, Lịch sử...).
2. Hướng dẫn phương pháp học tập hiệu quả (Pomodoro, Feynman, Spaced Repetition, Active Recall), lập kế hoạch ôn thi, viết dàn ý bài luận hoặc báo cáo.
3. Giải thích code, debug lỗi phần mềm, hướng dẫn thuật toán, kiến trúc hệ thống và giải pháp công nghệ.
4. Trợ giúp ý tưởng ghi chú nhanh (Quick Notes), tóm lược kiến thức khó hiểu một cách trực quan, dễ nhớ.
5. Luôn trả lời bằng tiếng Việt tự nhiên, nhiệt tình, lịch sự và có cấu trúc rõ ràng (dùng danh sách gạch đầu dòng, tiêu đề ngắn, bôi đậm từ khóa quan trọng và dùng markdown code block nếu liên quan đến lập trình).

--- LỊCH SỬ HỘI THOẠI GẦN ĐÂY ---
${historyText}

--- CÂU HỎI MỚI CỦA NGƯỜI DÙNG ---
${cleanPrompt}

Hãy trả lời trực tiếp, đầy đủ, súc tích và mạch lạc:`;

    const answer = await callGeminiSafe({
      contents: systemPrompt,
      timeoutMs: 20000
    });

    return { success: true, data: answer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi trao đổi với Trợ lý AI.";
    console.error("[askGeneralAI Error]:", message);
    return { success: false, error: message };
  }
}
