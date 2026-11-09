import { ScheduleItem, RepeatMode } from "./types";

export const SCHEDULES_CACHE_KEY = 'myspace_schedules_cache_v2';

export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getStoredSchedules(): ScheduleItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCHEDULES_CACHE_KEY)
      || localStorage.getItem('myspace_schedules_cache_v1')
      || sessionStorage.getItem('myspace_schedules_cache_v1');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("[ScheduleCache] Không thể đọc cache:", err);
  }
  return [];
}

export function saveStoredSchedules(items: ScheduleItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SCHEDULES_CACHE_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn("[ScheduleCache] Không thể lưu cache:", err);
  }
}

/**
 * Sinh danh sách các ngày theo chu kỳ lặp lại cho sự kiện/thói quen
 */
export function generateRecurringDates(
  baseDateStr: string, 
  mode: RepeatMode, 
  weeks: number
): string[] {
  if (mode === 'none') return [baseDateStr];

  const resultDates: string[] = [];
  const [baseYear, baseMonth, baseDay] = baseDateStr.split('-').map(Number);
  const startDate = new Date(baseYear, baseMonth - 1, baseDay);
  const safeWeeks = Math.max(1, Math.min(weeks, 12));
  const totalDays = safeWeeks * 7;

  for (let i = 0; i < totalDays; i++) {
    const cur = new Date(startDate);
    cur.setDate(startDate.getDate() + i);
    const dayOfWeek = cur.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7

    let isMatch = false;
    switch (mode) {
      case 'daily':
        isMatch = true;
        break;
      case 'weekdays_mon_fri':
        // Thứ 2 đến Thứ 6 (Mon - Fri)
        isMatch = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;
      case 'weekdays_246':
        isMatch = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
        break;
      case 'weekdays_357':
        isMatch = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
        break;
      case 'weekly':
        isMatch = i % 7 === 0;
        break;
      default:
        isMatch = false;
    }

    if (isMatch) {
      resultDates.push(getLocalDateStr(cur));
    }
  }

  if (!resultDates.includes(baseDateStr)) {
    resultDates.unshift(baseDateStr);
  }

  return resultDates;
}

export function isOverdue(dateStr: string, endTimeStr?: string): boolean {
  try {
    const end = endTimeStr || '23:59';
    return new Date(`${dateStr}T${end}`) < new Date();
  } catch {
    return false;
  }
}
