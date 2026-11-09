"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import toast from "react-hot-toast";
import { 
  getSchedules, 
  addSchedule, 
  addSchedules, 
  updateSchedule, 
  updateScheduleStatus, 
  deleteSchedule 
} from "@/app/actions/data";
import { ScheduleItem, ViewMode, COLOR_SCHEMES, StudyPlanSession, ScheduleFormData } from "./types";
import { getStoredSchedules, saveStoredSchedules, generateRecurringDates } from "./utils";
import { useScheduleReminder } from "./hooks/useScheduleReminder";
import { useCalendarBackground } from "./hooks/useCalendarBackground";
import ScheduleHeader from "./components/ScheduleHeader";
import WeekGridView from "./components/WeekGridView";
import MonthCalendarView from "./components/MonthCalendarView";
import TimelineListView from "./components/TimelineListView";
import ScheduleModal from "./components/ScheduleModal";
import DayDetailsModal from "./components/DayDetailsModal";
import AIStudyPlanModal from "./components/AIStudyPlanModal";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(getStoredSchedules);
  const [isLoading, setIsLoading] = useState(() => getStoredSchedules().length === 0);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [slotDate, setSlotDate] = useState<string | undefined>();
  const [slotStartTime, setSlotStartTime] = useState<string | undefined>();
  const [viewingDay, setViewingDay] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const { soundReminderEnabled, toggleSoundReminder, handleTestChime } = useScheduleReminder(schedules);
  const bg = useCalendarBackground();

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await getSchedules();
      const items = (data || []) as ScheduleItem[];
      setSchedules(items);
      saveStoredSchedules(items);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Không thể tải lịch trình");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSchedules()
      .then((data) => {
        if (!active) return;
        const items = (data || []) as ScheduleItem[];
        setSchedules(items);
        saveStoredSchedules(items);
      })
      .catch((e: unknown) => {
        if (!active) return;
        toast.error((e as Error).message || "Không thể tải lịch trình");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleOpenAdd = (dateStr?: string, startTimeStr?: string) => {
    setEditingSchedule(null);
    setSlotDate(dateStr);
    setSlotStartTime(startTimeStr);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setSlotDate(schedule.date);
    setSlotStartTime(schedule.start_time?.substring(0, 5));
    setIsModalOpen(true);
  };

  const handleSaveSchedule = async (payload: ScheduleFormData) => {
    const { editingId, repeatMode, repeatWeeks, ...baseData } = payload;
    const toastId = toast.loading(editingId ? "Đang cập nhật..." : "Đang lưu sự kiện...");
    try {
      if (editingId) {
        await updateSchedule(editingId, baseData);
        toast.success("Cập nhật sự kiện thành công!", { id: toastId });
      } else if (repeatMode !== 'none') {
        const dates = generateRecurringDates(baseData.date, repeatMode, repeatWeeks);
        const batch = dates.map(d => ({ ...baseData, date: d, is_completed: false }));
        await addSchedules(batch);
        toast.success(`Đã lên lịch thành công chuỗi ${batch.length} buổi học! 🎉`, { id: toastId });
      } else {
        await addSchedule({ ...baseData, is_completed: false });
        toast.success("Đã thêm sự kiện!", { id: toastId });
      }
      await fetchSchedules();
    } catch (err: unknown) {
      toast.error("Lỗi: " + ((err as Error).message || "Không thể lưu"), { id: toastId });
      throw err;
    }
  };

  const handleAddBatchSchedules = async (sessions: StudyPlanSession[]) => {
    const payloads = sessions.map(s => ({ ...s, is_completed: false }));
    await addSchedules(payloads);
    await fetchSchedules();
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, is_completed: !currentStatus } : s));
      await updateScheduleStatus(id, !currentStatus);
      if (!currentStatus) toast.success("Hoàn thành xuất sắc! 🎉");
    } catch (error: unknown) {
      toast.error("Lỗi: " + (error as Error).message);
      fetchSchedules();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa lịch này không?")) return;
    const toastId = toast.loading("Đang xóa...");
    try {
      await deleteSchedule(id);
      toast.success("Đã xóa!", { id: toastId });
      fetchSchedules();
    } catch (error: unknown) {
      toast.error("Lỗi: " + (error as Error).message, { id: toastId });
    }
  };

  const handleNavigateWeek = (action: "prev" | "next" | "today") => {
    const next = new Date(currentWeekDate);
    if (action === "today") setCurrentWeekDate(new Date());
    else { next.setDate(next.getDate() + (action === "next" ? 7 : -7)); setCurrentWeekDate(next); }
  };

  const handleNavigateMonth = (action: "prev" | "next" | "today") => {
    if (action === "today") setCurrentMonth(new Date());
    else setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + (action === "next" ? 1 : -1), 1));
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full relative pb-10">
      <ScheduleHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        soundReminderEnabled={soundReminderEnabled}
        onToggleSoundReminder={toggleSoundReminder}
        onTestChime={handleTestChime}
        calendarBg={bg.calendarBg}
        bgOpacity={bg.bgOpacity}
        isUploadingBg={bg.isUploadingBg}
        onBgUpload={bg.handleBgUpload}
        onRemoveBg={bg.handleRemoveBg}
        onChangeOpacity={bg.handleChangeOpacity}
        onOpenAIModal={() => setIsAIModalOpen(true)}
        onOpenAddModal={() => handleOpenAdd()}
      />

      {isLoading ? (
        <div className="w-full h-[580px] bg-white dark:bg-slate-900 rounded-3xl animate-pulse border border-slate-200 dark:border-slate-800 flex items-center justify-center">
          <div className="text-blue-500 font-bold flex items-center gap-2">
            <Clock className="animate-spin" /> Đang đồng bộ hóa lịch trình...
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'week' && (
            <WeekGridView
              schedules={schedules}
              currentWeekDate={currentWeekDate}
              onNavigateWeek={handleNavigateWeek}
              onSelectSchedule={handleOpenEdit}
              onToggleStatus={handleToggleStatus}
              onAddAtSlot={handleOpenAdd}
              colors={COLOR_SCHEMES}
              calendarBg={bg.calendarBg}
              bgOpacity={bg.bgOpacity}
            />
          )}

          {viewMode === 'calendar' && (
            <MonthCalendarView
              currentMonth={currentMonth}
              onNavigateMonth={handleNavigateMonth}
              schedules={schedules}
              onSelectDay={(dayStr) => setViewingDay(dayStr)}
              colors={COLOR_SCHEMES}
              calendarBg={bg.calendarBg}
              bgOpacity={bg.bgOpacity}
            />
          )}

          {viewMode === 'timeline' && (
            <TimelineListView
              schedules={schedules}
              onToggleStatus={handleToggleStatus}
              onEditSchedule={handleOpenEdit}
              onDeleteSchedule={handleDelete}
              onAddNew={() => handleOpenAdd()}
              colors={COLOR_SCHEMES}
            />
          )}
        </>
      )}

      <DayDetailsModal
        isOpen={Boolean(viewingDay)}
        dateStr={viewingDay}
        schedules={schedules}
        colors={COLOR_SCHEMES}
        onClose={() => setViewingDay(null)}
        onToggleStatus={handleToggleStatus}
        onEditSchedule={(s) => { setViewingDay(null); handleOpenEdit(s); }}
        onDeleteSchedule={handleDelete}
        onAddForDay={(day) => { setViewingDay(null); handleOpenAdd(day); }}
      />

      <ScheduleModal
        key={isModalOpen ? (editingSchedule ? `edit_${editingSchedule.id}` : `add_${slotDate || 'today'}_${slotStartTime || 'default'}`) : 'closed'}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingSchedule={editingSchedule}
        initialDate={slotDate}
        initialStartTime={slotStartTime}
        colors={COLOR_SCHEMES}
        onSave={handleSaveSchedule}
      />

      <AIStudyPlanModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onAddBatchSchedules={handleAddBatchSchedules}
      />
    </div>
  );
}
