"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  X, 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Shuffle, 
  BookmarkCheck, 
  AlertCircle 
} from "lucide-react";
import toast from "react-hot-toast";
import { generateFlashcards, getDocumentText, DocFlashcard } from "../actions";

export interface DocFlashcardModalDoc {
  id: string;
  title: string;
  type: string;
  url: string;
  publicUrl?: string;
}

interface DocFlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: DocFlashcardModalDoc | null;
  initialText?: string;
}

export default function DocFlashcardsModal({
  isOpen,
  onClose,
  doc,
  initialText
}: DocFlashcardsModalProps) {
  const [flashcards, setFlashcards] = useState<DocFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [knownCardIds, setKnownCardIds] = useState<Set<string>>(new Set());

  // Tải danh sách Flashcards từ tài liệu
  const loadCards = useCallback(async () => {
    if (!doc) return;
    setIsLoading(true);
    setIsFlipped(false);
    setCurrentIndex(0);
    setKnownCardIds(new Set());

    try {
      let content = initialText || "";
      if (!content) {
        const textRes = await getDocumentText(doc.type, doc.url);
        if (textRes.success && textRes.text) {
          content = textRes.text;
        } else {
          toast.error(textRes.error || "Không thể đọc nội dung văn bản tài liệu.");
          setIsLoading(false);
          return;
        }
      }

      const res = await generateFlashcards(doc.title, content);
      if (res.success && res.flashcards && res.flashcards.length > 0) {
        setFlashcards(res.flashcards);
        toast.success(`Đã tạo thành công ${res.flashcards.length} thẻ ôn thi!`);
      } else {
        toast.error(res.error || "Không thể tạo flashcards cho tài liệu này.");
        setFlashcards([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định khi tạo Flashcards.";
      toast.error(msg);
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, [doc, initialText]);

  const handleNextCard = useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 100);
    }
  }, [currentIndex, flashcards.length]);

  const handlePrevCard = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev - 1), 100);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen || !doc) return;

    const timer = setTimeout(() => {
      loadCards();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, doc, loadCards]);

  // Điều hướng bằng bàn phím (Mũi tên trái/phải để chuyển thẻ, Space/Enter để lật thẻ)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleFlip, handleNextCard, handlePrevCard, onClose]);

  if (!isOpen || !doc) return null;

  const currentCard = flashcards[currentIndex];

  const handleShuffle = () => {
    if (flashcards.length <= 1) return;
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success("Đã xáo trộn ngẫu nhiên thứ tự các thẻ!");
  };

  const handleToggleKnown = (cardId: string) => {
    setKnownCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
        toast.success("Tuyệt vời! Đã đánh dấu thẻ này là Đã thuộc 🎉");
      }
      return next;
    });
  };

  const handleCopyCard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Đã sao chép nội dung!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const progressPercent = flashcards.length > 0 
    ? Math.round(((currentIndex + 1) / flashcards.length) * 100) 
    : 0;

  const isCurrentCardKnown = currentCard ? knownCardIds.has(currentCard.id) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                  Flashcards: {doc.title}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles size={12} className="text-amber-500 shrink-0" />
                <span>Phương pháp ôn thi Gợi nhớ chủ động (Active Recall)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {flashcards.length > 1 && !isLoading && (
              <button
                onClick={handleShuffle}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Xáo trộn thứ tự thẻ"
              >
                <Shuffle size={17} />
              </button>
            )}
            <button
              onClick={loadCards}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
              title="Tạo lại bộ thẻ AI mới"
            >
              <RotateCcw size={17} className={isLoading ? "animate-spin text-amber-500" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Thanh tiến trình học tập */}
        {flashcards.length > 0 && !isLoading && (
          <div className="px-6 pt-4 pb-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span>Thẻ {currentIndex + 1} / {flashcards.length}</span>
                {currentCard?.tag && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    {currentCard.tag}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Đã thuộc: {knownCardIds.size}/{flashcards.length}
                </span>
                <span className="text-[11px] text-slate-400">{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Thân Modal */}
        <div className="p-6 sm:p-8 flex flex-col items-center justify-center min-h-[380px] bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* Trạng thái đang tải */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm animate-pulse">
                  <Layers size={32} />
                </div>
                <Loader2 size={24} className="animate-spin text-amber-500 absolute -top-1 -right-1" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
                  AI đang chắt lọc kiến thức...
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                  Đang phân tích tài liệu và cấu trúc các khái niệm, công thức thành từng thẻ ghi nhớ chuẩn Active Recall.
                </p>
              </div>
            </div>
          )}

          {/* Trạng thái không có thẻ hoặc lỗi */}
          {!isLoading && flashcards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-200">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Chưa thể tạo flashcards từ tài liệu này
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tài liệu có thể quá ngắn hoặc không chứa đủ đoạn văn bản để trích xuất.
                </p>
              </div>
              <button
                onClick={loadCards}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
              >
                Thử tạo lại
              </button>
            </div>
          )}

          {/* Vùng hiển thị Thẻ 3D Flip Card */}
          {!isLoading && flashcards.length > 0 && currentCard && (
            <div className="w-full max-w-xl flex flex-col items-center space-y-6">
              
              {/* Khung thẻ 3D (3D Card Container) */}
              <div 
                className="w-full cursor-pointer select-none"
                style={{ perspective: "1200px" }}
                onClick={handleFlip}
              >
                <div
                  className="w-full min-h-[260px] sm:min-h-[290px] relative rounded-3xl transition-transform duration-500 shadow-lg hover:shadow-xl group"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                  }}
                >
                  {/* MẶT TRƯỚC (Front Face): Câu hỏi / Thuật ngữ */}
                  <div
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden"
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-200/60 dark:border-amber-900/60">
                        {currentCard.tag || "Khái niệm"} • Mặt trước
                      </span>
                      {isCurrentCardKnown && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                          <BookmarkCheck size={13} />
                          <span>Đã thuộc</span>
                        </span>
                      )}
                    </div>

                    <div className="my-auto py-4 text-center">
                      <p className="text-lg sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-snug">
                        {currentCard.front}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <span className="text-[11px]">Thẻ #{currentIndex + 1}</span>
                      <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors font-semibold flex items-center gap-1">
                        👆 Nhấp để lật xem đáp án
                      </span>
                    </div>
                  </div>

                  {/* MẶT SAU (Back Face): Định nghĩa / Lời giải / Công thức */}
                  <div
                    className="absolute inset-0 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:from-slate-800 dark:to-slate-800/90 rounded-3xl p-6 sm:p-8 border-2 border-amber-300/80 dark:border-amber-500/40 flex flex-col justify-between"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)"
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-900/60">
                        Định nghĩa & Lời giải • Mặt sau
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCard(currentCard.back);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Sao chép nội dung"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div className="my-auto py-4 text-center">
                      <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-amber-100 dark:border-slate-700/50">
                      <span className="text-[11px]">Thẻ #{currentIndex + 1}</span>
                      <span className="group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors font-semibold flex items-center gap-1">
                        🔄 Nhấp để lật lại câu hỏi
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Nút đánh dấu đã thuộc */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleKnown(currentCard.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isCurrentCardKnown
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>{isCurrentCardKnown ? "Đã thuộc bài này" : "Đánh dấu là đã thuộc"}</span>
                </button>
              </div>

              {/* Bộ điều khiển chuyển thẻ */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePrevCard}
                  disabled={currentIndex === 0}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-30 text-slate-700 dark:text-slate-200 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                  title="Thẻ trước (Mũi tên trái)"
                >
                  <ArrowLeft size={18} />
                </button>

                <button
                  onClick={handleFlip}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Lật thẻ (Phím Cách)</span>
                </button>

                <button
                  onClick={handleNextCard}
                  disabled={currentIndex === flashcards.length - 1}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-30 text-slate-700 dark:text-slate-200 transition-all shadow-2xs cursor-pointer disabled:cursor-not-allowed"
                  title="Thẻ tiếp theo (Mũi tên phải)"
                >
                  <ArrowRight size={18} />
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer hướng dẫn phím tắt */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-3">
            <span>Phím tắt:</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">Space</span>
            <span>Lật thẻ</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">← / →</span>
            <span>Chuyển thẻ</span>
          </div>
          <span>Esc để đóng</span>
        </div>

      </div>
    </div>
  );
}
