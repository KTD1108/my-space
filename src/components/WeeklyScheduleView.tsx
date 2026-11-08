"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Calendar as CalendarIcon 
} from "lucide-react";

export interface ScheduleItem {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM or HH:MM:SS
  end_time: string; // HH:MM or HH:MM:SS
  color: string;
  is_completed: boolean;
  created_at?: string;
}

export interface ColorScheme {
  id: string;
  bg: string;
  text: string;
  border: string;
  solid: string;
}

interface WeeklyScheduleViewProps {
  schedules: ScheduleItem[];
  currentWeekDate: Date;
  onNavigateWeek: (action: "prev" | "next" | "today") => void;
  onSelectSchedule: (schedule: ScheduleItem) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onAddAtSlot: (dateStr: string, startTimeStr: string) => void;
  colors: ColorScheme[];
  calendarBg?: string | null;
  bgOpacity?: number;
}

// Giờ bắt đầu và kết thúc hiển thị trên trục thời gian
const START_HOUR = 7; // 07:00
const END_HOUR = 22; // 22:00
const HOUR_HEIGHT = 64; // pixels cho mỗi 60 phút (khoảng 1.066px/phút)

// Chuyển "HH:mm" thành số phút tính từ 00:00
function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

// Format Date sang YYYY-MM-DD
function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Lấy danh sách 7 ngày trong tuần bắt đầu từ Thứ 2
function getWeekDays(baseDate: Date): Date[] {
  const date = new Date(baseDate);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

export default function WeeklyScheduleView({
  schedules,
  currentWeekDate,
  onNavigateWeek,
  onSelectSchedule,
  onToggleStatus,
  onAddAtSlot,
  colors,
  calendarBg,
  bgOpacity = 75,
}: WeeklyScheduleViewProps) {
  // Trạng thái thời gian hiện tại để cập nhật vạch thời gian thực
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Cập nhật mỗi phút
    return () => clearInterval(timer);
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentWeekDate), [currentWeekDate]);
  const todayStr = useMemo(() => formatDateToISO(new Date()), []);

  // Danh sách các mốc giờ từ START_HOUR đến END_HOUR
  const hoursList = useMemo(() => {
    const list: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Nhóm sự kiện theo ngày
  const schedulesByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};
    for (const s of schedules) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [schedules]);

  // Vị trí thanh giờ hiện tại (đỏ)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startDayMinutes = START_HOUR * 60;
  const endDayMinutes = (END_HOUR + 1) * 60;
  const isNowInVisibleRange = currentMinutes >= startDayMinutes && currentMinutes <= endDayMinutes;
  const nowIndicatorTop = ((currentMinutes - startDayMinutes) / 60) * HOUR_HEIGHT;

  // Tiêu đề khoảng ngày tuần
  const weekTitle = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const fStr = `${String(first.getDate()).padStart(2, "0")}/${String(first.getMonth() + 1).padStart(2, "0")}`;
    const lStr = `${String(last.getDate()).padStart(2, "0")}/${String(last.getMonth() + 1).padStart(2, "0")}/${last.getFullYear()}`;
    return `Tuần: ${fStr} - ${lStr}`;
  }, [weekDays]);

  const weekdayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all flex flex-col">
      {/* Ảnh nền cá nhân hóa */}
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

      {/* Header điều hướng tuần */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              {weekTitle}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chế độ xem lịch Google Calendar (7:00 - 22:00)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <button
            onClick={() => onNavigateWeek("prev")}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Tuần trước"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => onNavigateWeek("today")}
            className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors"
          >
            Tuần này
          </button>
          <button
            onClick={() => onNavigateWeek("next")}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
            title="Tuần sau"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Vùng Lịch Tuần (Hỗ trợ cuộn ngang trên di động, cuộn dọc trục giờ) */}
      <div className="relative z-10 flex-1 overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs select-none">
        <div className="min-w-[760px] md:min-w-[850px] flex flex-col">
          {/* Header 7 Cột Ngày */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 sticky top-0 z-20 backdrop-blur-md">
            {/* Góc ô giờ */}
            <div className="py-2.5 px-1 text-center text-[11px] font-extrabold text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800 uppercase flex items-center justify-center">
              Giờ
            </div>

            {/* 7 ngày trong tuần */}
            {weekDays.map((d, index) => {
              const dStr = formatDateToISO(d);
              const isToday = dStr === todayStr;
              return (
                <div
                  key={dStr}
                  className={`py-2 px-1 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 transition-colors ${
                    isToday ? "bg-blue-50/70 dark:bg-blue-950/40" : ""
                  }`}
                >
                  <div
                    className={`text-[11px] uppercase tracking-wider font-extrabold ${
                      isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {weekdayNames[index]}
                  </div>
                  <div className="mt-0.5 flex items-center justify-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all ${
                        isToday
                          ? "bg-blue-600 text-white shadow-sm shadow-blue-400/50 scale-105"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Thân Lịch: Trục giờ bên trái và 7 Cột sự kiện */}
          <div
            className="relative grid grid-cols-[64px_repeat(7,1fr)]"
            style={{ height: `${hoursList.length * HOUR_HEIGHT}px` }}
          >
            {/* Cột 1: Nhãn Trục Giờ (Sticky bên trái khi scroll ngang) */}
            <div className="relative border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 text-right pr-2 select-none z-10">
              {hoursList.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-[11px] font-bold text-slate-400 dark:text-slate-500 pr-2 -translate-y-2.5 pointer-events-none"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Các đường kẻ ngang chia giờ xuyên suốt toàn bộ 7 cột */}
            <div className="absolute inset-0 left-[64px] pointer-events-none">
              {hoursList.map((_, i) => (
                <div
                  key={`line-${i}`}
                  className="absolute left-0 right-0 border-t border-slate-100 dark:border-slate-800/80"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {/* Đường kẻ mờ phân nửa giờ (:30) */}
                  <div
                    className="absolute left-0 right-0 border-t border-dashed border-slate-50 dark:border-slate-800/40"
                    style={{ top: `${HOUR_HEIGHT / 2}px` }}
                  />
                </div>
              ))}
            </div>

            {/* 7 Cột Ngày đại diện cho 7 ngày */}
            {weekDays.map((d) => {
              const dStr = formatDateToISO(d);
              const isToday = dStr === todayStr;
              const dayEvents = schedulesByDate[dStr] || [];

              return (
                <div
                  key={dStr}
                  className={`relative border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 h-full transition-colors ${
                    isToday ? "bg-blue-50/20 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Ô bấm vào từng giờ để tạo nhanh sự kiện */}
                  {hoursList.map((h) => {
                    const timeSlotStr = `${String(h).padStart(2, "0")}:00`;
                    return (
                      <div
                        key={`slot-${dStr}-${h}`}
                        onClick={() => onAddAtSlot(dStr, timeSlotStr)}
                        className="absolute left-0 right-0 group/slot hover:bg-blue-100/40 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
                        style={{
                          top: `${(h - START_HOUR) * HOUR_HEIGHT}px`,
                          height: `${HOUR_HEIGHT}px`,
                        }}
                        title={`Bấm để thêm sự kiện lúc ${timeSlotStr} ngày ${dStr}`}
                      >
                        <span className="hidden group-hover/slot:inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold p-1">
                          <Plus size={11} /> {timeSlotStr}
                        </span>
                      </div>
                    );
                  })}

                  {/* Vạch đỏ chỉ giờ thực tế hôm nay */}
                  {isToday && isNowInVisibleRange && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                      style={{ top: `${nowIndicatorTop}px` }}
                    >
                      <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-red-500 shadow-xs shadow-red-500 animate-pulse" />
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  )}

                  {/* Vẽ các Block Sự Kiện theo đúng mốc thời gian */}
                  {dayEvents.map((schedule) => {
                    const startMin = parseTimeToMinutes(schedule.start_time);
                    const endMin = parseTimeToMinutes(schedule.end_time);
                    const duration = Math.max(25, endMin - startMin); // Ít nhất 25 phút để card dễ nhìn

                    // Tính vị trí top & height theo pixel
                    const eventTop = ((startMin - startDayMinutes) / 60) * HOUR_HEIGHT;
                    const eventHeight = (duration / 60) * HOUR_HEIGHT;
                    const col = colors.find((c) => c.id === schedule.color) || colors[0];

                    // Nếu sự kiện nằm ngoài phạm vi 07:00 - 23:00, ta vẫn clamp để không bay ra ngoài
                    const clampedTop = Math.max(0, eventTop);

                    return (
                      <div
                        key={schedule.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSchedule(schedule);
                        }}
                        className={`absolute left-1 right-1 rounded-xl p-2 z-20 cursor-pointer transition-all border shadow-xs hover:shadow-md hover:scale-[1.01] hover:z-30 overflow-hidden flex flex-col justify-between group ${
                          schedule.is_completed
                            ? "bg-slate-100/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 opacity-60 text-slate-500"
                            : `${col.bg} dark:bg-opacity-20 ${col.border} dark:border-opacity-40`
                        }`}
                        style={{
                          top: `${clampedTop}px`,
                          height: `${Math.max(34, eventHeight - 2)}px`,
                        }}
                        title={`${schedule.title} (${schedule.start_time.substring(0, 5)} - ${schedule.end_time.substring(0, 5)})`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleStatus(schedule.id, schedule.is_completed);
                                }}
                                className="text-slate-400 hover:text-emerald-500 dark:text-slate-500 dark:hover:text-emerald-400 transition-colors shrink-0"
                                title={schedule.is_completed ? "Đánh dấu chưa xong" : "Đánh dấu hoàn thành"}
                              >
                                {schedule.is_completed ? (
                                  <CheckCircle2 size={13} className="text-emerald-500" />
                                ) : (
                                  <Circle size={13} />
                                )}
                              </button>
                              <h4
                                className={`text-[11px] font-bold truncate leading-tight ${
                                  schedule.is_completed
                                    ? "line-through text-slate-500 dark:text-slate-400"
                                    : "text-slate-800 dark:text-slate-100"
                                }`}
                              >
                                {schedule.title}
                              </h4>
                            </div>

                            {eventHeight >= 46 && (
                              <div
                                className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${
                                  schedule.is_completed
                                    ? "text-slate-400"
                                    : `${col.text} dark:text-slate-300`
                                }`}
                              >
                                <Clock size={10} className="shrink-0" />
                                <span>
                                  {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {eventHeight >= 70 && schedule.description && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-medium">
                            {schedule.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
