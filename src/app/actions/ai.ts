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

// Hàm trích xuất văn bản từ nhiều định dạng tài liệu
async function extractDocText(docType: string, docUrl: string): Promise<string> {
  let text = "";

  if (docType === 'link') {
    const res = await fetch(docUrl);
    const html = await res.text();
    text = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 16000); 
  } else if (docType === 'pdf') {
    if (typeof global !== 'undefined' && typeof (global as any).DOMMatrix === 'undefined') {
      (global as any).DOMMatrix = class DOMMatrix { constructor() {} };
    }
    const pdfParseModule = require('pdf-parse/lib/pdf-parse.js');
    const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
    
    const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
    if (!urlData?.signedUrl) throw new Error("Không thể truy cập file PDF từ kho lưu trữ.");
    
    const res = await fetch(urlData.signedUrl);
    const buffer = await res.arrayBuffer();
    
    const parsed = await pdfParse(Buffer.from(buffer));
    text = parsed.text.substring(0, 16000); 
  } else if (docType === 'docx') {
    const mammothModule = require('mammoth');
    const mammoth = typeof mammothModule.extractRawText === 'function' ? mammothModule : mammothModule.default;
    
    const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
    if (!urlData?.signedUrl) throw new Error("Không thể truy cập file Word từ kho lưu trữ.");
    
    const res = await fetch(urlData.signedUrl);
    const buffer = await res.arrayBuffer();
    
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    text = result.value.substring(0, 16000);
  } else if (['txt', 'md', 'csv', 'json'].includes(docType?.toLowerCase())) {
    const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
    if (!urlData?.signedUrl) throw new Error("Không thể truy cập file văn bản.");
    
    const res = await fetch(urlData.signedUrl);
    text = (await res.text()).substring(0, 16000);
  } else {
    throw new Error(`Định dạng .${docType} chưa được hỗ trợ đọc sâu. Vui lòng dùng file PDF, Word (.docx), TXT, hoặc Link Web.`);
  }

  if (!text || text.trim().length < 20) {
    throw new Error("Nội dung tài liệu quá ngắn hoặc là file ảnh scan chưa có lớp ký tự.");
  }

  return text;
}

export async function guessMusicGenre(songTitle: string) {
  try {
    const ai = getAIClient();
    const prompt = `Bạn là một chuyên gia âm nhạc. Dựa vào tên bài hát hoặc liên kết "${songTitle}", hãy đoán thể loại nhạc của nó (Ví dụ: Pop, EDM, Lofi, Ballad, Rap...). Trả về ĐÚNG 1 TỪ HOẶC CỤM TỪ NGẮN NHẤT mô tả thể loại, tuyệt đối không giải thích thêm.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return { success: true, data: (response.text || '').trim().replace(/[\[\]"']/g, '') }; 
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function categorizeDoc(docTitle: string) {
  try {
    const ai = getAIClient();
    const prompt = `Dựa vào tên tài liệu hoặc liên kết URL sau: "${docTitle}", hãy phân loại nó thuộc chủ đề gì (Ví dụ: Lập trình, Toán học, Giải trí, Kinh tế, Ngoại ngữ, Khác...). Trả về đúng 1 cụm từ ngắn gọn làm tên Danh mục, tuyệt đối không giải thích.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return { success: true, data: (response.text || '').trim().replace(/[\[\]"']/g, '') };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 1. TÓM TẮT TÀI LIỆU CỐT LÕI
export async function generateDocSummary(docId: string, docType: string, docUrl: string) {
  try {
    const ai = getAIClient();
    const content = await extractDocText(docType, docUrl);

    const prompt = `Hãy đóng vai một trợ lý học tập cao cấp. Tóm tắt nội dung tài liệu sau đây một cách súc tích, dễ hiểu, bằng tiếng Việt.
Yêu cầu:
- Nêu rõ 3 đến 5 ý cốt lõi quan trọng nhất dưới dạng gạch đầu dòng rõ ràng.
- Đưa ra 1 câu kết luận tổng kết giá trị của tài liệu.
Tài liệu:
${content}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    
    const summary = (response.text || '').trim();
    
    const supabase = await createClient();
    await supabase.from('documents').update({ ai_summary: summary }).eq('id', docId);

    return { success: true, data: summary };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    const ai = getAIClient();
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return { success: true, answer: (response.text || '').trim() };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    const ai = getAIClient();
    const content = await extractDocText(docType, docUrl);

    const prompt = `Dựa vào nội dung tài liệu sau, hãy tạo chính xác ${count} câu hỏi trắc nghiệm khách quan để kiểm tra kiến thức của người đọc.
Mỗi câu hỏi phải có:
- Nội dung câu hỏi rõ ràng.
- 4 phương án lựa chọn A, B, C, D (ghi rõ nội dung phương án).
- Chỉ số đáp án đúng (correctAnswer là số nguyên từ 0 đến 3 tương ứng với A, B, C, D).
- Lời giải thích ngắn gọn tại sao phương án đó đúng.

YÊU CẦU ĐẶC BIỆT: Trả về ĐÚNG định dạng JSON mảng (Array of objects), KHÔNG kèm bất kỳ lời dẫn hay giải thích thừa thãi nào ngoài JSON.
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let raw = (response.text || '').trim();
    // Dọn dẹp markdown code blocks nếu có
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();
    }

    const quiz: QuizQuestion[] = JSON.parse(raw);
    return { success: true, quiz };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. TỰ ĐỘNG TẠO THẺ GHI NHỚ (FLASHCARDS)
export interface Flashcard {
  front: string; // Khái niệm / Thuật ngữ
  back: string;  // Định nghĩa / Giải thích
}

export async function generateDocFlashcards(docType: string, docUrl: string) {
  try {
    const ai = getAIClient();
    const content = await extractDocText(docType, docUrl);

    const prompt = `Dựa vào tài liệu sau, hãy trích xuất 4 đến 6 khái niệm, định nghĩa hoặc công thức cốt lõi nhất để làm Thẻ ghi nhớ (Flashcard) ôn thi.
Mỗi thẻ gồm:
- "front": Khái niệm hoặc câu hỏi ngắn ở mặt trước thẻ.
- "back": Định nghĩa, câu trả lời hoặc ví dụ ở mặt sau thẻ (ngắn gọn, dễ nhớ).

Trả về ĐÚNG định dạng JSON mảng thuần túy:
[
  { "front": "Khái niệm A", "back": "Giải nghĩa ngắn gọn của khái niệm A..." }
]

Tài liệu:
${content}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let raw = (response.text || '').trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim();
    }

    const flashcards: Flashcard[] = JSON.parse(raw);
    return { success: true, flashcards };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
