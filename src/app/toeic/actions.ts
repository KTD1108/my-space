"use server";

import { GoogleGenAI } from '@google/genai';
import { DailyVocabSet, ToeicQuizQuestion, ToeicWord } from './types';

const PREFERRED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-3.5-flash'
];

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong .env.local để kích hoạt sinh từ vựng TOEIC bằng AI.");
  }
  return new GoogleGenAI({ apiKey });
}

async function callGeminiSafe(prompt: string, timeoutMs = 15000): Promise<{ text: string; model: string }> {
  const ai = getAIClient();
  let lastError: Error | null = null;

  for (const model of PREFERRED_MODELS) {
    try {
      // Cho gemini-3.8-flash tối đa 7s để thử; nếu bận/hết quota chuyển ngay sang 3.5-flash-lite
      const currentTimeout = model === 'gemini-3.8-flash' ? Math.min(timeoutMs, 7000) : timeoutMs;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout (${currentTimeout}ms) khi gọi model ${model}`)), currentTimeout)
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
      if (text) {
        return { text, model };
      }
    } catch (err: unknown) {
      lastError = err as Error;
      // Fallback ngay lập tức sang model dự phòng tiếp theo
      continue;
    }
  }

  throw lastError || new Error("Không thể kết nối đến Trợ lý AI TOEIC. Vui lòng thử lại sau.");
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
  }
  return cleaned;
}

const TOEIC_TOPICS = [
  "Contracts & Negotiations (Hợp đồng & Đàm phán)",
  "Human Resources & Recruitment (Nhân sự & Tuyển dụng)",
  "Corporate Finance & Accounting (Tài chính & Kế toán doanh nghiệp)",
  "Shipping, Cargo & Logistics (Vận chuyển & Chuỗi cung ứng)",
  "Marketing, Branding & Sales (Tiếp thị & Bán hàng)",
  "Office Technology & Communications (Công nghệ & Giao tiếp văn phòng)",
  "Travel, Conferences & Hospitality (Du lịch, Hội nghị & Khách sạn)",
  "Manufacturing, Production & Quality Control (Sản xuất & Quản lý chất lượng)",
  "Customer Support & Client Services (Chăm sóc khách hàng)",
  "Real Estate & Property Management (Bất động sản & Cơ sở vật chất)"
];

function selectTopicForDate(dateStr: string): string {
  const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TOEIC_TOPICS[hash % TOEIC_TOPICS.length];
}

export async function getDailyToeicVocabAI(
  dateStr: string,
  customTopic?: string,
  wordCount: number = 6
): Promise<{ success: boolean; data?: DailyVocabSet; error?: string }> {
  try {
    const validCount = Math.max(3, Math.min(15, Number(wordCount) || 6));
    const chosenTopic = customTopic?.trim() || selectTopicForDate(dateStr);

    const prompt = `Bạn là Chuyên gia Khảo thí và Giảng viên luyện thi TOEIC hàng đầu (ETS Certified Master).
Nhiệm vụ: Hãy tạo một bộ gồm chính xác ${validCount} từ vựng TOEIC cốt lõi (Band điểm mục tiêu 650 - 850+) cho ngày: ${dateStr}.
Chủ đề bài học: "${chosenTopic}".

YÊU CẦU BẮT BUỘC CHO MỖI TỪ VỰNG:
1. "word": Từ vựng tiếng Anh chuẩn xác (viết hoa/thường chuẩn).
2. "ipa": Phiên âm quốc tế IPA chuẩn Anh - Mỹ (ví dụ: "/ˌriːnɪˈɡəʊʃieɪt/").
3. "partOfSpeech": Loại từ tiếng Anh (noun, verb, adjective, adverb, preposition, phrase).
4. "meaningVi": Nghĩa tiếng Việt thông dụng, sát ngữ cảnh công sở TOEIC.
5. "topic": Tên chủ đề ngắn gọn bằng tiếng Việt.
6. "exampleEn": Một câu ví dụ tiếng Anh thực tế trong đề thi TOEIC Part 5, 6 hoặc 7 (sử dụng từ vựng này).
7. "exampleVi": Dịch nghĩa câu ví dụ trên sang tiếng Việt tự nhiên, chính xác.
8. "wordFamily": Mảng 2-3 từ cùng họ gia đình từ (gồm "word", "partOfSpeech", "meaningVi").
9. "collocations": Mảng 2-3 cụm từ hay đi kèm thường gặp trong bài thi TOEIC (ví dụ: ["reach an agreement", "contract renewal"]).
10. "toeicTip": 1 mẹo nhỏ thực chiến giải đề TOEIC cho từ vựng này (cách nhận biết bẫy từ loại, giới từ đi kèm, hoặc ngữ cảnh thường xuất hiện).

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON THEO CẤU TRÚC SAU (không trả về markdown hoặc văn bản giải thích thừa):
{
  "topic": "${chosenTopic}",
  "words": [
    {
      "id": "toeic-${dateStr}-1",
      "word": "implement",
      "ipa": "/ˈɪmplɪment/",
      "partOfSpeech": "verb",
      "meaningVi": "thực hiện, thi hành, áp dụng (kế hoạch, chính sách)",
      "topic": "${chosenTopic}",
      "exampleEn": "The board decided to implement new safety policies across all regional factories.",
      "exampleVi": "Hội đồng quản trị đã quyết định áp dụng các chính sách an toàn mới trên toàn bộ nhà máy khu vực.",
      "wordFamily": [
        { "word": "implementation", "partOfSpeech": "noun", "meaningVi": "sự thi hành, sự triển khai" },
        { "word": "implementable", "partOfSpeech": "adjective", "meaningVi": "có thể thực hiện được" }
      ],
      "collocations": ["implement a policy", "implement changes", "successfully implement"],
      "toeicTip": "Thường đi với tân ngữ là policy, plan, strategy. Trong Part 5, sau decide to thường là động từ nguyên mẫu implement."
    }
  ]
}`;

    const timeoutMs = Math.max(15000, validCount * 1800);
    const res = await callGeminiSafe(prompt, timeoutMs);
    const cleaned = cleanJsonText(res.text);
    const parsed = JSON.parse(cleaned);

    const words: ToeicWord[] = (parsed.words || []).map((item: Partial<ToeicWord>, index: number) => ({
      id: item.id || `toeic-${dateStr}-${index + 1}`,
      word: item.word || '',
      ipa: item.ipa || '',
      partOfSpeech: item.partOfSpeech || 'noun',
      meaningVi: item.meaningVi || '',
      topic: item.topic || chosenTopic,
      exampleEn: item.exampleEn || '',
      exampleVi: item.exampleVi || '',
      wordFamily: Array.isArray(item.wordFamily) ? item.wordFamily : [],
      collocations: Array.isArray(item.collocations) ? item.collocations : [],
      toeicTip: item.toeicTip || ''
    }));

    if (words.length === 0) {
      throw new Error("AI không trả về danh sách từ vựng hợp lệ.");
    }

    const data: DailyVocabSet = {
      dateStr,
      topic: parsed.topic || chosenTopic,
      words,
      generatedAt: new Date().toISOString(),
      modelUsed: res.model
    };

    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo từ vựng TOEIC hàng ngày.";
    console.error("[getDailyToeicVocabAI Error]:", message);
    return { success: false, error: message };
  }
}

export async function generateToeicQuizAI(
  words: ToeicWord[],
  questionCount?: number
): Promise<{ success: boolean; quiz?: ToeicQuizQuestion[]; error?: string }> {
  try {
    if (!words || words.length === 0) {
      return { success: false, error: "Danh sách từ vựng trống, không thể tạo bài kiểm tra." };
    }

    const qCount = Math.max(2, Math.min(words.length, questionCount || 5));
    const wordsSummary = words.map(w => `- ${w.word} (${w.partOfSpeech}): ${w.meaningVi}`).join('\n');

    const prompt = `Bạn là Chuyên gia Khảo thí TOEIC. Dựa trên danh sách ${words.length} từ vựng sau đây:
${wordsSummary}

Hãy biên soạn ${qCount} câu hỏi trắc nghiệm chuẩn TOEIC Part 5 (Incomplete Sentences / Điền từ vào chỗ trống).
Mỗi câu hỏi phải:
- Kiểm tra trực tiếp một trong các từ vựng trên (hoặc dạng từ word family của nó).
- Có ngữ cảnh môi trường công sở, kinh doanh quốc tế sát với format đề thi thật.
- Có 4 đáp án A, B, C, D (options là mảng 4 chuỗi, ví dụ: ["A. implement", "B. implementation", "C. implementing", "D. implemented"]).
- "correctAnswer" là số nguyên từ 0 đến 3 (tương ứng với A=0, B=1, C=2, D=3).
- "explanation" giải thích ngắn gọn, rõ ràng bằng tiếng Việt vì sao chọn đáp án đó và dịch câu hoàn chỉnh.

TRẢ VỀ ĐÚNG JSON MẢNG:
[
  {
    "id": "quiz-1",
    "targetWord": "implement",
    "question": "The management team has decided to _______ new security measures starting next month.",
    "options": ["A. implement", "B. implementation", "C. implementable", "D. implementing"],
    "correctAnswer": 0,
    "explanation": "Sau 'decided to' cần một động từ nguyên mẫu (V-inf). 'Implement' là động từ mang nghĩa áp dụng, thực hiện."
  }
]`;

    const timeoutMs = Math.max(12000, qCount * 2500);
    const res = await callGeminiSafe(prompt, timeoutMs);
    const cleaned = cleanJsonText(res.text);
    const quiz: ToeicQuizQuestion[] = JSON.parse(cleaned);

    return { success: true, quiz };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Đã xảy ra lỗi khi tạo bài thi trắc nghiệm TOEIC.";
    console.error("[generateToeicQuizAI Error]:", message);
    return { success: false, error: message };
  }
}
