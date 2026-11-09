"use client";

import React, { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { generateStudyPlanAI } from "../actions";
import { StudyPlanSession } from "../types";
import { getLocalDateStr } from "../utils";
import AIPlanSessionsPreview from "./AIPlanSessionsPreview";

export interface AIStudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatchSchedules: (sessions: StudyPlanSession[]) => Promise<void>;
}

const PRESET_TOPICS = [
  "Ôn thi Tiếng Anh IELTS",
  "Toán cao cấp / Giải tích",
  "Lập trình Fullstack Web",
  "Cấu trúc dữ liệu & Giải thuật",
  "Khoa học dữ liệu / AI",
];

export default function AIStudyPlanModal({
  isOpen,
  onClose,
  onAddBatchSchedules
}: AIStudyPlanModalProps) {
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getLocalDateStr(d);
  });
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [sessions, setSessions] = useState<StudyPlanSession[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Vui lòng nhập tên môn học hoặc kỳ thi.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await generateStudyPlanAI(subject, deadline, hoursPerDay);
      if (!res.success) {
        toast.error(res.message || "Không thể tạo kế hoạch học tập.");
        return;
      }

      setSummary(res.summary || "Đã tạo lộ trình học tập tối ưu hóa.");
      setSessions(res.sessions);
      setSelectedIndices(new Set(res.sessions.map((_, i) => i)));
      toast.success(`AI đã lập thành công ${res.sessions.length} buổi học! 🎉`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Lỗi gọi trợ lý AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectSession = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleApplyBatch = async () => {
    const chosen = sessions.filter((_, idx) => selectedIndices.has(idx));
    if (chosen.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 buổi học để thêm vào lịch.");
      return;
    }

    setIsApplying(true);
    try {
      await onAddBatchSchedules(chosen);
      toast.success(`Đã thêm ${chosen.length} buổi học vào lịch trình của bạn! 🚀`);
      onClose();
    } catch (err: unknown) {
      toast.error("Lỗi khi lưu lịch: " + (err as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  const resetAll = () => {
    setSessions([]);
    setSummary("");
    setSelectedIndices(new Set());
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl flex items-center gap-2">
                Trợ lý AI Xếp Lịch Học
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  Gemini Flash
                </span>
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tự động phân bổ lịch ôn tập thông minh & lưu hàng loạt với 1 click
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {sessions.length === 0 ? (
          <form onSubmit={handleGenerate} className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Gợi ý chủ đề nhanh
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TOPICS.map((topic) => (
                  <button
                    type="button"
                    key={topic}
                    onClick={() => setSubject(topic)}
                    className="text-xs px-2.5 py-1 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 transition-colors"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Môn học / Kỳ thi / Mục tiêu học tập *
              </label>
              <input 
                type="text" 
                required 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                placeholder="VD: Ôn thi Đại số tuyến tính, Luyện đề IELTS Reading..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Ngày thi / Hạn chót (Deadline) *
                </label>
                <input 
                  type="date" 
                  required 
                  value={deadline} 
                  min={getLocalDateStr()}
                  onChange={e => setDeadline(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Thời gian học mỗi ngày
                </label>
                <select
                  value={hoursPerDay}
                  onChange={e => setHoursPerDay(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value={1}>1 giờ / ngày (Nhẹ nhàng)</option>
                  <option value={2}>2 giờ / ngày (Tiêu chuẩn)</option>
                  <option value={3}>3 giờ / ngày (Tập trung)</option>
                  <option value={4}>4 giờ / ngày (Cấp tốc)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>AI đang phân tích & xây dựng lộ trình...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Lập thời gian biểu với AI</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <AIPlanSessionsPreview
            sessions={sessions}
            summary={summary}
            selectedIndices={selectedIndices}
            onToggleSelect={toggleSelectSession}
            onReset={resetAll}
            onApply={handleApplyBatch}
            isApplying={isApplying}
          />
        )}
      </div>
    </div>
  );
}
