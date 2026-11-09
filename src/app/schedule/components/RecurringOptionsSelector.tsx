"use client";

import React from "react";
import { Repeat, Sparkles } from "lucide-react";
import { RepeatMode } from "../types";

export interface RecurringOptionsSelectorProps {
  repeatMode: RepeatMode;
  onRepeatModeChange: (mode: RepeatMode) => void;
  repeatWeeks: number;
  onRepeatWeeksChange: (weeks: number) => void;
}

export default function RecurringOptionsSelector({
  repeatMode,
  onRepeatModeChange,
  repeatWeeks,
  onRepeatWeeksChange
}: RecurringOptionsSelectorProps) {
  return (
    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 space-y-3">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
        <Repeat size={16} />
        <span className="text-xs font-extrabold uppercase tracking-wider">
          Thói quen định kỳ (Recurring Habits)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={repeatMode}
          onChange={(e) => onRepeatModeChange(e.target.value as RepeatMode)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">Không lặp lại (1 lần duy nhất)</option>
          <option value="daily">Hàng ngày (Mỗi ngày - Daily)</option>
          <option value="weekdays_mon_fri">Thứ 2 đến Thứ 6 (Mon - Fri)</option>
          <option value="weekly">Hàng tuần (Cùng thứ mỗi tuần)</option>
          <option value="weekdays_246">Thứ 2, Thứ 4, Thứ 6 (T2-T4-T6)</option>
          <option value="weekdays_357">Thứ 3, Thứ 5, Thứ 7 (T3-T5-T7)</option>
        </select>

        {repeatMode !== 'none' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Lặp trong:</span>
            <select
              value={repeatWeeks}
              onChange={(e) => onRepeatWeeksChange(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={2}>2 tuần tới</option>
              <option value={4}>4 tuần tới (1 tháng)</option>
              <option value={8}>8 tuần tới (2 tháng)</option>
              <option value={12}>12 tuần tới (1 học kỳ)</option>
            </select>
          </div>
        )}
      </div>

      {repeatMode !== 'none' && (
        <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
          <Sparkles size={13} className="shrink-0" />
          Hệ thống sẽ tự động tạo chuỗi các sự kiện lặp lại trên toàn bộ giao diện lịch.
        </p>
      )}
    </div>
  );
}
