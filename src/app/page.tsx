"use client";
import { useState, useEffect } from "react";
import { BookHeart, Headphones, Camera, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/app/actions/data";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const [stats, setStats] = useState({ docs: 0, songs: 0, photos: 0 });
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Chào bạn");
  const [userName, setUserName] = useState("người lạ");

  useEffect(() => {
    // 1. Tạo lời chào dựa theo thời gian thực
    const hour = new Date().getHours();
    if (hour < 11) setGreeting("Chào buổi sáng");
    else if (hour < 15) setGreeting("Chào buổi trưa");
    else if (hour < 18) setGreeting("Chào buổi chiều");
    else setGreeting("Buổi tối an lành");

    // 2. Lấy thông tin user chuẩn
    async function fetchUser() {
      const { getProfileData } = await import('@/app/actions/data');
      const data = await getProfileData();
      if (data) {
        setUserName(data.name);
      }
    }

    // 3. Lấy dữ liệu
    async function fetchStats() {
      try {
        const statsData = await getDashboardStats();
        setStats(statsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm mb-6 text-sm font-bold text-slate-500">
          <Sparkles size={16} className="text-yellow-400" /> Ngày mới vui vẻ!
        </div>
        <h1 className="text-5xl font-extrabold text-slate-800 mb-4 tracking-tight capitalize">
          {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">{userName}</span> 👋
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          Hôm nay của bạn thế nào? Dưới đây là những kỷ niệm bạn đang lưu giữ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Thẻ Hình Ảnh (Friendly) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-100/50 flex flex-col group hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-pink-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-pink-500/30">
            <Camera size={28} />
          </div>
          <h3 className="text-slate-400 font-bold mb-1 text-sm uppercase tracking-wider">Khoảnh khắc</h3>
          <div className="text-4xl font-extrabold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.photos}
            <span className="text-base font-bold text-slate-400 ml-2">bức ảnh</span>
          </div>
        </div>

        {/* Thẻ Nghe Nhạc (Friendly) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-100/50 flex flex-col group hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-purple-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
            <Headphones size={28} />
          </div>
          <h3 className="text-slate-400 font-bold mb-1 text-sm uppercase tracking-wider">Giai điệu</h3>
          <div className="text-4xl font-extrabold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.songs}
            <span className="text-base font-bold text-slate-400 ml-2">bài hát</span>
          </div>
        </div>
        
        {/* Thẻ Tài Liệu (Friendly) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all border border-slate-100/50 flex flex-col group hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
          <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
            <BookHeart size={28} />
          </div>
          <h3 className="text-slate-400 font-bold mb-1 text-sm uppercase tracking-wider">Hành trang</h3>
          <div className="text-4xl font-extrabold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.docs}
            <span className="text-base font-bold text-slate-400 ml-2">tài liệu</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between text-white">
        <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-b from-white/10 to-transparent rounded-full pointer-events-none blur-3xl"></div>
        <div className="z-10 mb-6 md:mb-0">
          <h2 className="text-2xl font-extrabold mb-2">Thêm những điều mới mẻ?</h2>
          <p className="text-slate-300 font-medium max-w-md">Cuộc sống luôn có những khoảnh khắc đáng nhớ. Đừng ngần ngại lưu lại chúng nhé!</p>
        </div>
        <div className="flex gap-4 z-10 w-full md:w-auto">
          <Link href="/gallery" className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg">
            Đăng ảnh ngay <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
