"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { ScheduleItem, ColorScheme } from "../types";
import { getLocalDateStr } from "../utils";

export interface MonthCalendarViewProps {
  currentMonth: Date;
  onNavigateMonth: (action: "prev" | "next" | "today") => void;
  schedules: ScheduleItem[];
  onSelectDay: (dateStr: string) => void;
  colors: ColorScheme[];
  calendarBg?: string | null;
  bgOpacity?: number;
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function MonthCalendarView({
  currentMonth,
  onNavigateMonth,
  schedules,
  onSelectDay,
  colors,
  calendarBg,
  bgOpacity = 75
}: MonthCalendarViewProps) {
  const todayDateStr = getLocalDateStr();

  const groupedSchedules = useMemo(() => {
    return schedules.reduce((acc: Record<string, ScheduleItem[]>, curr) => {
      if (!acc[curr.date]) acc[curr.date] = [];
      acc[curr.date].push(curr);
      return acc;
    }, {});
  }, [schedules]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // T2 là ngày 0

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all">
      {/* Ảnh nền Wallpaper cá nhân hóa */}
      {calendarBg && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={calendarBg} 
            alt="Calendar Wallpaper" 
            className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-all duration-300"
          />
          <div 
            className="absolute inset-0 backdrop-blur-xs z-0 pointer-events-none transition-all duration-300 dark:hidden" 
            style={{ backgroundColor: `rgba(255, 255, 255, ${bgOpacity / 100})` }}
          />
          <div 
            className="absolute inset-0 backdrop-blur-xs z-0 pointer-events-none transition-all duration-300 hidden dark:block" 
            style={{ backgroundColor: `rgba(15, 23, 42, ${Math.max(0.65, bgOpacity / 100)})` }}
          />
        </>
      )}

      {/* Header Điều hướng Tháng */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 capitalize drop-shadow-2xs">
          Tháng {month + 1} - {year}
        </h2>

        <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <button 
            type="button"
            onClick={() => onNavigateMonth("prev")} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            type="button"
            onClick={() => onNavigateMonth("today")} 
            className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors"
          >
            Hôm nay
          </button>
          <button 
            type="button"
            onClick={() => onNavigateMonth("next")} 
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Tháng sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Lưới Lịch Tháng */}
      <div className="relative z-10 grid grid-cols-7 gap-2">
        {/* Hàng Tiêu đề Thứ */}
        {DAYS_OF_WEEK.map((d) => (
          <div 
            key={d} 
            className={`text-center text-xs py-2 uppercase tracking-widest ${
              calendarBg 
                ? 'font-extrabold text-slate-700 dark:text-slate-200 drop-shadow-2xs' 
                : 'font-extrabold text-slate-400 dark:text-slate-500'
            }`}
          >
            {d}
          </div>
        ))}

        {/* Ô trống đầu tháng */}
        {Array.from({ length: startDay }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className={`min-h-[110px] rounded-2xl ${
              calendarBg 
                ? 'bg-white/30 dark:bg-slate-800/30 backdrop-blur-xs border border-white/20 dark:border-slate-800/30' 
                : 'bg-slate-50/50 dark:bg-slate-800/30 border border-transparent'
            }`}
          />
        ))}

        {/* Các ô ngày trong tháng */}
        {daysArray.map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySchedules = groupedSchedules[dateStr] || [];
          const isToday = dateStr === todayDateStr;

          return (
            <div 
              key={day} 
              onClick={() => onSelectDay(dateStr)}
              className={`min-h-[110px] border rounded-2xl p-2.5 transition-all cursor-pointer group hover:shadow-md flex flex-col justify-between ${
                calendarBg 
                  ? 'bg-white/80 dark:bg-slate-900/80 hover:bg-white/95 dark:hover:bg-slate-900/95 backdrop-blur-xs border-white/70 dark:border-slate-800/70 hover:border-blue-400 shadow-2xs' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
              } ${isToday ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 ring-offset-1' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                    isToday 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' 
                      : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'
                  }`}>
                    {day}
                  </span>
                  {daySchedules.length > 0 && (
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {daySchedules.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-hidden max-h-[70px]">
                  {daySchedules.slice(0, 3).map((s) => {
                    const col = colors.find(c => c.id === s.color) || colors[0];
                    const timeDisplay = s.start_time ? s.start_time.substring(0, 5) : '--:--';
                    const isHabit = s.title.includes('[Thói quen]') || (s.description && s.description.includes('lặp lại'));

                    return (
                      <div 
                        key={s.id} 
                        className={`text-[11px] p-1 px-1.5 rounded-lg truncate font-bold transition-all flex items-center gap-1 ${
                          s.is_completed ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-800 text-slate-500' : col.solid
                        } hover:brightness-110 shadow-2xs`}
                        title={`${timeDisplay} - ${s.title}`}
                      >
                        {isHabit && <Repeat size={10} className="shrink-0" />}
                        <span className="truncate">{timeDisplay} {s.title}</span>
                      </div>
                    );
                  })}
                  {daySchedules.length > 3 && (
                    <div className="text-[10px] font-bold text-slate-400 pl-1">
                      +{daySchedules.length - 3} khác...
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
