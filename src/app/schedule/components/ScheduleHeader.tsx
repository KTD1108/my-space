"use client";

import React from "react";
import { 
  Clock, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Columns3,
  CalendarDays,
  LayoutList,
  Volume2,
  VolumeX,
  Bell,
  Sparkles
} from "lucide-react";
import { ViewMode } from "../types";

export interface ScheduleHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  soundReminderEnabled: boolean;
  onToggleSoundReminder: () => void;
  onTestChime: () => void;
  calendarBg: string | null;
  bgOpacity: number;
  isUploadingBg: boolean;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBg: () => void;
  onChangeOpacity: (val: number) => void;
  onOpenAIModal: () => void;
  onOpenAddModal: () => void;
}

export default function ScheduleHeader({
  viewMode,
  onViewModeChange,
  soundReminderEnabled,
  onToggleSoundReminder,
  onTestChime,
  calendarBg,
  bgOpacity,
  isUploadingBg,
  onBgUpload,
  onRemoveBg,
  onChangeOpacity,
  onOpenAIModal,
  onOpenAddModal,
}: ScheduleHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Kế hoạch học tập
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
            <Clock size={12} /> Google Calendar Style
          </span>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-xs sm:text-sm">
          Quản lý lịch học, thói quen định kỳ và chuông nhắc nhở tự động
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
        {/* Nút chuyển chế độ xem */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700">
          <button 
            type="button"
            onClick={() => onViewModeChange('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              viewMode === 'week' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Columns3 size={15} /> <span>Tuần</span>
          </button>
          <button 
            type="button"
            onClick={() => onViewModeChange('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              viewMode === 'calendar' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={15} /> <span>Tháng</span>
          </button>
          <button 
            type="button"
            onClick={() => onViewModeChange('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
              viewMode === 'timeline' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LayoutList size={15} /> <span>Danh sách</span>
          </button>
        </div>

        {/* Nhắc nhở & Wallpaper */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onClick={onToggleSoundReminder}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              soundReminderEnabled 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
            title="Bật/tắt chuông nhắc nhở"
          >
            {soundReminderEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{soundReminderEnabled ? "Chuông: Bật" : "Chuông: Tắt"}</span>
          </button>

          <button
            type="button"
            onClick={onTestChime}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            title="Thử chuông"
          >
            <Bell size={15} />
          </button>

          <label className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer" title="Cài đặt ảnh nền">
            <ImageIcon size={15} />
            <input type="file" accept="image/*" onChange={onBgUpload} disabled={isUploadingBg} className="hidden" />
          </label>

          {calendarBg && (
            <>
              <input 
                type="range" min="25" max="95" value={bgOpacity}
                onChange={(e) => onChangeOpacity(Number(e.target.value))}
                className="w-12 accent-blue-600 h-1.5 cursor-pointer bg-slate-200 dark:bg-slate-700 rounded-lg"
                title="Độ mờ nền"
              />
              <button type="button" onClick={onRemoveBg} className="p-1.5 text-slate-400 hover:text-red-500 rounded-xl" title="Xóa nền">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
        
        {/* Nút Trợ lý AI Xếp Lịch */}
        <button 
          type="button"
          onClick={onOpenAIModal}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95"
          title="Lập kế hoạch và lộ trình học tập bằng Trợ lý AI"
        >
          <Sparkles size={16} /> 
          <span>AI Xếp lịch</span>
        </button>

        {/* Nút Thêm Sự Kiện */}
        <button 
          type="button"
          onClick={onOpenAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 active:scale-95"
        >
          <Plus size={16} /> 
          <span>Thêm sự kiện</span>
        </button>
      </div>
    </div>
  );
}
