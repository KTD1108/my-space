"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  X, 
  ListTodo, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList, 
  CalendarDays, 
  Edit2, 
  Image as ImageIcon,
  Columns3,
  Volume2,
  VolumeX,
  Bell,
  Repeat
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  getSchedules, 
  addSchedule, 
  addSchedules,
  updateScheduleStatus, 
  deleteSchedule, 
  updateSchedule, 
  getUploadUrl 
} from "@/app/actions/data";
import { ambientAudio } from "@/lib/ambientAudio";
import WeeklyScheduleView, { ScheduleItem, ColorScheme } from "@/components/WeeklyScheduleView";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'calendar' | 'timeline'>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  
  // Trạng thái Form thêm/sửa lịch & Xem chi tiết ngày
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState("blue");

  // Trạng thái Sự kiện lặp lại (Recurring Events)
  const [repeatMode, setRepeatMode] = useState<'none' | 'daily' | 'weekdays_246' | 'weekdays_357' | 'weekly'>('none');
  const [repeatWeeks, setRepeatWeeks] = useState<number>(4);

  // Trạng thái Âm thanh & Thông báo nhắc nhở
  const [soundReminderEnabled, setSoundReminderEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('schedule_sound_reminder');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  const colors: ColorScheme[] = useMemo(() => [
    { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', solid: 'bg-blue-500 text-white' },
    { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-950/50', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', solid: 'bg-purple-500 text-white' },
    { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', solid: 'bg-pink-500 text-white' },
    { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-950/50', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', solid: 'bg-orange-500 text-white' },
    { id: 'green', bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', solid: 'bg-emerald-500 text-white' },
  ], []);

  // Trạng thái Ảnh nền lịch cá nhân hóa
  const [calendarBg, setCalendarBg] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendar_custom_bg');
    }
    return null;
  });
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar_custom_bg_opacity');
      if (saved) return Number(saved);
    }
    return 75;
  });
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const getLocalDateStr = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await getSchedules();
      setSchedules((data || []) as ScheduleItem[]);
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Không thể tải lịch trình");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { 
    let ignore = false;

    async function loadInitialData() {
      try {
        const data = await getSchedules();
        if (!ignore) setSchedules((data || []) as ScheduleItem[]);
      } catch (e: unknown) {
        const err = e as Error;
        toast.error(err.message || "Không thể tải lịch trình");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadInitialData();

    // Yêu cầu quyền Notification nếu trình duyệt hỗ trợ
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => {
      ignore = true;
    };
  }, []);

  // Bộ giám sát thời gian học để phát chuông nhắc nhở nhẹ nhàng
  useEffect(() => {
    const checkScheduleReminder = () => {
      if (!soundReminderEnabled || schedules.length === 0) return;

      const now = new Date();
      const currentTodayStr = getLocalDateStr(now);
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      schedules.forEach((item) => {
        if (item.date !== currentTodayStr || item.is_completed) return;

        const [itemHStr, itemMStr] = (item.start_time || "").split(":");
        const itemH = parseInt(itemHStr, 10);
        const itemM = parseInt(itemMStr, 10);

        if (isNaN(itemH) || isNaN(itemM)) return;

        // Nếu khớp đúng giờ phút hiện tại
        if (itemH === currentHour && itemM === currentMinute) {
          const uniqueReminderKey = `${item.id}_${currentTodayStr}_${item.start_time}`;
          if (!notifiedEventsRef.current.has(uniqueReminderKey)) {
            notifiedEventsRef.current.add(uniqueReminderKey);

            // 1. Phát chuông Web Audio API nhẹ nhàng
            try {
              ambientAudio.playChime();
            } catch (err) {
              console.warn("[Schedule] Lỗi phát chime:", err);
            }

            // 2. Thông báo Toast nổi bật
            toast((t) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Đã đến giờ: {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              </div>
            ), { duration: 8000, id: uniqueReminderKey });

            // 3. Native browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`⏰ Đã đến giờ học: ${item.title}`, {
                body: `Thời gian: ${item.start_time.substring(0, 5)} - ${item.end_time.substring(0, 5)}\n${item.description || ''}`,
                icon: '/favicon.ico',
              });
            }
          }
        }
      });
    };

    // Kiểm tra định kỳ mỗi 20 giây
    const reminderInterval = setInterval(checkScheduleReminder, 20000);
    checkScheduleReminder(); // chạy ngay lập tức 1 lần

    return () => clearInterval(reminderInterval);
  }, [schedules, soundReminderEnabled]);

  const toggleSoundReminder = () => {
    const nextState = !soundReminderEnabled;
    setSoundReminderEnabled(nextState);
    localStorage.setItem('schedule_sound_reminder', String(nextState));
    if (nextState) {
      ambientAudio.playChime();
      toast.success("Đã bật chuông nhắc nhở học tập!");
    } else {
      toast("Đã tắt chuông nhắc nhở.", { icon: "🔕" });
    }
  };

  const handleTestChime = () => {
    try {
      ambientAudio.playChime();
      toast.success("🔔 Chuông nhắc nhở hoạt động tốt!");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error("Không thể phát chuông: " + err.message);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn một file ảnh hợp lệ (PNG, JPG, WEBP).");
      return;
    }

    setIsUploadingBg(true);
    const toastId = toast.loading("Đang tải ảnh nền lên...");

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          try {
            localStorage.setItem('calendar_custom_bg', reader.result);
            setCalendarBg(reader.result);
          } catch {
            const blobUrl = URL.createObjectURL(file);
            setCalendarBg(blobUrl);
          }
        }
      };
      reader.readAsDataURL(file);

      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `calendar_bg/${Date.now()}.${fileExt}`;
        const { signedUrl } = await getUploadUrl(fileName);
        await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
      } catch (cloudErr) {
        console.warn("[CalendarBg] Lưu trữ cloud không thành công, sử dụng bản lưu trình duyệt:", cloudErr);
      }

      toast.success("Đã cài đặt ảnh nền thành công!", { id: toastId });
    } catch (err: unknown) {
      const e = err as Error;
      toast.error("Lỗi khi tải ảnh: " + e.message, { id: toastId });
    } finally {
      setIsUploadingBg(false);
      e.target.value = '';
    }
  };

  const handleRemoveBg = () => {
    setCalendarBg(null);
    localStorage.removeItem('calendar_custom_bg');
    toast.success("Đã xóa ảnh nền, trở về mặc định.");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDate(getLocalDateStr());
    setStartTime("08:00");
    setEndTime("10:00");
    setColor("blue");
    setRepeatMode('none');
    setRepeatWeeks(4);
    setEditingId(null);
  };

  const openEditModal = (schedule: ScheduleItem) => {
    setTitle(schedule.title);
    setDescription(schedule.description || "");
    setDate(schedule.date);
    setStartTime(schedule.start_time ? schedule.start_time.substring(0, 5) : "08:00");
    setEndTime(schedule.end_time ? schedule.end_time.substring(0, 5) : "10:00");
    setColor(schedule.color);
    setRepeatMode('none'); // Khi sửa đơn lẻ, mặc định không áp dụng lại rule lặp
    setEditingId(schedule.id);
    setIsAdding(true);
  };

  const handleOpenAddAtSlot = (dateStr: string, startTimeStr: string) => {
    resetForm();
    setDate(dateStr);
    setStartTime(startTimeStr);
    
    // Tự động tính end_time là 1 tiếng sau start_time
    const [h, m] = startTimeStr.split(":").map(Number);
    const endH = Math.min(23, (h || 8) + 1);
    const endMStr = String(m || 0).padStart(2, "0");
    setEndTime(`${String(endH).padStart(2, "0")}:${endMStr}`);
    
    setIsAdding(true);
  };

  // Hàm sinh danh sách các ngày lặp lại (Recurring Dates)
  const generateRecurringDates = (baseDateStr: string, mode: typeof repeatMode, weeks: number): string[] => {
    if (mode === 'none') return [baseDateStr];

    const resultDates: string[] = [];
    const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number);
    const startDate = new Date(baseYear, baseMonth - 1, baseDay);
    const totalDays = weeks * 7;

    for (let i = 0; i < totalDays; i++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + i);
      const dayOfWeek = cur.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7

      let isMatch = false;
      if (mode === 'daily') {
        isMatch = true;
      } else if (mode === 'weekdays_246') {
        isMatch = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
      } else if (mode === 'weekdays_357') {
        isMatch = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
      } else if (mode === 'weekly') {
        isMatch = i % 7 === 0;
      }

      if (isMatch) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        resultDates.push(`${y}-${m}-${d}`);
      }
    }

    if (!resultDates.includes(baseDateStr)) {
      resultDates.unshift(baseDateStr);
    }

    return resultDates;
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên công việc / sự kiện!");
      return;
    }

    const basePayload = {
      title: title.trim(),
      description: description.trim() || null,
      start_time: startTime,
      end_time: endTime,
      color,
      is_completed: false
    };

    const loadingToast = toast.loading(editingId ? "Đang cập nhật..." : "Đang lên lịch...");
    try {
      if (editingId) {
        await updateSchedule(editingId, { ...basePayload, date });
        toast.success("Cập nhật sự kiện thành công!", { id: loadingToast });
      } else {
        // Kiểm tra xem có cấu hình lặp lại hay không
        if (repeatMode !== 'none') {
          const datesToCreate = generateRecurringDates(date, repeatMode, repeatWeeks);
          const batchPayloads = datesToCreate.map(d => ({
            ...basePayload,
            date: d
          }));

          await addSchedules(batchPayloads);
          toast.success(`Đã tạo thành công ${batchPayloads.length} buổi học lặp lại! 🎉`, { id: loadingToast });
        } else {
          await addSchedule({ ...basePayload, date });
          toast.success("Đã thêm lịch học!", { id: loadingToast });
        }
      }

      resetForm();
      setIsAdding(false);
      await fetchSchedules();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Lỗi: " + (err.message || "Không thể lưu sự kiện"), { id: loadingToast });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_completed: !currentStatus } : s));
      await updateScheduleStatus(id, !currentStatus);
      if (!currentStatus) toast.success("Hoàn thành xuất sắc! 🎉");
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Lỗi: " + err.message);
      fetchSchedules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch này không?")) return;
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteSchedule(id);
      toast.success("Đã xóa!", { id: loadingToast });
      fetchSchedules();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error("Lỗi: " + err.message, { id: loadingToast });
    }
  };

  const groupedSchedules = useMemo(() => {
    return schedules.reduce((acc: Record<string, ScheduleItem[]>, curr) => {
      if (!acc[curr.date]) acc[curr.date] = [];
      acc[curr.date].push(curr);
      return acc;
    }, {});
  }, [schedules]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedSchedules).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [groupedSchedules]);

  // Điều hướng Tuần
  const handleNavigateWeek = (action: "prev" | "next" | "today") => {
    if (action === "today") {
      setCurrentWeekDate(new Date());
    } else {
      const deltaDays = action === "next" ? 7 : -7;
      const nextDate = new Date(currentWeekDate);
      nextDate.setDate(currentWeekDate.getDate() + deltaDays);
      setCurrentWeekDate(nextDate);
    }
  };

  // Điều hướng Tháng
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const todayDateStr = getLocalDateStr();

  // Render Chế độ xem theo Tháng
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1; // T2 là đầu tuần

    const cells: React.ReactNode[] = [];
    
    // Header Ngày trong tuần
    const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    daysOfWeek.forEach(d => {
      cells.push(
        <div key={d} className={`text-center text-xs py-2 uppercase tracking-widest ${calendarBg ? 'font-extrabold text-slate-700 dark:text-slate-200 drop-shadow-2xs' : 'font-extrabold text-slate-400 dark:text-slate-500'}`}>
          {d}
        </div>
      );
    });

    // Ô trống đầu tháng
    for (let i = 0; i < startDay; i++) {
      cells.push(
        <div 
          key={`empty-${i}`} 
          className={`min-h-[120px] rounded-2xl ${calendarBg ? 'bg-white/30 dark:bg-slate-800/30 backdrop-blur-xs border border-white/20 dark:border-slate-800/30' : 'bg-slate-50/50 dark:bg-slate-800/30 border border-transparent'}`}
        />
      );
    }

    // Các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySchedules = groupedSchedules[dateStr] || [];
      const isToday = dateStr === todayDateStr;

      cells.push(
        <div 
          key={day} 
          onClick={() => setViewingDay(dateStr)}
          className={`min-h-[120px] border rounded-2xl p-2.5 transition-all cursor-pointer group hover:shadow-md ${
            calendarBg 
              ? 'bg-white/80 dark:bg-slate-900/80 hover:bg-white/95 dark:hover:bg-slate-900/95 backdrop-blur-xs border-white/70 dark:border-slate-800/70 hover:border-blue-400 shadow-2xs' 
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
          } ${isToday ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 ring-offset-1' : ''}`}
        >
          <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1.5 ${isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-700 dark:text-slate-300 group-hover:text-blue-600'}`}>
            {day}
          </div>
          
          <div className="space-y-1.5 overflow-hidden">
            {daySchedules.map((s) => {
              const col = colors.find(c => c.id === s.color) || colors[0];
              const timeDisplay = s.start_time ? s.start_time.substring(0, 5) : '--:--';
              return (
                <div 
                  key={s.id} 
                  onClick={(e) => { e.stopPropagation(); setViewingDay(dateStr); }}
                  className={`text-xs p-1.5 px-2 rounded-lg truncate font-bold transition-all ${s.is_completed ? 'opacity-40 line-through bg-slate-100 dark:bg-slate-800 text-slate-500' : col.solid} hover:brightness-110 shadow-sm`}
                  title={`${timeDisplay} - ${s.title}`}
                >
                  {timeDisplay} {s.title}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-all">
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

        {/* Header Lịch Tháng */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 capitalize drop-shadow-2xs">
            Tháng {currentMonth.getMonth() + 1} - {currentMonth.getFullYear()}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
              <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg transition-colors">Hôm nay</button>
              <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        {/* Lưới hiển thị các ngày */}
        <div className="relative z-10 grid grid-cols-7 gap-2">
          {cells}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full relative pb-10">
      {/* Tiêu đề & Bảng điều khiển */}
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
            Quản lý lịch học theo tuần và tháng với chuông nhắc nhở tự động
          </p>
        </div>
        
        {/* Nút bấm chuyển chế độ xem & thao tác */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Nhóm nút chế độ xem: Tuần / Tháng / Trục thời gian */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700">
            <button 
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                viewMode === 'week' 
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Xem lịch chi tiết 7 cột từ 07:00 đến 22:00"
            >
              <Columns3 size={15} /> 
              <span>Tuần</span>
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Xem tổng quan theo ô tháng"
            >
              <CalendarDays size={15} /> 
              <span>Tháng</span>
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                viewMode === 'timeline' 
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Xem danh sách công việc theo dòng thời gian"
            >
              <LayoutList size={15} /> 
              <span>Danh sách</span>
            </button>
          </div>

          {/* Công cụ âm thanh & hình nền */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            {/* Nút bật tắt chuông nhắc nhở */}
            <button
              onClick={toggleSoundReminder}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                soundReminderEnabled 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
              title={soundReminderEnabled ? "Đang bật chuông nhắc nhở (Bấm để tắt)" : "Chuông nhắc nhở đang tắt (Bấm để bật)"}
            >
              {soundReminderEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span className="hidden sm:inline">{soundReminderEnabled ? "Chuông: Bật" : "Chuông: Tắt"}</span>
            </button>

            {/* Nút thử chuông */}
            <button
              onClick={handleTestChime}
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Thử chuông thông báo Ambient Chime"
            >
              <Bell size={15} />
            </button>

            {/* Nút đổi ảnh nền */}
            <label 
              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
              title="Cài đặt ảnh nền cho bảng lịch"
            >
              <ImageIcon size={15} />
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleBgUpload} 
                disabled={isUploadingBg}
                className="hidden" 
              />
            </label>

            {calendarBg && (
              <>
                <div className="flex items-center gap-1 px-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400" title="Kéo để chỉnh độ sáng/mờ của nền">
                  <input 
                    type="range" 
                    min="25" 
                    max="95" 
                    value={bgOpacity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBgOpacity(val);
                      localStorage.setItem('calendar_custom_bg_opacity', String(val));
                    }}
                    className="w-14 accent-blue-600 h-1.5 cursor-pointer bg-slate-200 dark:bg-slate-700 rounded-lg"
                  />
                  <span className="font-mono text-[10px] w-6 text-right">{bgOpacity}%</span>
                </div>

                <button
                  onClick={handleRemoveBg}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  title="Xóa ảnh nền đã chọn"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
          
          {/* Nút Thêm Sự Kiện */}
          <button 
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={16} /> 
            <span>Thêm sự kiện</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full h-[580px] bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <div className="text-blue-500 font-bold flex items-center gap-2">
            <Clock className="animate-spin" /> Đang đồng bộ hóa lịch trình...
          </div>
        </div>
      ) : (
        <>
          {/* 1. CHẾ ĐỘ XEM THEO TUẦN (WEEKLY GOOGLE CALENDAR VIEW) */}
          {viewMode === 'week' && (
            <WeeklyScheduleView
              schedules={schedules}
              currentWeekDate={currentWeekDate}
              onNavigateWeek={handleNavigateWeek}
              onSelectSchedule={openEditModal}
              onToggleStatus={handleToggleStatus}
              onAddAtSlot={handleOpenAddAtSlot}
              colors={colors}
              calendarBg={calendarBg}
              bgOpacity={bgOpacity}
            />
          )}

          {/* 2. CHẾ ĐỘ XEM THEO THÁNG (MONTH CALENDAR VIEW) */}
          {viewMode === 'calendar' && renderCalendar()}

          {/* 3. CHẾ ĐỘ XEM THEO DÒNG THỜI GIAN (TIMELINE VIEW) */}
          {viewMode === 'timeline' && (
            <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/90 dark:border-slate-800 min-h-[500px]">
              {sortedDates.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center text-blue-500 mb-4">
                    <ListTodo size={40} />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Chưa có kế hoạch nào</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm text-sm">
                    Hãy tạo các buổi học, bài tập để nhận được âm thanh nhắc nhở đúng giờ.
                  </p>
                  <button onClick={() => { resetForm(); setIsAdding(true); }} className="mt-5 text-blue-600 dark:text-blue-400 font-bold hover:underline text-sm">
                    + Bắt đầu lên lịch ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {sortedDates.map(dateKey => {
                    const dObj = new Date(dateKey);
                    const todayStr = getLocalDateStr();
                    let dateLabel = dObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' });
                    if (dateKey === todayStr) dateLabel = "Hôm nay";

                    return (
                      <div key={dateKey} className="relative">
                        <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-2 z-10 border-b border-slate-100 dark:border-slate-800">
                          <div className="h-7 w-1.5 bg-blue-500 rounded-full"></div>
                          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 capitalize">{dateLabel}</h2>
                          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full">
                            {dateKey.split('-').reverse().join('/')}
                          </span>
                        </div>

                        <div className="pl-4 space-y-3.5 relative before:absolute before:inset-y-0 before:left-[21px] before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                          {groupedSchedules[dateKey].map((schedule) => {
                            const col = colors.find(c => c.id === schedule.color) || colors[0];
                            const isPast = new Date(`${schedule.date}T${schedule.end_time || '23:59'}`) < new Date();
                            
                            return (
                              <div key={schedule.id} className="relative pl-8 group">
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${schedule.is_completed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                
                                <div className={`flex items-start md:items-center justify-between p-4 rounded-2xl border transition-all ${
                                  schedule.is_completed 
                                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' 
                                    : `bg-white dark:bg-slate-900 ${col.border} hover:shadow-md`
                                }`}>
                                  <div className="flex items-start gap-4">
                                    <button 
                                      type="button"
                                      onClick={() => handleToggleStatus(schedule.id, schedule.is_completed)} 
                                      className={`mt-1 md:mt-0 transition-colors ${schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                                    >
                                      {schedule.is_completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </button>
                                    <div>
                                      <h4 className={`font-extrabold text-base mb-1 ${schedule.is_completed ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                        {schedule.title}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${schedule.is_completed ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : `${col.bg} ${col.text}`}`}>
                                          <Clock size={14} /> {schedule.start_time ? schedule.start_time.substring(0, 5) : '--:--'} - {schedule.end_time ? schedule.end_time.substring(0, 5) : '--:--'}
                                        </span>
                                        {!schedule.is_completed && isPast && (
                                          <span className="flex items-center gap-1 text-red-500 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded-lg">
                                            <AlertCircle size={14} /> Quá hạn
                                          </span>
                                        )}
                                      </div>
                                      {schedule.description && (
                                        <p className={`mt-2 text-sm font-medium ${schedule.is_completed ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                          {schedule.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-all mt-3 md:mt-0">
                                    <button onClick={() => openEditModal(schedule)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-all" title="Sửa"><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(schedule.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-all" title="Xóa"><Trash2 size={18} /></button>
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
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL XEM CHI TIẾT NGÀY (DAY VIEW) */}
      {viewingDay && !isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setViewingDay(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl capitalize">
                  {new Date(viewingDay).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Lịch trình chi tiết ngày này</p>
              </div>
              <button onClick={() => setViewingDay(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2">
              {(groupedSchedules[viewingDay] || []).length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center mb-4"><CalendarIcon size={24} /></div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Bạn hoàn toàn rảnh rỗi vào ngày này!</p>
                </div>
              ) : (
                (groupedSchedules[viewingDay] || []).map((schedule) => {
                  const col = colors.find(c => c.id === schedule.color) || colors[0];
                  return (
                    <div key={schedule.id} className={`flex items-start justify-between p-4 rounded-2xl border transition-all group ${schedule.is_completed ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60' : `bg-white dark:bg-slate-900 ${col.border}`}`}>
                      <div className="flex items-start gap-3">
                        <button 
                          type="button"
                          onClick={() => handleToggleStatus(schedule.id, schedule.is_completed)} 
                          className={`mt-0.5 transition-colors ${schedule.is_completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}
                        >
                          {schedule.is_completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                        </button>
                        <div>
                          <h4 className={`font-extrabold text-sm mb-1 ${schedule.is_completed ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{schedule.title}</h4>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${col.bg} ${col.text}`}>
                            <Clock size={12} /> {schedule.start_time.substring(0,5)} - {schedule.end_time.substring(0,5)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setViewingDay(null); openEditModal(schedule); }} className="text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" title="Sửa"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(schedule.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors" title="Xóa"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              onClick={() => { resetForm(); setDate(viewingDay); setViewingDay(null); setIsAdding(true); }}
              className="w-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={18} /> Thêm sự kiện mới cho ngày này
            </button>
          </div>
        </div>
      )}

      {/* MODAL THÊM/SỬA LỊCH HỌC KÈM RECURRING EVENTS */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                  {editingId ? <Edit2 size={20} /> : <CalendarIcon size={20} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">
                    {editingId ? "Sửa Sự Kiện" : "Thêm Sự Kiện Mới"}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {editingId ? "Cập nhật thông tin chi tiết sự kiện" : "Lên kế hoạch với tính năng lặp lại thông minh"}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tên công việc / Môn học *
                </label>
                <input 
                  type="text" 
                  required 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  autoFocus
                  placeholder="VD: Ôn tập Giải tích 1, Luyện IELTS..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Ngày bắt đầu thực hiện *
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

              {/* TÙY CHỌN SỰ KIỆN LẶP LẠI (RECURRING EVENTS) */}
              {!editingId && (
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Repeat size={16} />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Lặp lại sự kiện</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={repeatMode}
                      onChange={(e) => setRepeatMode(e.target.value as typeof repeatMode)}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="none">Không lặp lại (1 lần)</option>
                      <option value="daily">Hàng ngày (Mỗi ngày)</option>
                      <option value="weekdays_246">Thứ 2, Thứ 4, Thứ 6</option>
                      <option value="weekdays_357">Thứ 3, Thứ 5, Thứ 7</option>
                      <option value="weekly">Hàng tuần (vào cùng thứ)</option>
                    </select>

                    {repeatMode !== 'none' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Trong:</span>
                        <select
                          value={repeatWeeks}
                          onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={2}>2 tuần tới</option>
                          <option value={3}>3 tuần tới</option>
                          <option value={4}>4 tuần tới (Khuyên dùng)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {repeatMode !== 'none' && (
                    <p className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      💡 Hệ thống sẽ tự động tạo chuỗi các bản ghi lịch học tương ứng trong {repeatWeeks} tuần tới.
                    </p>
                  )}
                </div>
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
                      className={`w-9 h-9 rounded-full ${c.solid} ring-4 transition-all ${color === c.id ? 'ring-blue-300 dark:ring-blue-600 scale-110 shadow-md' : 'ring-transparent scale-100 hover:scale-105'}`}
                      title={`Màu ${c.id}`}
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all shadow-lg shadow-blue-600/30 active:scale-[0.99]"
              >
                {editingId ? "Cập nhật sự kiện" : (repeatMode !== 'none' ? `Lên lịch chuỗi ${repeatWeeks} tuần` : "Lưu sự kiện")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
