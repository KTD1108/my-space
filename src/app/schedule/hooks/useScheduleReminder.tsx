"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import toast from "react-hot-toast";
import { ambientAudio } from "@/lib/ambientAudio";
import { ScheduleItem } from "../types";
import { getLocalDateStr } from "../utils";

export function useScheduleReminder(schedules: ScheduleItem[]) {
  const [soundReminderEnabled, setSoundReminderEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('schedule_sound_reminder');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const notifiedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Xin quyền notification trình duyệt nếu hỗ trợ
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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

        if (itemH === currentHour && itemM === currentMinute) {
          const uniqueKey = `${item.id}_${currentTodayStr}_${item.start_time}`;
          if (!notifiedEventsRef.current.has(uniqueKey)) {
            notifiedEventsRef.current.add(uniqueKey);

            try {
              ambientAudio.playChime();
            } catch (err) {
              console.warn("[Schedule] Lỗi phát chime:", err);
            }

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
                  type="button"
                  onClick={() => toast.dismiss(t.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              </div>
            ), { duration: 8000, id: uniqueKey });

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

    const reminderInterval = setInterval(checkScheduleReminder, 20000);
    checkScheduleReminder();

    return () => clearInterval(reminderInterval);
  }, [schedules, soundReminderEnabled]);

  const toggleSoundReminder = () => {
    const nextState = !soundReminderEnabled;
    setSoundReminderEnabled(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('schedule_sound_reminder', String(nextState));
    }
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

  return {
    soundReminderEnabled,
    toggleSoundReminder,
    handleTestChime
  };
}
