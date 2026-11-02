"use client";
import { useEffect, useState } from 'react';
import { getDashboardStats, getProfileData, getSchedules, getPhotos } from './actions/data';
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
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({ docs: 0, songs: 0, photos: 0 });
  const [profile, setProfile] = useState<{name: string} | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [recentPhoto, setRecentPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lời chào theo thời gian trong ngày
  const hour = new Date().getHours();
  let greeting = "Chào buổi sáng";
  if (hour >= 12 && hour < 18) greeting = "Chào buổi chiều";
  else if (hour >= 18) greeting = "Chào buổi tối";

  useEffect(() => {
    async function loadData() {
      try {
        const [s, p, scheds, photos] = await Promise.all([
          getDashboardStats(),
          getProfileData(),
          getSchedules(),
          getPhotos()
        ]);
        setStats(s);
        setProfile(p as any);

        const todayStr = new Date().toISOString().split('T')[0];
        setTodaySchedules(scheds.filter((sch: any) => sch.date === todayStr && !sch.is_completed).slice(0, 3));

        if (photos && photos.length > 0) {
          setRecentPhoto(photos[0].publicUrl);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200/70 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[170px]">
          <div className="col-span-1 md:col-span-2 row-span-2 bg-slate-200/60 rounded-2xl"></div>
          <div className="col-span-1 row-span-2 bg-slate-200/60 rounded-2xl"></div>
          <div className="col-span-1 bg-slate-200/60 rounded-2xl"></div>
          <div className="col-span-1 bg-slate-200/60 rounded-2xl"></div>
          <div className="col-span-1 md:col-span-3 lg:col-span-4 bg-slate-200/60 rounded-2xl h-36"></div>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bảng điều khiển</h1>
          <p className="text-xs font-medium text-slate-500 mt-1 capitalize">{currentDateFormatted}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            Không gian hoạt động
          </span>
        </div>
      </div>

      {/* REFINED BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[170px]">
        
        {/* 1. HERO FOCUS CARD (2x2) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-slate-900 text-white rounded-2xl p-7 md:p-8 border border-slate-800 flex flex-col justify-between relative overflow-hidden shadow-xs group">
          {/* Subtle noise/gradient background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 space-y-3">
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
          </div>

          <div className="relative z-10 pt-6 flex flex-wrap items-center gap-3">
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
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 flex flex-col hover:border-slate-300 hover:shadow-xs transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80">
              <CalendarDays size={18} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
          </div>

          <div className="mb-3">
            <h3 className="font-bold text-sm text-slate-900">Lịch trình hôm nay</h3>
            <p className="text-[11px] text-slate-400 font-medium">Việc cần giải quyết</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {todaySchedules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={24} className="text-slate-300 mb-2" />
                <p className="text-slate-400 font-medium text-xs">Không có lịch hẹn hôm nay</p>
              </div>
            ) : (
              todaySchedules.map(sch => (
                <div key={sch.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                  <h4 className="font-semibold text-slate-800 text-xs truncate">{sch.title}</h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                    <Clock size={11} /> {sch.start_time.substring(0,5)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Link>

        {/* 3. MUSIC STATS (1x1) */}
        <Link 
          href="/music" 
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 bg-white rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80">
              <Headphones size={16} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.songs}</span>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Bài hát lưu trữ</p>
          </div>
        </Link>

        {/* 4. DOCS STATS (1x1) */}
        <Link 
          href="/docs" 
          className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 bg-white rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all group"
        >
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/80">
              <FolderOpen size={16} />
            </div>
            <ArrowUpRight size={16} className="text-slate-400 group-hover:text-slate-800 transition-colors" />
          </div>
          <div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">{stats.docs}</span>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Tài liệu & Bài giảng</p>
          </div>
        </Link>

        {/* 5. GALLERY HIGHLIGHT CARD (4x1) */}
        <Link 
          href="/gallery" 
          className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 bg-white rounded-2xl p-5 md:p-6 border border-slate-200/80 flex items-center justify-between hover:border-slate-300 hover:shadow-xs transition-all group overflow-hidden relative"
        >
          {recentPhoto && (
            <div className="absolute right-0 top-0 w-1/2 h-full z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10"></div>
              <img src={recentPhoto} alt="Recent" className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />
            </div>
          )}

          <div className="relative z-20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/80 flex items-center justify-center shrink-0">
              <ImageIcon size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Thư viện Kỷ niệm</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {stats.photos} bức ảnh và album đã lưu giữ
              </p>
            </div>
          </div>

          <div className="relative z-20 hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            Khám phá thư viện <ArrowUpRight size={14} />
          </div>
        </Link>

      </div>
    </div>
  );
}
