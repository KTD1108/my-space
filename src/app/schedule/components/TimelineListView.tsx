"use client";

import React, { useMemo } from "react";
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  ListTodo, 
  Repeat 
} from "lucide-react";
import { ScheduleItem, ColorScheme } from "../types";
import { getLocalDateStr, isOverdue } from "../utils";

export interface TimelineListViewProps {
  schedules: ScheduleItem[];
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onEditSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onAddNew: () => void;
  colors: ColorScheme[];
}

export default function TimelineListView({
  schedules,
  onToggleStatus,
  onEditSchedule,
  onDeleteSchedule,
  onAddNew,
  colors
}: TimelineListViewProps) {
  const todayStr = getLocalDateStr();

  const groupedSchedules = useMemo(() => {
    return schedules.reduce((acc: Record<string, ScheduleItem[]>, curr) => {
      if (!acc[curr.date]) acc[curr.date] = [];
      acc[curr.date].push(curr);
      return acc;
    }, {});
  }, [schedules]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedSchedules).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
  }, [groupedSchedules]);

  if (sortedDates.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200/90 dark:border-slate-800 min-h-[480px] flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center text-blue-500 mb-4">
          <ListTodo size={40} />
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">
          Chưa có kế hoạch nào
        </h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm text-sm">
          Hãy tạo các buổi học, bài tập hoặc thói quen định kỳ để nhận được nhắc nhở đúng giờ.
        </p>
        <button 
          type="button"
          onClick={onAddNew} 
          className="mt-5 text-blue-600 dark:text-blue-400 font-bold hover:underline text-sm"
        >
          + Bắt đầu lên lịch ngay
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/90 dark:border-slate-800 min-h-[500px]">
      <div className="space-y-8">
        {sortedDates.map((dateKey) => {
          const dObj = new Date(dateKey);
          let dateLabel = dObj.toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            day: '2-digit', 
            month: '2-digit' 
          });
          if (dateKey === todayStr) dateLabel = "Hôm nay";

          return (
            <div key={dateKey} className="relative">
              {/* Header ngày dính trên cùng */}
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 z-10 border-b border-slate-100 dark:border-slate-800">
                <div className="h-7 w-1.5 bg-blue-500 rounded-full" />
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 capitalize">
                  {dateLabel}
                </h2>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                  {dateKey.split('-').reverse().join('/')}
                </span>
              </div>

              {/* Danh sách thẻ sự kiện trong ngày */}
              <div className="pl-4 space-y-3.5 relative before:absolute before:inset-y-0 before:left-[21px] before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {groupedSchedules[dateKey].map((schedule) => {
                  const col = colors.find(c => c.id === schedule.color) || colors[0];
                  const overdue = !schedule.is_completed && isOverdue(schedule.date, schedule.end_time);
                  const isHabit = schedule.title.includes('[Thói quen]') || (schedule.description && schedule.description.includes('lặp lại'));

                  return (
                    <div key={schedule.id} className="relative pl-8 group">
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                        schedule.is_completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`} />
                      
                      <div className={`flex items-start md:items-center justify-between p-4 rounded-2xl border transition-all ${
                        schedule.is_completed 
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' 
                          : `bg-white dark:bg-slate-900 ${col.border} hover:shadow-md`
                      }`}>
                        <div className="flex items-start gap-4">
                          <button 
                            type="button"
                            onClick={() => onToggleStatus(schedule.id, schedule.is_completed)} 
                            className={`mt-1 md:mt-0 transition-colors ${
                              schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'
                            }`}
                          >
                            {schedule.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-extrabold text-base ${
                                schedule.is_completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'
                              }`}>
                                {schedule.title}
                              </h4>
                              {isHabit && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                  <Repeat size={10} /> Thói quen
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                                schedule.is_completed ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : `${col.bg} ${col.text}`
                              }`}>
                                <Clock size={14} /> 
                                {schedule.start_time ? schedule.start_time.substring(0, 5) : '--:--'} - {schedule.end_time ? schedule.end_time.substring(0, 5) : '--:--'}
                              </span>
                              {overdue && (
                                <span className="flex items-center gap-1 text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-lg">
                                  <AlertCircle size={14} /> Quá hạn
                                </span>
                              )}
                            </div>
                            {schedule.description && (
                              <p className={`mt-2 text-sm font-medium ${
                                schedule.is_completed ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'
                              }`}>
                                {schedule.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          <button 
                            type="button"
                            onClick={() => onEditSchedule(schedule)} 
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all" 
                            title="Sửa"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteSchedule(schedule.id)} 
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-all" 
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
