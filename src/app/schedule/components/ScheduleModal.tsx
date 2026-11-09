"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Edit2, Tag } from "lucide-react";
import { ScheduleItem, ColorScheme, RepeatMode, PRESET_SUBJECT_TAGS, ScheduleFormData } from "../types";
import { getLocalDateStr } from "../utils";
import RecurringOptionsSelector from "./RecurringOptionsSelector";

export interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSchedule?: ScheduleItem | null;
  initialDate?: string;
  initialStartTime?: string;
  colors: ColorScheme[];
  onSave: (payload: ScheduleFormData) => Promise<void>;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  editingSchedule,
  initialDate,
  initialStartTime,
  colors,
  onSave
}: ScheduleModalProps) {
  const [title, setTitle] = useState(() => editingSchedule?.title || "");
  const [description, setDescription] = useState(() => editingSchedule?.description || "");
  const [date, setDate] = useState(() => editingSchedule?.date || initialDate || getLocalDateStr());
  const [startTime, setStartTime] = useState(() => {
    if (editingSchedule?.start_time) return editingSchedule.start_time.substring(0, 5);
    return initialStartTime || "08:00";
  });
  const [endTime, setEndTime] = useState(() => {
    if (editingSchedule?.end_time) return editingSchedule.end_time.substring(0, 5);
    const sTime = initialStartTime || "08:00";
    const [h, m] = sTime.split(":").map(Number);
    const endH = Math.min(23, (h || 8) + 1);
    return `${String(endH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  });
  const [color, setColor] = useState(() => editingSchedule?.color || "blue");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [repeatWeeks, setRepeatWeeks] = useState<number>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      if (!title.includes(`[${tag}]`)) {
        setTitle(prev => `[${tag}] ${prev.replace(/^\[[^\]]+\]\s*/, '')}`.trim());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        date,
        start_time: startTime,
        end_time: endTime,
        color,
        repeatMode,
        repeatWeeks,
        editingId: editingSchedule?.id
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center">
              {editingSchedule ? <Edit2 size={20} /> : <CalendarIcon size={20} />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">
                {editingSchedule ? "Sửa Sự Kiện" : "Thêm Sự Kiện / Thói Quen"}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {editingSchedule ? "Cập nhật thông tin chi tiết sự kiện" : "Lên kế hoạch với thói quen lặp lại thông minh"}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              <Tag size={13} /> Gắn tag môn học / chủ đề nhanh
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SUBJECT_TAGS.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => handleSelectTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all ${
                    selectedTag === t
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tên công việc / Môn học *
            </label>
            <input 
              type="text" 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="VD: [Toán học] Giải tích 1, Luyện đề IELTS..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Ngày thực hiện *
            </label>
            <input 
              type="date" 
              required 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Giờ bắt đầu *
              </label>
              <input 
                type="time" 
                required 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Giờ kết thúc *
              </label>
              <input 
                type="time" 
                required 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {!editingSchedule && (
            <RecurringOptionsSelector
              repeatMode={repeatMode}
              onRepeatModeChange={setRepeatMode}
              repeatWeeks={repeatWeeks}
              onRepeatWeeksChange={setRepeatWeeks}
            />
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Chi tiết / Ghi chú (Tùy chọn)
            </label>
            <textarea 
              rows={2} 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="Nội dung bài học, link tài liệu hoặc phòng học..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Màu sắc đánh dấu
            </label>
            <div className="flex gap-3">
              {colors.map(c => (
                <button 
                  key={c.id} 
                  type="button" 
                  onClick={() => setColor(c.id)}
                  className={`w-9 h-9 rounded-full ${c.solid} ring-4 transition-all ${
                    color === c.id ? 'ring-blue-300 dark:ring-blue-600 scale-110 shadow-md' : 'ring-transparent scale-100 hover:scale-105'
                  }`}
                  title={`Màu ${c.id}`}
                />
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg shadow-blue-600/30 active:scale-[0.99]"
          >
            {isSubmitting 
              ? "Đang lưu..." 
              : editingSchedule 
                ? "Cập nhật sự kiện" 
                : (repeatMode !== 'none' ? `Lên lịch thói quen chuỗi ${repeatWeeks} tuần` : "Lưu sự kiện")
            }
          </button>
        </form>
      </div>
    </div>
  );
}
