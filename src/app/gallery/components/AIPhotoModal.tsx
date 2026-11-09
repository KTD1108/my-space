"use client";

import { Sparkles, X, Copy, Check, FolderInput, Tag } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import type { PhotoAIAnalysisResult } from "../actions";

interface AIPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: {
    id: string;
    title: string;
    url: string;
    publicUrl?: string;
    album?: string;
  } | null;
  result: PhotoAIAnalysisResult | null;
  isLoading: boolean;
  onMoveAlbum?: (photoId: string, targetAlbum: string) => Promise<void>;
}

export default function AIPhotoModal({
  isOpen,
  onClose,
  photo,
  result,
  isLoading,
  onMoveAlbum,
}: AIPhotoModalProps) {
  const [copied, setCopied] = useState(false);
  const [moving, setMoving] = useState(false);

  if (!isOpen || !photo) return null;

  const handleCopyDescription = async () => {
    if (!result?.description) return;
    try {
      await navigator.clipboard.writeText(result.description);
      setCopied(true);
      toast.success("Đã sao chép mô tả AI vào khay nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép văn bản.");
    }
  };

  const handleMoveToSuggested = async () => {
    if (!result?.suggestedCategory || !onMoveAlbum) return;
    setMoving(true);
    try {
      await onMoveAlbum(photo.id, result.suggestedCategory);
      toast.success(`Đã chuyển ảnh sang album "${result.suggestedCategory}"!`);
      onClose();
    } catch (err: unknown) {
      toast.error("Lỗi khi chuyển album: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-pink-500/10 via-rose-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Trợ lý AI Phân tích ảnh</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Google Gemini Multimodal Vision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Ảnh xem trước & thông tin cơ bản */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
              <img
                src={photo.publicUrl || photo.url}
                alt={photo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{photo.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Album hiện tại: <span className="font-semibold text-pink-600 dark:text-pink-400">{photo.album || 'Chung'}</span>
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-4 border-pink-500/20 border-t-pink-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Gemini đang quan sát & phân tích ảnh...</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Trích xuất chủ thể, khung cảnh, sinh mô tả và gợi ý tags</p>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Mô tả từ AI */}
              <div className="bg-pink-50/50 dark:bg-pink-950/20 rounded-2xl p-4 border border-pink-100 dark:border-pink-900/40 relative group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} />
                    Mô tả ảnh sinh động
                  </span>
                  <button
                    onClick={handleCopyDescription}
                    className="p-1.5 text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    title="Sao chép mô tả"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium italic">
                  "{result.description}"
                </p>
              </div>

              {/* Tags AI gợi ý */}
              {result.tags && result.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Tag size={13} />
                    Thẻ phân loại (Tags)
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200/60 dark:border-slate-700/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gợi ý danh mục / Album */}
              {result.suggestedCategory && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Danh mục gợi ý</p>
                    <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                      {result.suggestedCategory}
                    </p>
                  </div>
                  {onMoveAlbum && (photo.album || 'Chung') !== result.suggestedCategory && (
                    <button
                      onClick={handleMoveToSuggested}
                      disabled={moving}
                      className="px-3.5 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <FolderInput size={14} />
                      <span>{moving ? "Đang chuyển..." : "Áp dụng album"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
              Không thể tải kết quả phân tích.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
