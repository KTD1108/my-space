"use server";

import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '@/lib/supabase-server';

export interface PhotoAIAnalysisResult {
  description: string;
  tags: string[];
  suggestedCategory: string;
}

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong file .env.local để kích hoạt Trợ lý AI.");
  }
  return new GoogleGenAI({ apiKey });
}

// Danh sách mô hình hỗ trợ Multimodal Vision ưu tiên
const VISION_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

/**
 * Server Action: Phân tích hình ảnh bằng Google Gemini Vision AI
 * @param imageUrl URL truy cập công khai (hoặc đường dẫn Supabase Storage) của bức ảnh
 * @returns Mô tả ngắn, danh sách tags và danh mục gợi ý
 */
export async function analyzePhotoAI(imageUrl: string): Promise<PhotoAIAnalysisResult> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error("Đường dẫn hình ảnh không hợp lệ.");
  }

  let buffer: Buffer;
  let mimeType = 'image/jpeg';

  // 1. Tải nhị phân hình ảnh (từ Signed URL hoặc Storage)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      throw new Error(`Không thể tải hình ảnh từ URL: ${res.statusText}`);
    }
    const contentType = res.headers.get('content-type');
    if (contentType) {
      mimeType = contentType.split(';')[0].trim();
    }
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    const { data: blob, error } = await supabaseAdmin.storage.from('personal_files').download(imageUrl);
    if (error || !blob) {
      throw new Error("Không thể tải hình ảnh từ kho lưu trữ cá nhân.");
    }
    mimeType = blob.type || 'image/webp';
    const arrayBuf = await blob.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  }

  const base64Data = buffer.toString('base64');
  const ai = getAIClient();

  const prompt = `Bạn là một trợ lý AI phân tích hình ảnh chuyên nghiệp. 
Hãy quan sát kỹ bức ảnh này và trả về kết quả dưới định dạng JSON thuần túy theo cấu trúc sau:
{
  "description": "Mô tả ngắn gọn, sinh động, ý nghĩa về khung cảnh, chủ thể, màu sắc và cảm xúc của bức ảnh bằng tiếng Việt (2-3 câu).",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedCategory": "Kỷ niệm | Chuyến đi | Học tập & Công việc | Gia đình"
}
Lưu ý: Chỉ trả về JSON hợp lệ, không bọc markdown hay thêm bất kỳ chữ nào ngoài JSON.`;

  const contents = [
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType || 'image/jpeg',
      },
    },
    {
      text: prompt,
    },
  ];

  let lastError: Error | null = null;
  const timeoutMs = 18000;

  for (const model of VISION_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) khi gọi model ${model}`)), timeoutMs)
        );

        const apiPromise = ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        let rawText = response?.text?.trim() || '';

        if (!rawText) continue;

        // Dọn dẹp markdown bọc ngoài nếu có
        if (rawText.startsWith('```json')) rawText = rawText.slice(7);
        if (rawText.startsWith('```')) rawText = rawText.slice(3);
        if (rawText.endsWith('```')) rawText = rawText.slice(0, -3);
        rawText = rawText.trim();

        try {
          const parsed = JSON.parse(rawText);
          return {
            description: parsed.description || "Khoảnh khắc đáng nhớ.",
            tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()) : [],
            suggestedCategory: parsed.suggestedCategory || "Kỷ niệm",
          };
        } catch {
          return {
            description: rawText,
            tags: ["khoảnh khắc", "kỷ niệm", "ảnh đẹp"],
            suggestedCategory: "Kỷ niệm",
          };
        }
      } catch (err: unknown) {
        lastError = err as Error;
        const errMsg = (err as Error)?.message || '';
        const status = (err as { status?: number })?.status;

        // Nếu model không tồn tại trên endpoint, chuyển ngay sang model tiếp theo
        if (status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          break;
        }

        // Nếu dính rate limit hoặc 503, chờ một chút rồi thử lại
        if (status === 503 || status === 429 || errMsg.includes('demand')) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        // Lỗi khác: chuyển sang model dự phòng
        break;
      }
    }
  }

  throw lastError || new Error("Không thể phân tích ảnh bằng Trợ lý AI lúc này. Vui lòng thử lại sau.");
}
