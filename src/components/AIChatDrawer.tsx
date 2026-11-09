"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Bot, 
  User, 
  Send, 
  X, 
  RotateCcw, 
  Copy, 
  Check, 
  Loader2, 
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Code,
  BookOpen
} from "lucide-react";
import toast from "react-hot-toast";
import { askGeneralAI, AIChatMessage } from "@/app/actions/ai";
import { useMusic } from "@/context/MusicContext";

const STORAGE_KEY = "myspace_ai_chat_history_v1";

const QUICK_PROMPTS = [
  { icon: <BookOpen size={13} />, label: "Ôn thi", text: "Lập kế hoạch ôn thi nước rút trong 7 ngày bằng phương pháp Spaced Repetition" },
  { icon: <Sparkles size={13} />, label: "Feynman", text: "Giải thích phương pháp học Feynman và cách áp dụng khi đọc tài liệu khó" },
  { icon: <Code size={13} />, label: "Code", text: "Giải thích sự khác biệt giữa Promise, Async/Await và Callback trong JavaScript" },
  { icon: <HelpCircle size={13} />, label: "Ghi chú", text: "Hướng dẫn cách ghi chép phương pháp Cornell để dễ ôn tập" }
];

export default function AIChatDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Kiểm tra thanh nhạc toàn cục có đang hiển thị không để dời vị trí nút AI tránh đè lên nhau
  let isMusicActive = false;
  try {
    const music = useMusic();
    isMusicActive = !!music?.currentSong;
  } catch {
    isMusicActive = false;
  }

  // Khôi phục lịch sử chat từ localStorage khi tải trang
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn("Không thể tải lịch sử trò chuyện:", e);
    }
  }, []);

  // Lưu lịch sử chat vào localStorage mỗi khi có tin nhắn mới
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      console.warn("Không thể lưu lịch sử trò chuyện:", e);
    }
  }, [messages]);

  // Lắng nghe sự kiện mở chat toàn cục (từ CommandPalette hoặc nút khác)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => textareaRef.current?.focus(), 150);
    };

    window.addEventListener("open-ai-chat", handleOpen);
    return () => window.removeEventListener("open-ai-chat", handleOpen);
  }, []);

  // Tự động cuộn xuống tin nhắn cuối cùng
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Tự động focus textarea khi mở Drawer
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: AIChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await askGeneralAI(text, messages);
      if (res.success && res.data) {
        const assistantMessage: AIChatMessage = { role: "assistant", content: res.data };
        setMessages([...updatedMessages, assistantMessage]);
      } else {
        toast.error(res.error || "Không nhận được phản hồi từ AI.");
        const errorMessage: AIChatMessage = { 
          role: "assistant", 
          content: `⚠️ ${res.error || "Đã xảy ra sự cố khi kết nối đến AI. Vui lòng thử lại sau giây lát."}` 
        };
        setMessages([...updatedMessages, errorMessage]);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
      toast.error(errMsg);
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: `⚠️ Lỗi hệ thống: ${errMsg}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện hiện tại?")) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Đã làm mới cuộc hội thoại!");
    }
  };

  const handleCopyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success("Đã sao chép phản hồi!");
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Không thể sao chép văn bản.");
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <div className={`fixed ${isMusicActive ? "bottom-24 right-4 sm:right-6" : "bottom-6 right-6"} z-50 transition-all duration-300`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`group relative flex items-center gap-2.5 px-4 py-3 rounded-full text-white shadow-xl transition-all duration-300 cursor-pointer active:scale-95 ${
            isOpen 
              ? "bg-slate-800 dark:bg-slate-700 shadow-slate-900/30 ring-2 ring-blue-500/50" 
              : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 shadow-blue-500/30 hover:shadow-indigo-500/40 hover:scale-105"
          }`}
          aria-label="Trợ lý AI My Space"
          title="Mở Trợ lý AI My Space (Gemini Flash Lite)"
        >
          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <ChevronDown size={20} className="text-white transition-transform duration-200" />
            ) : (
              <>
                <Sparkles size={19} className="text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900"></span>
              </>
            )}
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-tight">
            {isOpen ? "Thu nhỏ AI" : "Trợ lý AI"}
          </span>
        </button>
      </div>

      {/* Slide-up Chat Drawer Modal */}
      {isOpen && (
        <div className={`fixed ${isMusicActive ? "bottom-38 right-4 sm:right-6" : "bottom-20 right-4 sm:right-6"} z-50 w-[92vw] sm:w-[420px] md:w-[460px] h-[78vh] max-h-[630px] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200`}>
          
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Bot size={19} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                    Trợ lý AI My Space
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                    Flash Lite
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                    Sẵn sàng giải đáp • 100% Miễn phí
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Xóa lịch sử chat"
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3.5 border border-blue-200/50 dark:border-blue-800/50 shadow-inner">
                  <Sparkles size={28} />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1.5">
                  Xin chào bạn! Mình có thể giúp gì?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                  Hỏi bài tập, tra cứu thuật ngữ, lập dàn ý thuyết trình hoặc nhờ gợi ý phương pháp học thông minh.
                </p>

                <div className="w-full space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left px-1">
                    Gợi ý bắt đầu nhanh:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {QUICK_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt.text)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-300 border border-slate-200/70 dark:border-slate-800 transition-all group cursor-pointer"
                      >
                        <span className="p-1 rounded-lg bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs group-hover:scale-105 transition-transform">
                          {prompt.icon}
                        </span>
                        <span className="truncate flex-1 font-medium">{prompt.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot size={15} />
                      </div>
                    )}

                    <div className={`relative group max-w-[86%] ${isUser ? "items-end" : "items-start"}`}>
                      <div
                        className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isUser
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-xs font-medium"
                            : "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/60 rounded-tl-xs shadow-2xs"
                        }`}
                      >
                        {msg.content}
                      </div>

                      {!isUser && (
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyText(msg.content, idx)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[11px] flex items-center gap-1 rounded-md transition-colors"
                            title="Sao chép câu trả lời"
                          >
                            {copiedIndex === idx ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedIndex === idx ? "Đã copy" : "Copy"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {loading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Bot size={15} />
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2 shadow-2xs">
                  <Loader2 size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  <span>Trợ lý AI đang suy nghĩ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Hỏi bất kỳ điều gì... (Enter để gửi)"
                  rows={2}
                  disabled={loading}
                  className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none outline-none max-h-28"
                />
              </div>

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-blue-600/20 shrink-0 active:scale-95"
                aria-label="Gửi tin nhắn"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span>Shift + Enter để xuống dòng</span>
              <span>Gemini 3.5 Flash Lite</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
