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

export type RepeatMode = 
  | 'none' 
  | 'daily' 
  | 'weekdays_mon_fri' 
  | 'weekdays_246' 
  | 'weekdays_357' 
  | 'weekly';

export type ViewMode = 'week' | 'calendar' | 'timeline';

export interface ScheduleFormData {
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  repeatMode: RepeatMode;
  repeatWeeks: number;
  editingId?: string;
}

export interface StudyPlanSession {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
}

export interface GenerateStudyPlanResponse {
  success: boolean;
  message?: string;
  sessions: StudyPlanSession[];
  summary?: string;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'blue', bg: 'bg-blue-100 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', solid: 'bg-blue-500 text-white' },
  { id: 'purple', bg: 'bg-purple-100 dark:bg-purple-950/50', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', solid: 'bg-purple-500 text-white' },
  { id: 'pink', bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', solid: 'bg-pink-500 text-white' },
  { id: 'orange', bg: 'bg-orange-100 dark:bg-orange-950/50', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', solid: 'bg-orange-500 text-white' },
  { id: 'green', bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', solid: 'bg-emerald-500 text-white' },
];

export const PRESET_SUBJECT_TAGS = [
  'Toán học',
  'Ngữ văn',
  'Tiếng Anh',
  'Lập trình',
  'Khoa học',
  'Kỹ năng mềm',
  'Thói quen',
  'Ôn thi',
] as const;
