"use server";

import { GoogleGenAI } from '@google/genai';
import { StudyPlanSession, GenerateStudyPlanResponse } from './types';
import { getLocalDateStr } from './utils';

const PREFERRED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash'
];

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong biến môi trường (.env.local) để sử dụng Trợ lý AI.");
  }
  return new GoogleGenAI({ apiKey });
}

async function callGenAISafe(prompt: string, timeoutMs = 20000): Promise<string> {
  const ai = getAIClient();
  let lastError: Error | null = null;

  for (const model of PREFERRED_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Hết thời gian chờ (${timeoutMs}ms) khi gọi model ${model}`)), timeoutMs)
        );

        const apiPromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        const text = response?.text?.trim();
        if (text) return text;
      } catch (err: unknown) {
        lastError = err as Error;
        const errMsg = lastError.message || '';
        const status = (err as { status?: number })?.status;

        // Model không hỗ trợ hoặc không tìm thấy, chuyển sang model kế tiếp
        if (status === 404 || errMsg.includes('not found') || errMsg.includes('no longer available')) {
          break;
        }

        // Tạm thời quá tải hoặc rate limit, chờ backoff
        if (status === 503 || status === 429 || errMsg.includes('demand')) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }

        break;
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến Trợ lý AI. Vui lòng thử lại sau.");
}

/**
 * Trợ lý AI Xếp lịch học và ôn tập tự động dựa trên Môn học, Deadline và Số giờ/ngày
 */
export async function generateStudyPlanAI(
  subject: string,
  deadline: string,
  availableHoursPerDay = 2
): Promise<GenerateStudyPlanResponse> {
  const cleanSubject = subject.trim();
  if (!cleanSubject) {
    return {
      success: false,
      message: "Vui lòng nhập tên môn học hoặc kỳ thi cần lập lịch.",
      sessions: []
    };
  }

  const todayStr = getLocalDateStr();
  if (!deadline || deadline < todayStr) {
    return {
      success: false,
      message: "Hạn chót / Ngày thi phải lớn hơn hoặc bằng ngày hôm nay.",
      sessions: []
    };
  }

  const safeHours = Math.max(1, Math.min(Math.round(availableHoursPerDay), 8));

  const prompt = `Bạn là một chuyên gia cố vấn học tập và phương pháp học Spaced Repetition (Lặp lại ngắt quãng).
Hãy lập một thời gian biểu học và ôn tập chi tiết cho học sinh/sinh viên.

Thông tin:
- Môn học / Mục tiêu: "${cleanSubject}"
- Hôm nay: ${todayStr}
- Hạn chót / Ngày thi: ${deadline}
- Thời gian học mỗi ngày: ${safeHours} giờ/ngày.

Yêu cầu chi tiết:
1. Phân bổ các buổi học từ ngày hôm nay (${todayStr}) cho đến ngày ${deadline}.
2. Mỗi ngày có thể bố trí 1 hoặc 2 buổi học với tổng thời lượng khoảng ${safeHours} giờ (ví dụ: 19:30 - 21:30 hoặc 08:00 - 10:00).
3. Tiêu đề buổi học (title) cần súc tích, mang tính hành động (Ví dụ: "[${cleanSubject}] Ôn tập lý thuyết chương 1", "[${cleanSubject}] Giải bài tập & Luyện đề 1").
4. Mô tả (description) nêu rõ mục tiêu và tài liệu/nhiệm vụ cần đạt được trong buổi học.
5. Màu sắc (color): Chọn 1 trong các màu sau: 'blue', 'purple', 'pink', 'orange', 'green'.
6. Định dạng đầu ra JSON duy nhất:
{
  "summary": "Tóm tắt ngắn gọn lộ trình và chiến lược học tập (1-2 câu tiếng Việt)",
  "sessions": [
    {
      "title": "Tên buổi học",
      "description": "Nội dung ôn tập chi tiết",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "color": "blue"
    }
  ]
}`;

  try {
    const rawResult = await callGenAISafe(prompt);
    const cleanedJson = rawResult
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedJson);
    const sessions: StudyPlanSession[] = Array.isArray(parsed.sessions)
      ? parsed.sessions.map((s: Partial<StudyPlanSession>) => ({
          title: String(s.title || `Ôn tập ${cleanSubject}`),
          description: String(s.description || ''),
          date: String(s.date || todayStr),
          start_time: String(s.start_time || '19:30').substring(0, 5),
          end_time: String(s.end_time || '21:30').substring(0, 5),
          color: ['blue', 'purple', 'pink', 'orange', 'green'].includes(s.color || '') ? (s.color as string) : 'blue'
        }))
      : [];

    return {
      success: true,
      summary: parsed.summary || `Lộ trình ôn tập cho môn ${cleanSubject}`,
      sessions
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[generateStudyPlanAI] Lỗi gọi AI:", err);
    return {
      success: false,
      message: err.message || "Không thể khởi tạo lộ trình học từ AI lúc này. Vui lòng thử lại.",
      sessions: []
    };
  }
}
