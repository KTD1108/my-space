"use client";

import React from "react";
import WeeklyScheduleView from "@/components/WeeklyScheduleView";
import { ScheduleItem, ColorScheme } from "../types";

export interface WeekGridViewProps {
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

export default function WeekGridView({
  schedules,
  currentWeekDate,
  onNavigateWeek,
  onSelectSchedule,
  onToggleStatus,
  onAddAtSlot,
  colors,
  calendarBg,
  bgOpacity
}: WeekGridViewProps) {
  return (
    <div className="w-full">
      <WeeklyScheduleView
        schedules={schedules}
        currentWeekDate={currentWeekDate}
        onNavigateWeek={onNavigateWeek}
        onSelectSchedule={onSelectSchedule}
        onToggleStatus={onToggleStatus}
        onAddAtSlot={onAddAtSlot}
        colors={colors}
        calendarBg={calendarBg}
        bgOpacity={bgOpacity}
      />
    </div>
  );
}
