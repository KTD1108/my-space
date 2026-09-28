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

export async function guessMusicGenre(songTitle: string) {
  try {
    const ai = getAIClient();
    const prompt = `Bạn là một chuyên gia âm nhạc. Dựa vào tên bài hát hoặc liên kết "${songTitle}", hãy đoán thể loại nhạc của nó (Ví dụ: Pop, EDM, Lofi, Ballad, Rap...). Trả về ĐÚNG 1 TỪ HOẶC CỤM TỪ NGẮN NHẤT mô tả thể loại, tuyệt đối không giải thích thêm.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return (response.text || '').trim().replace(/[\[\]"']/g, ''); 
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
    return (response.text || '').trim().replace(/[\[\]"']/g, '');
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function generateDocSummary(docId: string, docType: string, docUrl: string) {
  try {
    const ai = getAIClient();
    let contentToSummarize = "";

    if (docType === 'link') {
      const res = await fetch(docUrl);
      const html = await res.text();
      contentToSummarize = html.replace(/<[^>]*>?/gm, ' ').substring(0, 15000); 
    } else if (docType === 'pdf') {
      const pdfParseModule = require('pdf-parse');
      const pdfParse = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
      
      const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
      if (!urlData?.signedUrl) throw new Error("Không thể truy cập file PDF.");
      
      const res = await fetch(urlData.signedUrl);
      const buffer = await res.arrayBuffer();
      
      const parsed = await pdfParse(Buffer.from(buffer));
      contentToSummarize = parsed.text.substring(0, 15000); 
    } else if (docType === 'docx') {
      const mammothModule = require('mammoth');
      const mammoth = typeof mammothModule.extractRawText === 'function' ? mammothModule : mammothModule.default;
      
      const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
      if (!urlData?.signedUrl) throw new Error("Không thể truy cập file Word.");
      
      const res = await fetch(urlData.signedUrl);
      const buffer = await res.arrayBuffer();
      
      const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      contentToSummarize = result.value.substring(0, 15000);
    } else if (['txt', 'md', 'csv', 'json'].includes(docType?.toLowerCase())) {
      const { data: urlData } = await supabaseAdmin.storage.from('personal_files').createSignedUrl(docUrl, 60);
      if (!urlData?.signedUrl) throw new Error("Không thể truy cập file văn bản.");
      
      const res = await fetch(urlData.signedUrl);
      contentToSummarize = (await res.text()).substring(0, 15000);
    } else {
      throw new Error(`Định dạng .${docType} hiện tại chưa được AI hỗ trợ. Vui lòng sử dụng PDF, Word (.docx), TXT, hoặc Link Website.`);
    }

    if (!contentToSummarize || contentToSummarize.trim().length < 20) {
      throw new Error("Nội dung tài liệu quá ngắn hoặc bị bảo mật trống, AI không thể đọc được.");
    }

    const prompt = `Hãy đóng vai một chuyên gia phân tích. Tóm tắt nội dung tài liệu sau đây một cách súc tích, dễ hiểu, bằng tiếng Việt (khoảng 3-5 câu). Trình bày rõ ràng các ý chính:\n\n${contentToSummarize}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const summary = (response.text || '').trim();
    
    // Lưu lại vào database để lần sau không cần gọi AI nữa
    const supabase = await createClient();
    await supabase.from('documents').update({ ai_summary: summary }).eq('id', docId);

    return summary;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
