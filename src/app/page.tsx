"use client";
import { useEffect, useState } from 'react';
import { getDashboardStats, getProfileData, getSchedules, getPhotos } from './actions/data';
import { CalendarDays, FileText, Image as ImageIcon, Music, PlayCircle, Clock, ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [stats, setStats] = useState({ docs: 0, songs: 0, photos: 0 });
  const [profile, setProfile] = useState<{name: string} | null>(null);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [recentPhoto, setRecentPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Lời chào theo thời gian
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
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 auto-rows-[180px] animate-pulse">
          <div className="col-span-1 md:col-span-2 row-span-2 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="col-span-1 md:col-span-1 row-span-2 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="col-span-1 md:col-span-1 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1 bg-slate-200 rounded-[2.5rem]"></div>
          <div className="col-span-1 md:col-span-3 lg:col-span-4 bg-slate-200 rounded-[2.5rem]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-4 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tổng quan</h1>
          <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">Không gian cá nhân của bạn</p>
        </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[180px]">
        
        {/* 1. KHỐI CHÀO MỪNG (2x2) */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden flex flex-col justify-between group cursor-default transition-transform">
          {/* Vòng tròn trang trí */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 group-hover:scale-125 transition-transform duration-700 ease-in-out"></div>
          
          <div className="relative z-10">
            <p className="text-white/80 font-bold uppercase tracking-widest text-sm mb-3">
              {new Date().toLocaleDateString('vi-VN', {weekday: 'long', day:'2-digit', month:'long'})}
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              {greeting},<br/>{profile?.name || 'Bạn'}!
            </h2>
          </div>
          
          <div className="relative z-10 flex items-center gap-4 mt-8">
            <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 border border-white/20">
              Hôm nay thật đẹp trời ☁️
            </div>
          </div>
        </div>

        {/* 2. KHỐI LỊCH HỌC HÔM NAY (1x2) */}
        <Link href="/schedule" className="col-span-1 md:col-span-1 lg:col-span-1 row-span-2 bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 flex flex-col hover:shadow-lg hover:border-blue-200 transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
              <CalendarDays size={26} />
            </div>
            <ArrowUpRight size={24} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
          </div>
          <h3 className="font-extrabold text-xl text-slate-800 mb-5">Lịch hôm nay</h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {todaySchedules.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                <p className="text-slate-500 font-bold text-sm">Tuyệt vời! Hôm nay bạn rảnh rỗi.</p>
              </div>
            ) : (
              todaySchedules.map(sch => (
                <div key={sch.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                  <h4 className="font-extrabold text-slate-700 text-sm truncate">{sch.title}</h4>
                  <p className="text-xs font-bold text-slate-400 mt-1.5 flex items-center gap-1.5"><Clock size={12}/> {sch.start_time.substring(0,5)}</p>
                </div>
              ))
            )}
          </div>
        </Link>

        {/* 3. KHỐI NHẠC (1x1) */}
        <Link href="/music" className="col-span-1 md:col-span-1 lg:col-span-1 row-span-1 bg-slate-900 rounded-[2.5rem] p-7 text-white shadow-xl shadow-slate-900/20 flex flex-col justify-between hover:scale-[1.03] transition-transform group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-900/40 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <Music size={22} className="text-emerald-400" />
            </div>
            <ArrowUpRight size={20} className="text-white/30 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="relative z-10">
            <p className="text-5xl font-black mb-1">{stats.songs}</p>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-wider">Bài hát</p>
          </div>
        </Link>

        {/* 4. KHỐI TÀI LIỆU (1x1) */}
        <Link href="/docs" className="col-span-1 md:col-span-2 lg:col-span-1 row-span-1 bg-blue-600 rounded-[2.5rem] p-7 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-between hover:scale-[1.03] transition-transform group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-400 opacity-50 z-0"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <FileText size={22} className="text-white" />
            </div>
            <ArrowUpRight size={20} className="text-white/50 group-hover:text-white transition-colors" />
          </div>
          <div className="relative z-10">
            <p className="text-5xl font-black mb-1">{stats.docs}</p>
            <p className="text-blue-200 font-bold text-sm uppercase tracking-wider">Tài liệu</p>
          </div>
        </Link>

        {/* 5. KHỐI KỶ NIỆM (4x1) */}
        <Link href="/gallery" className="col-span-1 md:col-span-3 lg:col-span-4 row-span-1 bg-white rounded-[2.5rem] p-7 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-lg hover:border-pink-200 transition-all group overflow-hidden relative">
          
          {/* Hiệu ứng ảnh nền mờ ảo bên phải */}
          {recentPhoto && (
            <div className="absolute right-0 top-0 w-2/3 md:w-1/2 h-full z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-10"></div>
              <img src={recentPhoto} className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:-rotate-2 transition-transform duration-700 ease-out" />
            </div>
          )}

          <div className="relative z-20 flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 text-pink-500 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner">
              <ImageIcon size={32} />
            </div>
            <div>
              <h3 className="font-extrabold text-2xl text-slate-800 mb-1.5">Kho Kỷ Niệm</h3>
              <p className="text-slate-500 font-bold text-sm bg-white/50 backdrop-blur-md inline-block px-3 py-1 rounded-lg">Bạn đang có {stats.photos} bức ảnh</p>
            </div>
          </div>

          <div className="relative z-20 hidden md:flex items-center gap-2 text-pink-500 font-bold bg-pink-50 px-5 py-3 rounded-2xl group-hover:bg-pink-500 group-hover:text-white transition-colors">
            Xem tất cả <ArrowRight size={18} />
          </div>
        </Link>

      </div>
    </div>
  );
}
