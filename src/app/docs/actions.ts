"use server";

import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase-server';

export interface DocFlashcard {
  id: string;
  front: string;
  back: string;
  tag?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

// Danh sách các mô hình Gemini ưu tiên: Bắt đầu với gemini-3.8-flash thế hệ mới nhất
const PREFERRED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
];

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong file .env.local để kích hoạt Trợ lý AI.");
  }
  return new GoogleGenAI({ apiKey });
}

interface CallAIOptions {
  contents: string;
  isJson?: boolean;
  timeoutMs?: number;
}

async function callGeminiSafe(options: CallAIOptions): Promise<string> {
  const ai = getAIClient();
  const timeoutMs = options.timeoutMs || 25000;
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

        // Model không hỗ trợ hoặc 404 -> thử model kế tiếp trong danh sách
        if (status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          break;
        }

        // Quá tải / Rate limit (503 / 429) -> retry có backoff
        if (status === 503 || status === 429 || errMsg.includes('demand')) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        // Lỗi khác
        break;
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến Trợ lý AI Gemini. Vui lòng thử lại sau.");
}

/**
 * Trích xuất nội dung văn bản từ tài liệu lưu trữ (PDF, Word, TXT, Note, Link Web)
 */
export async function getDocumentText(
  docType: string, 
  docUrl: string
): Promise<{ success: boolean; text?: string; error?: string }> {
  try {
    let text = "";
    const cleanType = (docType || '').toLowerCase().trim();

    if (cleanType === 'link') {
      const res = await fetch(docUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`Không thể truy cập liên kết (Mã HTTP ${res.status})`);
      const html = await res.text();
      text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                 .replace(/<[^>]*>?/gm, ' ')
                 .replace(/\s+/g, ' ')
                 .substring(0, 20000);
    } else if (cleanType === 'pdf') {
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
      text = parsed.text.substring(0, 20000);
    } else if (cleanType === 'docx') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammothModule = require('mammoth');
      const mammoth = typeof mammothModule.extractRawText === 'function' ? mammothModule : mammothModule.default;

      const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
      if (error || !blob) throw new Error("Không thể tải file Word từ kho lưu trữ.");

      const buffer = Buffer.from(await blob.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value.substring(0, 20000);
    } else if (['txt', 'md', 'csv', 'json', 'note'].includes(cleanType)) {
      const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(docUrl);
      if (error || !blob) throw new Error("Không thể tải file văn bản từ kho lưu trữ.");

      text = (await blob.text()).substring(0, 20000);
    } else {
      throw new Error(`Định dạng .${cleanType} chưa hỗ trợ đọc sâu nội dung. Vui lòng dùng file PDF, Word (.docx), TXT, Ghi chú hoặc Link Web.`);
    }

    if (!text || text.trim().length < 5) {
      throw new Error("Nội dung tài liệu quá ngắn hoặc không có ký tự văn bản để phân tích.");
    }

    return { success: true, text: text.trim() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định khi trích xuất tài liệu";
    return { success: false, error: message };
  }
}

/**
 * 1. Hỏi đáp tương tác chuyên sâu trên tài liệu (Doc Q&A)
 * @param docTitle Tiêu đề tài liệu
 * @param docText Trích đoạn hoặc nội dung tài liệu
 * @param question Câu hỏi của người dùng
 * @param history Lịch sử các lượt hỏi đáp gần đây (tuỳ chọn)
 */
export async function askDocumentQuestion(
  docTitle: string, 
  docText: string, 
  question: string,
  history: ChatMessage[] = []
): Promise<{ success: boolean; answer?: string; error?: string }> {
  try {
    const cleanQuestion = question?.trim();
    if (!cleanQuestion) {
      return { success: false, error: "Vui lòng nhập câu hỏi." };
    }

    const trimmedText = (docText || '').substring(0, 25000);
    const historyText = (history || [])
      .slice(-6)
      .map(h => `${h.role === 'user' ? 'Người dùng' : 'Trợ lý AI'}: ${h.text}`)
      .join('\n\n');

    const prompt = `Bạn là Trợ lý Học tập & Trí tuệ Tài liệu AI (Doc Intelligence AI) của không gian My Space.
Nhiệm vụ: Trả lời câu hỏi của người dùng dựa trên tài liệu "${docTitle}".

--- NỘI DUNG TÀI LIỆU ---
${trimmedText ? trimmedText : "(Không có văn bản chi tiết kèm theo, hãy trả lời tốt nhất theo ngữ cảnh)"}

${historyText ? `--- LỊCH SỬ TRAO ĐỔI TRƯỚC ĐÓ ---\n${historyText}\n` : ""}

--- CÂU HỎI MỚI CỦA NGƯỜI DÙNG ---
${cleanQuestion}

YÊU CẦU TRẢ LỜI:
1. Đọc kỹ nội dung tài liệu và trả lời thật chi tiết, chính xác, khách quan bằng tiếng Việt.
2. Trình bày đẹp mắt theo định dạng Markdown: Sử dụng tiêu đề nhỏ (###), gạch đầu dòng rõ ràng, in đậm các từ khóa quan trọng và khối code nếu là mã lập trình.
3. Nếu câu hỏi liên quan đến nội dung không có trong tài liệu:
   - Hãy nói rõ rằng tài liệu không đề cập phần này.
   - Sau đó giải thích bổ sung ngắn gọn dựa trên tri thức tổng quát để hỗ trợ người dùng.
4. Giữ giọng điệu thân thiện, súc tích, mang tính học thuật và hỗ trợ cao.`;

    const answer = await callGeminiSafe({
      contents: prompt,
      timeoutMs: 25000
    });

    return { success: true, answer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi trao đổi với AI.";
    return { success: false, error: message };
  }
}

/**
 * 2. Tự động trích xuất các khái niệm chính, định nghĩa, công thức thành danh sách Flashcards
 * @param docTitle Tiêu đề tài liệu
 * @param docText Trích đoạn hoặc nội dung tài liệu
 */
export async function generateFlashcards(
  docTitle: string, 
  docText: string
): Promise<{ success: boolean; flashcards?: DocFlashcard[]; error?: string }> {
  try {
    const trimmedText = (docText || '').substring(0, 25000);
    if (!trimmedText || trimmedText.length < 10) {
      return { 
        success: false, 
        error: "Nội dung tài liệu không đủ dài để tạo bộ thẻ ghi nhớ Flashcard." 
      };
    }

    const prompt = `Bạn là chuyên gia sư phạm và phương pháp học Active Recall (Gợi nhớ chủ động).
Dựa trên tài liệu "${docTitle}", hãy trích xuất từ 6 đến 12 khái niệm cốt lõi, thuật ngữ, định nghĩa hoặc công thức quan trọng nhất để tạo bộ thẻ Flashcards ôn thi và ghi nhớ sâu.

YÊU CẦU:
- Mặt trước ("front"): Là câu hỏi, thuật ngữ, định lý hoặc bài toán ngắn gọn.
- Mặt sau ("back"): Là câu trả lời, định nghĩa, công thức hoặc giải thích súc tích, dễ nhớ.
- Phân loại ("tag"): Thẻ thuộc nhóm nào (ví dụ: "Định nghĩa", "Công thức", "Khái niệm", "Lưu ý", "Ứng dụng").
- Cung cấp "id": Định danh duy nhất cho từng thẻ (ví dụ: "fc-1", "fc-2", ...).

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON MẢNG (ARRAY OF OBJECTS), KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO NGOÀI JSON:
[
  {
    "id": "fc-1",
    "front": "Thuật ngữ hoặc câu hỏi?",
    "back": "Định nghĩa, giải thích chi tiết...",
    "tag": "Khái niệm"
  }
]

NỘI DUNG TÀI LIỆU:
${trimmedText}`;

    const text = await callGeminiSafe({
      contents: prompt,
      isJson: true,
      timeoutMs: 25000
    });

    let raw = text.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Dữ liệu flashcards trả về không đúng cấu trúc danh sách.");
    }

    const flashcards: DocFlashcard[] = parsed.map((item, index) => ({
      id: item.id || `fc-${index + 1}-${Date.now()}`,
      front: String(item.front || item.term || item.question || '').trim(),
      back: String(item.back || item.definition || item.answer || '').trim(),
      tag: item.tag ? String(item.tag).trim() : 'Cốt lõi'
    })).filter(fc => fc.front.length > 0 && fc.back.length > 0);

    if (flashcards.length === 0) {
      throw new Error("AI không trích xuất được flashcard hợp lệ từ tài liệu này.");
    }

    return { success: true, flashcards };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo bộ Flashcards.";
    return { success: false, error: message };
  }
}
