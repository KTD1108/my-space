"use client";

import React from "react";
import { X, Calendar as CalendarIcon, Clock, CheckCircle2, Circle, Edit2, Trash2, Plus, Repeat } from "lucide-react";
import { ScheduleItem, ColorScheme } from "../types";

export interface DayDetailsModalProps {
  isOpen: boolean;
  dateStr: string | null;
  schedules: ScheduleItem[];
  colors: ColorScheme[];
  onClose: () => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onEditSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onAddForDay: (dateStr: string) => void;
}

export default function DayDetailsModal({
  isOpen,
  dateStr,
  schedules,
  colors,
  onClose,
  onToggleStatus,
  onEditSchedule,
  onDeleteSchedule,
  onAddForDay
}: DayDetailsModalProps) {
  if (!isOpen || !dateStr) return null;

  const daySchedules = schedules.filter(s => s.date === dateStr);
  const formattedDate = new Date(dateStr).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[85vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl capitalize">
              {formattedDate}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Lịch trình chi tiết trong ngày
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
          {daySchedules.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                Bạn hoàn toàn rảnh rỗi vào ngày này!
              </p>
            </div>
          ) : (
            daySchedules.map((schedule) => {
              const col = colors.find(c => c.id === schedule.color) || colors[0];
              const isHabit = schedule.title.includes('[Thói quen]') || (schedule.description && schedule.description.includes('lặp lại'));

              return (
                <div 
                  key={schedule.id} 
                  className={`flex items-start justify-between p-4 rounded-2xl border transition-all group ${
                    schedule.is_completed 
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' 
                      : `bg-white dark:bg-slate-900 ${col.border}`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button 
                      type="button"
                      onClick={() => onToggleStatus(schedule.id, schedule.is_completed)} 
                      className={`mt-0.5 transition-colors ${
                        schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'
                      }`}
                    >
                      {schedule.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <h4 className={`font-extrabold text-sm ${
                          schedule.is_completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'
                        }`}>
                          {schedule.title}
                        </h4>
                        {isHabit && <Repeat size={12} className="text-blue-500" />}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${col.bg} ${col.text}`}>
                        <Clock size={12} /> {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={() => onEditSchedule(schedule)} 
                      className="text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" 
                      title="Sửa"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => onDeleteSchedule(schedule.id)} 
                      className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" 
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button 
          type="button"
          onClick={() => onAddForDay(dateStr)}
          className="w-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} /> Thêm sự kiện mới cho ngày này
        </button>
      </div>
    </div>
  );
}
