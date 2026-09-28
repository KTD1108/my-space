"use server"
import { GoogleGenAI } from '@google/genai';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Vui lòng cấu hình GEMINI_API_KEY trong file .env.local để kích hoạt Trợ lý AI.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function guessMusicGenre(songTitle: string) {
  try {
    const ai = getAIClient();
    const prompt = `Bạn là một chuyên gia âm nhạc. Dựa vào tên bài hát hoặc liên kết "${songTitle}", hãy đoán thể loại nhạc của nó (Ví dụ: Pop, EDM, Lofi, Ballad, Rap...). Trả về ĐÚNG 1 TỪ HOẶC CỤM TỪ NGẮN NHẤT mô tả thể loại, tuyệt đối không giải thích thêm.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/[\[\]"']/g, ''); // Xóa các dấu ngoặc nếu AI lỡ trả về
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function categorizeDoc(docTitle: string) {
  try {
    const ai = getAIClient();
    const prompt = `Dựa vào tên tài liệu hoặc liên kết URL sau: "${docTitle}", hãy phân loại nó thuộc chủ đề gì (Ví dụ: Lập trình, Toán học, Giải trí, Kinh tế, Ngoại ngữ, Khác...). Trả về đúng 1 cụm từ ngắn gọn làm tên Danh mục, tuyệt đối không giải thích.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim().replace(/[\[\]"']/g, '');
  } catch (error: any) {
    throw new Error(error.message);
  }
}
