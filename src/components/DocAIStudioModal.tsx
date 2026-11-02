"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  MessageSquare, 
  HelpCircle, 
  Layers, 
  X, 
  Send, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  Bot,
  User,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  generateDocSummary, 
  askDocQuestion, 
  generateDocQuiz, 
  generateDocFlashcards,
  QuizQuestion,
  Flashcard 
} from "@/app/actions/ai";

interface DocAIStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: {
    id: string;
    title: string;
    type: string;
    url: string;
    ai_summary?: string;
  } | null;
  onSummaryUpdated?: () => void;
}

type TabType = "summary" | "chat" | "quiz" | "flashcards";

export default function DocAIStudioModal({ isOpen, onClose, doc, onSummaryUpdated }: DocAIStudioModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("summary");

  // SUMMARY STATE
  const [summary, setSummary] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // CHAT Q&A STATE
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [questionInput, setQuestionInput] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  // QUIZ STATE
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanations, setShowExplanations] = useState<Record<number, boolean>>({});

  // FLASHCARDS STATE
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Khởi tạo khi mở modal
  useEffect(() => {
    if (isOpen && doc) {
      setActiveTab("summary");
      setChatMessages([]);
      setQuizQuestions([]);
      setFlashcards([]);
      setSelectedAnswers({});
      setShowExplanations({});
      setCurrentCardIndex(0);
      setIsFlipped(false);

      if (doc.ai_summary) {
        setSummary(doc.ai_summary);
      } else {
        handleLoadSummary();
      }
    }
  }, [isOpen, doc]);

  const handleLoadSummary = async () => {
    if (!doc) return;
    setLoadingSummary(true);
    try {
      const res = await generateDocSummary(doc.id, doc.type, doc.url);
      if (res.success && res.data) {
        setSummary(res.data);
        if (onSummaryUpdated) onSummaryUpdated();
      } else {
        setSummary("Lỗi AI: " + (res.error || "Không thể tạo tóm tắt."));
      }
    } catch (e: any) {
      setSummary("Lỗi: " + e.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSendQuestion = async (customQ?: string) => {
    const q = customQ || questionInput.trim();
    if (!q || !doc || loadingAnswer) return;

    const newHistory = [...chatMessages, { role: 'user' as const, text: q }];
    setChatMessages(newHistory);
    setQuestionInput("");
    setLoadingAnswer(true);

    try {
      const res = await askDocQuestion(doc.type, doc.url, q, chatMessages);
      if (res.success && res.answer) {
        setChatMessages([...newHistory, { role: 'assistant', text: res.answer }]);
      } else {
        setChatMessages([...newHistory, { role: 'assistant', text: "Lỗi AI: " + (res.error || "Không nhận được phản hồi.") }]);
      }
    } catch (e: any) {
      setChatMessages([...newHistory, { role: 'assistant', text: "Lỗi kết nối: " + e.message }]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleLoadQuiz = async () => {
    if (!doc) return;
    setLoadingQuiz(true);
    setSelectedAnswers({});
    setShowExplanations({});
    try {
      const res = await generateDocQuiz(doc.type, doc.url, 4);
      if (res.success && res.quiz) {
        setQuizQuestions(res.quiz);
      } else {
        toast.error("Không thể tạo trắc nghiệm: " + res.error);
      }
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectOption = (qIdx: number, optIdx: number) => {
    if (selectedAnswers[qIdx] !== undefined) return; // Đã trả lời rồi thì không đổi
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
    setShowExplanations(prev => ({ ...prev, [qIdx]: true }));
  };

  const handleLoadFlashcards = async () => {
    if (!doc) return;
    setLoadingCards(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    try {
      const res = await generateDocFlashcards(doc.type, doc.url);
      if (res.success && res.flashcards) {
        setFlashcards(res.flashcards);
      } else {
        toast.error("Không thể tạo thẻ ghi nhớ: " + res.error);
      }
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setLoadingCards(false);
    }
  };

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Main Studio Modal */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col h-[85vh] max-h-[750px] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900 truncate">{doc.title}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold uppercase shrink-0">
                  {doc.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Trợ lý học tập AI tương tác sâu</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 bg-white gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "summary" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={15} />
            Tóm tắt cốt lõi
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "chat" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <MessageSquare size={15} />
            Hỏi đáp trực tiếp
            {chatMessages.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("quiz");
              if (quizQuestions.length === 0) handleLoadQuiz();
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "quiz" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <HelpCircle size={15} />
            Trắc nghiệm tự luyện
          </button>

          <button
            onClick={() => {
              setActiveTab("flashcards");
              if (flashcards.length === 0) handleLoadFlashcards();
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all shrink-0 ${
              activeTab === "flashcards" 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={15} />
            Thẻ ghi nhớ (Flashcards)
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* 1. TAB TÓM TẮT */}
          {activeTab === "summary" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                  <p className="text-xs font-semibold text-slate-500">AI đang đọc toàn bộ tài liệu và tổng hợp các ý cốt lõi...</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tóm lược thông minh</span>
                    <button 
                      onClick={handleLoadSummary}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Tạo lại tóm tắt
                    </button>
                  </div>
                  <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                    {summary || "Chưa có nội dung tóm tắt."}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. TAB HỎI ĐÁP Q&A CHAT */}
          {activeTab === "chat" && (
            <div className="flex flex-col h-full max-w-2xl mx-auto">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
                      <Bot size={24} />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">Hỏi bất cứ điều gì về tài liệu này</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      AI đã ghi nhớ toàn bộ nội dung. Bạn có thể hỏi về công thức, định nghĩa, bài học hoặc yêu cầu giải thích một phần khó hiểu.
                    </p>

                    {/* Câu hỏi gợi ý */}
                    <div className="pt-3 flex flex-wrap justify-center gap-2">
                      {[
                        "Tóm tắt 3 ý cốt lõi nhất của tài liệu này?",
                        "Tài liệu này hữu ích cho ai và cần lưu ý gì?",
                        "Giải thích nội dung quan trọng nhất bằng ví dụ đời thường"
                      ].map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendQuestion(sug)}
                          className="text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition-colors text-left"
                        >
                          💡 {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot size={15} />
                        </div>
                      )}
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[85%] leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-xs font-medium' 
                          : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-2xs whitespace-pre-wrap'
                      }`}>
                        {msg.text}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={15} />
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loadingAnswer && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Bot size={15} />
                    </div>
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 font-medium flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      AI đang suy nghĩ câu trả lời...
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="pt-2 border-t border-slate-200/80 bg-slate-50/50">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendQuestion(); }}
                  className="flex items-center gap-2 bg-white p-1.5 pl-4 rounded-2xl border border-slate-200 focus-within:border-blue-500 shadow-2xs"
                >
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    placeholder="Đặt câu hỏi về nội dung tài liệu..."
                    className="w-full bg-transparent outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400"
                    disabled={loadingAnswer}
                  />
                  <button
                    type="submit"
                    disabled={!questionInput.trim() || loadingAnswer}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. TAB TRẮC NGHIỆM TỰ LUYỆN */}
          {activeTab === "quiz" && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {loadingQuiz ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                  <p className="text-xs font-semibold text-slate-500">AI đang quét tài liệu để tạo bộ câu hỏi trắc nghiệm...</p>
                </div>
              ) : quizQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <button 
                    onClick={handleLoadQuiz}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Bắt đầu tạo bài trắc nghiệm
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Đã trả lời: {Object.keys(selectedAnswers).length}/{quizQuestions.length} câu
                    </span>
                    <button 
                      onClick={handleLoadQuiz}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <RotateCcw size={12} /> Tạo bộ câu hỏi mới
                    </button>
                  </div>

                  {quizQuestions.map((q, qIdx) => {
                    const isAnswered = selectedAnswers[qIdx] !== undefined;
                    const userSelected = selectedAnswers[qIdx];
                    const isCorrect = userSelected === q.correctAnswer;

                    return (
                      <div key={qIdx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                        <h4 className="font-bold text-sm text-slate-800 leading-snug">
                          <span className="text-blue-600 mr-2">Câu {qIdx + 1}:</span>
                          {q.question}
                        </h4>

                        <div className="space-y-2 pt-1">
                          {q.options.map((opt, optIdx) => {
                            let btnStyle = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700";

                            if (isAnswered) {
                              if (optIdx === q.correctAnswer) {
                                btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold";
                              } else if (optIdx === userSelected) {
                                btnStyle = "bg-red-50 border-red-400 text-red-800";
                              } else {
                                btnStyle = "opacity-50 border-slate-200 text-slate-400";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectOption(qIdx, optIdx)}
                                disabled={isAnswered}
                                className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {isAnswered && optIdx === q.correctAnswer && (
                                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 ml-2" />
                                )}
                                {isAnswered && optIdx === userSelected && !isCorrect && (
                                  <XCircle size={16} className="text-red-500 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {showExplanations[qIdx] && (
                          <div className={`p-3 rounded-xl text-xs leading-relaxed mt-2 border ${
                            isCorrect ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-amber-50/70 border-amber-200 text-amber-800'
                          }`}>
                            <p className="font-bold mb-0.5">{isCorrect ? '🎉 Chính xác!' : '💡 Lời giải thích:'}</p>
                            <p>{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. TAB THẺ GHI NHỚ (FLASHCARDS) */}
          {activeTab === "flashcards" && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto py-4">
              {loadingCards ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                  <p className="text-xs font-semibold text-slate-500">Đang tổng hợp các thuật ngữ cốt lõi thành thẻ học...</p>
                </div>
              ) : flashcards.length === 0 ? (
                <div className="text-center py-12">
                  <button 
                    onClick={handleLoadFlashcards}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    Bắt đầu tạo Thẻ ghi nhớ
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center space-y-6">
                  <div className="flex items-center justify-between w-full text-xs font-bold text-slate-400">
                    <span>THẺ {currentCardIndex + 1} / {flashcards.length}</span>
                    <span className="text-[11px] font-normal text-slate-400">Nhấp vào thẻ để lật mặt</span>
                  </div>

                  {/* 3D Flashcard */}
                  <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full h-64 bg-white rounded-3xl border-2 border-slate-200/80 shadow-md hover:shadow-lg hover:border-blue-400 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none relative group"
                  >
                    <span className="absolute top-4 left-4 text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                      {isFlipped ? "Định nghĩa / Lời giải" : "Khái niệm / Câu hỏi"}
                    </span>

                    <p className={`font-bold transition-all leading-relaxed ${
                      isFlipped ? "text-slate-700 text-base font-medium" : "text-slate-900 text-xl font-extrabold text-blue-600"
                    }`}>
                      {isFlipped 
                        ? flashcards[currentCardIndex].back 
                        : flashcards[currentCardIndex].front}
                    </p>

                    <span className="absolute bottom-4 text-xs font-semibold text-slate-400 group-hover:text-blue-500 transition-colors">
                      🔄 Bấm để xem {isFlipped ? "câu hỏi" : "đáp án"}
                    </span>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (currentCardIndex > 0) {
                          setCurrentCardIndex(prev => prev - 1);
                          setIsFlipped(false);
                        }
                      }}
                      disabled={currentCardIndex === 0}
                      className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-all shadow-2xs"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <button 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      Lật thẻ
                    </button>

                    <button
                      onClick={() => {
                        if (currentCardIndex < flashcards.length - 1) {
                          setCurrentCardIndex(prev => prev + 1);
                          setIsFlipped(false);
                        }
                      }}
                      disabled={currentCardIndex === flashcards.length - 1}
                      className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-all shadow-2xs"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
