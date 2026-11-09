"use client";
import { useEffect, useState } from 'react';
import { getHomeDashboardData, HomeDashboardData } from './actions/data';
import { 
  CalendarDays, 
  FileText, 
  Image as ImageIcon, 
  Headphones, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
  FolderOpen,
  Flame,
  Play
} from 'lucide-react';
import Link from 'next/link';

const CACHE_KEY = 'myspace_dashboard_cache_v2';

export default function Home() {
  // Lấy dữ liệu đệm từ sessionStorage (nếu có) để vẽ màn hình TỨC THÌ trong 0ms không đợi server
  const [cachedData] = useState<HomeDashboardData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  });

  const [stats, setStats] = useState(cachedData?.stats || { docs: 0, songs: 0, photos: 0 });
  const [profile, setProfile] = useState<{name: string} | null>(cachedData?.profile || null);
  const [todaySchedules, setTodaySchedules] = useState<any[]>(cachedData?.todaySchedules || []);
  const [recentPhoto, setRecentPhoto] = useState<string | null>(cachedData?.recentPhoto || null);
  const [focusStats, setFocusStats] = useState(cachedData?.focusStats || { totalMinutes: 0, sessionsCount: 0 });
  const [loading, setLoading] = useState(!cachedData);

  // Lời chào theo thời gian trong ngày
  const hour = new Date().getHours();
  let greeting = "Chào buổi sáng";
  if (hour >= 12 && hour < 18) greeting = "Chào buổi chiều";
  else if (hour >= 18) greeting = "Chào buổi tối";

  const formatFocusTime = (minutes: number) => {
    if (!minutes || minutes <= 0) return "0 phút";
    if (minutes < 60) return `${minutes} phút`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} giờ`;
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // Chỉ gọi 1 Server Action duy nhất (giảm 80% độ trễ mạng và số lần xác thực)
        const data = await getHomeDashboardData();
        if (!isMounted) return;

        setStats(data.stats);
        if (data.profile) setProfile(data.profile);
        setTodaySchedules(data.todaySchedules);
        if (data.recentPhoto) setRecentPhoto(data.recentPhoto);

        // Đọc localStorage dự phòng cho các phiên học offline
        let localMinutes = 0;
        let localCount = 0;
        try {
          const raw = localStorage.getItem('my_space_focus_sessions');
          if (raw) {
            const sessions: any[] = JSON.parse(raw);
            const now = new Date();
            const todaySessions = sessions.filter((sess: any) => {
              if (!sess.completed_at) return false;
              return new Date(sess.completed_at).toDateString() === now.toDateString();
            });
            localMinutes = todaySessions.reduce((acc, curr) => acc + (Number(curr.duration_minutes) || 0), 0);
            localCount = todaySessions.length;
          }
        } catch (e) {
          console.warn("Lỗi đọc local focus sessions:", e);
        }

        const consolidatedFocus = {
          totalMinutes: Math.max(data.focusStats.totalMinutes || 0, localMinutes),
          sessionsCount: Math.max(data.focusStats.sessionsCount || 0, localCount)
        };
        setFocusStats(consolidatedFocus);

        // Lưu vào cache cho lần truy cập tiếp theo hiển thị ngay lập tức (0ms)
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            ...data,
            focusStats: consolidatedFocus
          }));
        } catch {}
      } catch (e) {
        console.error("Lỗi khi tải dữ liệu trang chủ:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();

    // Lắng nghe sự kiện hoàn thành phiên Pomodoro thời gian thực
    const handleFocusCompleted = (event: any) => {
      const addedMins = Number(event?.detail?.duration_minutes) || 25;
      setFocusStats(prev => ({
        totalMinutes: prev.totalMinutes + addedMins,
        sessionsCount: prev.sessionsCount + 1
      }));
    };

    window.addEventListener('focus-session-completed', handleFocusCompleted);
    return () => window.removeEventListener('focus-session-completed', handleFocusCompleted);
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[170px]">
          <div className="col-span-1 md:col-span-2 row-span-2 bg-slate-200/60 dark:bg-slate-800 rounded-2xl"></div>
          <div className="col-span-1 row-span-2 bg-slate-200/60 dark:bg-slate-800 rounded-2xl"></div>
          <div className="col-span-1 bg-slate-200/60 dark:bg-slate-800 rounded-2xl"></div>
          <div className="col-span-1 bg-slate-200/60 dark:bg-slate-800 rounded-2xl"></div>
          <div className="col-span-1 md:col-span-3 lg:col-span-4 bg-slate-200/60 dark:bg-slate-800 rounded-2xl h-36"></div>
        </div>
      </div>
    );
  }

  const currentDateFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="w-full space-y-7 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Bảng điều khiển</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 capitalize">{currentDateFormatted}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Nút / Huy hiệu Focus hôm nay */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-focus-hub'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Nhấn để mở Phòng học Focus"
          >
            <Flame size={14} className={focusStats.totalMinutes > 0 ? "fill-amber-500 text-amber-500 animate-pulse" : "text-amber-400"} />
            <span>Tập trung: {formatFocusTime(focusStats.totalMinutes)}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
            Không gian hoạt động
          </span>
        </div>
      </div>

      {/* REFINED BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[170px]">
        
        {/* 1. HERO FOCUS CARD (2x2) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-slate-900 text-white rounded-2xl p-6 md:p-8 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-xs group">
          {/* Subtle noise/gradient background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 space-y-2.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/10 backdrop-blur-md text-[11px] font-mono font-medium text-slate-300 border border-white/10">
              <Sparkles size={12} className="text-blue-400" />
              <span>Workspace Studio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              {greeting}, <br />
              <span className="text-blue-400">{profile?.name || 'Bạn'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-normal max-w-sm">
              Sẵn sàng cho các mục tiêu hôm nay. Hãy chọn tài liệu cần xem hoặc bật một giai điệu tập trung.
            </p>

            {/* Widget Thống kê Focus trong ngày */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Flame size={14} className={focusStats.totalMinutes > 0 ? "text-amber-400 animate-pulse" : "text-slate-400"} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">Tập trung hôm nay</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{formatFocusTime(focusStats.totalMinutes)}</span>
                    <span className="text-[10px] font-normal text-slate-400">({focusStats.sessionsCount} phiên)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-focus-hub'))}
                className="px-3 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-400/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Clock size={13} />
                Bật Pomodoro
              </button>
            </div>
          </div>

          <div className="relative z-10 pt-4 flex flex-wrap items-center gap-3">
            <Link 
              href="/docs" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <BookOpen size={14} />
              Mở tài liệu học
            </Link>
            <Link 
              href="/music" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors border border-white/10"
            >
              <Headphones size={14} />
              Nghe nhạc tập trung
            </Link>
          </div>
        </div>

        {/* 2. TODAY'S AGENDA CARD (1x2) */}
        <Link 
          href="/schedule" 
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/80 dark:border-blue-800/40">
              <CalendarDays size={18} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
          </div>

          <div className="mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Lịch trình hôm nay</h3>
            <p className="text-[11px] text-slate-400 font-medium">Việc cần giải quyết</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {todaySchedules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={24} className="text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-slate-400 font-medium text-xs">Không có lịch hẹn hôm nay</p>
              </div>
            ) : (
              todaySchedules.map(sch => (
                <div key={sch.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate">{sch.title}</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={11} /> {sch.start_time ? sch.start_time.substring(0, 5) : '--:--'}
                  </p>
                </div>
              ))
            )}
          </div>
        </Link>

        {/* 3. MUSIC STATS (1x1) */}
        <Link 
          href="/music" 
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100/80 dark:border-emerald-800/40">
              <Headphones size={16} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stats.songs}</span>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Bài hát lưu trữ</p>
          </div>
        </Link>

        {/* 4. DOCS STATS (1x1) */}
        <Link 
          href="/docs" 
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100/80 dark:border-indigo-800/40">
              <FolderOpen size={16} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stats.docs}</span>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Tài liệu & Bài giảng</p>
          </div>
        </Link>

        {/* 5. GALLERY HIGHLIGHT CARD (4x1) */}
        <Link 
          href="/gallery" 
          className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all group overflow-hidden relative"
        >
          {recentPhoto && (
            <div className="absolute right-0 top-0 w-1/2 h-full z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 dark:to-transparent z-10"></div>
              <img src={recentPhoto} alt="Recent" className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />
            </div>
          )}

          <div className="relative z-20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/80 dark:border-rose-800/40 flex items-center justify-center shrink-0">
              <ImageIcon size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Thư viện Kỷ niệm</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {stats.photos} bức ảnh và album đã lưu giữ
              </p>
            </div>
          </div>

          <div className="relative z-20 hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
            Khám phá thư viện <ArrowUpRight size={14} />
          </div>
        </Link>

      </div>
    </div>
  );
}
