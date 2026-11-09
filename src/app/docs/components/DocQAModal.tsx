"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  HelpCircle, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import MarkdownContent from "./MarkdownContent";
import { askDocumentQuestion, getDocumentText, ChatMessage } from "../actions";

export interface DocQAModalDoc {
  id: string;
  title: string;
  type: string;
  url: string;
  publicUrl?: string;
}

interface DocQAModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocQAModalDoc | null;
  initialText?: string;
}

export default function DocQAModal({ isOpen, onClose, doc, initialText }: DocQAModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [docContent, setDocContent] = useState<string>(initialText || "");
  const [isLoadingDocText, setIsLoadingDocText] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingAnswer]);

  const fetchText = useCallback(async (type: string, url: string) => {
    setIsLoadingDocText(true);
    try {
      const res = await getDocumentText(type, url);
      if (res.success && res.text) {
        setDocContent(res.text);
      } else {
        setDocContent("");
        if (res.error) {
          toast.error(`Trích xuất văn bản: ${res.error}`);
        }
      }
    } catch {
      setDocContent("");
    } finally {
      setIsLoadingDocText(false);
    }
  }, []);

  // Khởi tạo trạng thái khi mở modal
  useEffect(() => {
    if (!isOpen || !doc) return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      setMessages([]);
      setInputQuestion("");
      setIsLoadingAnswer(false);

      if (initialText) {
        setDocContent(initialText);
      } else {
        fetchText(doc.type, doc.url);
      }

      inputRef.current?.focus();
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, doc, initialText, fetchText]);

  if (!isOpen || !doc) return null;

  const handleSendQuestion = async (customQuestion?: string) => {
    const q = (customQuestion || inputQuestion).trim();
    if (!q || isLoadingAnswer) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", text: q }];
    setMessages(newMessages);
    setInputQuestion("");
    setIsLoadingAnswer(true);

    try {
      const res = await askDocumentQuestion(
        doc.title,
        docContent,
        q,
        messages
      );

      if (res.success && res.answer) {
        setMessages([...newMessages, { role: "assistant", text: res.answer }]);
      } else {
        const errorMsg = res.error || "Không thể nhận phản hồi từ AI. Vui lòng thử lại.";
        toast.error(errorMsg);
        setMessages([
          ...newMessages,
          { 
            role: "assistant", 
            text: `⚠️ **Đã xảy ra lỗi:** ${errorMsg}` 
          }
        ]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Đã có lỗi kết nối đến máy chủ AI.";
      toast.error(errorMsg);
      setMessages([
        ...newMessages,
        { 
          role: "assistant", 
          text: `⚠️ **Không thể kết nối đến AI:** ${errorMsg}` 
        }
      ]);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Đã sao chép câu trả lời!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Không thể sao chép văn bản.");
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    toast.success("Đã làm mới cuộc hội thoại");
  };

  const SUGGESTED_QUESTIONS = [
    "Tóm tắt 3 luận điểm chính của tài liệu này?",
    "Các định nghĩa và thuật ngữ cốt lõi là gì?",
    "Có công thức, quy tắc hay lưu ý quan trọng nào cần nhớ?",
    "Đưa ra ví dụ thực tế giúp tôi hiểu tài liệu dễ hơn"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[88vh] max-h-[820px] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Bot size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate max-w-sm sm:max-w-md">
                  {doc.title}
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles size={12} className="text-amber-500 shrink-0" />
                <span>Doc Intelligence • Hỏi đáp ngữ cảnh tài liệu</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw size={17} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Nội dung danh sách chat */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/40 dark:bg-slate-900/40">
          
          {/* Thông báo trạng thái đọc dữ liệu tài liệu */}
          {isLoadingDocText && (
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-700 dark:text-blue-300">
              <Loader2 size={16} className="animate-spin shrink-0 text-blue-600" />
              <span>Đang trích xuất nội dung văn bản từ tài liệu ({doc.type.toUpperCase()})...</span>
            </div>
          )}

          {!isLoadingDocText && !docContent && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>Không tìm thấy nội dung văn bản trích xuất trực tiếp. AI sẽ trả lời dựa theo tiêu đề và ngữ cảnh liên quan.</span>
            </div>
          )}

          {/* Màn hình khởi đầu khi chưa có tin nhắn */}
          {messages.length === 0 ? (
            <div className="py-8 sm:py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 shadow-sm">
                <FileText size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100">
                  Hỏi bất kỳ điều gì về &quot;{doc.title}&quot;
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Trợ lý AI đã ghi nhớ ngữ cảnh. Hãy đặt câu hỏi để tìm kiếm nhanh, giải thích công thức hoặc tóm tắt ý chính.
                </p>
              </div>

              {/* Gợi ý câu hỏi */}
              <div className="w-full pt-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left">
                  Gợi ý câu hỏi nhanh:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_QUESTIONS.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendQuestion(sug)}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-200 transition-all text-left flex items-start gap-2 shadow-2xs hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer group"
                    >
                      <HelpCircle size={15} className="text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                      <span className="leading-snug">{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Danh sách các tin nhắn đã trao đổi
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} group`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Bot size={17} />
                    </div>
                  )}

                  <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[88%] sm:max-w-[80%]`}>
                    <div
                      className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-xs font-medium"
                          : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <MarkdownContent content={msg.text} />
                      )}
                    </div>

                    {!isUser && (
                      <div className="flex items-center gap-2 mt-1.5 px-2 text-[11px] text-slate-400">
                        <button
                          onClick={() => handleCopy(msg.text, index)}
                          className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Sao chép câu trả lời"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={17} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Hiệu ứng đang chờ AI phản hồi */}
          {isLoadingAnswer && (
            <div className="flex gap-3 justify-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Bot size={17} />
              </div>
              <div className="p-4 bg-white dark:bg-slate-800/90 rounded-3xl rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 size={16} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span>AI đang đọc ngữ cảnh tài liệu và xây dựng câu trả lời...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Thanh nhập câu hỏi */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 pl-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all shadow-2xs"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Đặt câu hỏi về nội dung tài liệu... (Nhấn Enter)"
              disabled={isLoadingAnswer}
              className="w-full bg-transparent outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputQuestion.trim() || isLoadingAnswer}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-sm shadow-blue-600/20"
            >
              <Send size={15} />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span>Mẹo: Đặt câu hỏi cụ thể theo phần hoặc từ khóa để có câu trả lời sâu nhất.</span>
            <span>Esc để đóng</span>
          </div>
        </div>

      </div>
    </div>
  );
}
