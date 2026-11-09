"use client";

import React from "react";
import { Clock, Check, RotateCcw, Loader2 } from "lucide-react";
import { StudyPlanSession } from "../types";

export interface AIPlanSessionsPreviewProps {
  sessions: StudyPlanSession[];
  summary: string;
  selectedIndices: Set<number>;
  onToggleSelect: (idx: number) => void;
  onReset: () => void;
  onApply: () => Promise<void>;
  isApplying: boolean;
}

export default function AIPlanSessionsPreview({
  sessions,
  summary,
  selectedIndices,
  onToggleSelect,
  onReset,
  onApply,
  isApplying
}: AIPlanSessionsPreviewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/50 mb-3 shrink-0">
        <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
          💡 {summary}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
        {sessions.map((sess, idx) => {
          const isSelected = selectedIndices.has(idx);
          return (
            <div
              key={idx}
              onClick={() => onToggleSelect(idx)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                isSelected 
                  ? 'bg-white dark:bg-slate-800 border-blue-300 dark:border-blue-700 shadow-xs' 
                  : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-50'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600'
              }`}>
                {isSelected && <Check size={14} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                    {sess.title}
                  </h4>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {sess.date.split('-').reverse().slice(0, 2).join('/')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  <Clock size={12} />
                  <span>{sess.start_time} - {sess.end_time}</span>
                </div>
                {sess.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 font-medium">
                    {sess.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw size={14} /> Lập lại
        </button>

        <button
          type="button"
          onClick={onApply}
          disabled={isApplying || selectedIndices.size === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2"
        >
          {isApplying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Đang thêm vào lịch...</span>
            </>
          ) : (
            <>
              <Check size={16} />
              <span>Thêm {selectedIndices.size} buổi học vào Lịch trình</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
