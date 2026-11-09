"use client";

import React from 'react';
import { Calendar, Flame, RotateCw, Layers, CheckSquare, Sparkles } from 'lucide-react';

interface DailyVocabHeaderProps {
  currentDate: string;
  onDateChange: (newDate: string) => void;
  topic: string;
  streakCount: number;
  masteredCount: number;
  totalWords: number;
  isLoading: boolean;
  onRegenerate: () => void;
  onOpenFlashcard: () => void;
  onOpenQuiz: () => void;
}

export function DailyVocabHeader({
  currentDate,
  onDateChange,
  topic,
  streakCount,
  masteredCount,
  totalWords,
  isLoading,
  onRegenerate,
  onOpenFlashcard,
  onOpenQuiz,
}: DailyVocabHeaderProps) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };

  const isToday = currentDate === getTodayStr();
  const isYesterday = currentDate === getYesterdayStr();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
      {/* Top row: Title + Streak badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              <Sparkles size={20} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Từ vựng TOEIC Hàng ngày
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                AI Gemini 3.8 tuyển chọn từ vựng trọng tâm mỗi ngày kèm ví dụ thực tế Part 5, 6 & 7
              </p>
            </div>
          </div>
        </div>

        {/* Streak & Mastered Stats */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 text-xs font-bold shadow-xs">
            <Flame size={16} className="text-amber-500 fill-amber-500" />
            <span>Streak: {streakCount} ngày</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50 text-xs font-bold shadow-xs">
            <CheckSquare size={16} className="text-emerald-500" />
            <span>Thuộc: {masteredCount}/{totalWords}</span>
          </div>
        </div>
      </div>

      {/* Date controls & Topic */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onDateChange(getTodayStr())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isToday
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Hôm nay
          </button>

          <button
            onClick={() => onDateChange(getYesterdayStr())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isYesterday
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Hôm qua
          </button>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="bg-transparent border-none text-xs font-medium focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Re-generate / Change topic button */}
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            title="AI tạo bộ từ mới hoặc đổi chủ đề"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
          >
            <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Đổi chủ đề</span>
          </button>
        </div>

        {/* Action modes: Flashcards & Quiz */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFlashcard}
            disabled={totalWords === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-900/50 hover:bg-indigo-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Layers size={15} />
            <span>Lật thẻ 3D</span>
          </button>

          <button
            onClick={onOpenQuiz}
            disabled={totalWords === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <CheckSquare size={15} />
            <span>Thi thử Part 5</span>
          </button>
        </div>
      </div>

      {/* Topic tag */}
      {topic && (
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
            Chủ đề hôm nay:
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {topic}
          </span>
        </div>
      )}
    </div>
  );
}
