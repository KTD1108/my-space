"use client";
import { useState, useEffect } from "react";
import { FileText, Music, Image as ImageIcon, HardDrive, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/app/actions/data";

export default function Home() {
  const [stats, setStats] = useState({ docs: 0, songs: 0, photos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight">Tổng quan hệ thống</h1>
        <p className="text-lg text-slate-500 max-w-2xl">
          Chào mừng trở lại! Hệ thống hiện đang chạy ở chế độ <strong>Bảo mật tuyệt đối (Cấp độ Server)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Thẻ Tài Liệu */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Tài liệu học tập</h3>
          <div className="text-3xl font-bold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.docs}
            <span className="text-sm font-normal text-slate-400 ml-2">tệp</span>
          </div>
        </div>

        {/* Thẻ Nghe Nhạc */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Music size={24} />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Bài hát yêu thích</h3>
          <div className="text-3xl font-bold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.songs}
            <span className="text-sm font-normal text-slate-400 ml-2">bài</span>
          </div>
        </div>

        {/* Thẻ Hình Ảnh */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-4">
            <ImageIcon size={24} />
          </div>
          <h3 className="text-slate-500 font-medium mb-1">Ảnh kỷ niệm</h3>
          <div className="text-3xl font-bold text-slate-800 flex items-baseline">
            {loading ? <span className="text-slate-300">...</span> : stats.photos}
            <span className="text-sm font-normal text-slate-400 ml-2">ảnh</span>
          </div>
        </div>
        
        {/* Thẻ Tổng dung lượng */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-sm flex flex-col text-white hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-slate-700/50 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <HardDrive size={24} />
          </div>
          <h3 className="text-slate-400 font-medium mb-1">Trạng thái dữ liệu</h3>
          <div className="text-2xl font-bold text-white flex items-baseline mt-1">
            <span className="text-emerald-400 mr-2 flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></span> An toàn
            </span>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Truy cập nhanh</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/docs" className="group bg-blue-50/50 p-6 rounded-2xl border border-blue-100 hover:bg-blue-50 transition-colors flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-blue-900">Quản lý Tài liệu</h4>
            <p className="text-sm text-blue-700/70 mt-1">Bảo mật cấp độ Server</p>
          </div>
          <ArrowRight className="text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link href="/music" className="group bg-purple-50/50 p-6 rounded-2xl border border-purple-100 hover:bg-purple-50 transition-colors flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-purple-900">Mở Trình phát nhạc</h4>
            <p className="text-sm text-purple-700/70 mt-1">Phát qua Signed URL an toàn</p>
          </div>
          <ArrowRight className="text-purple-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link href="/gallery" className="group bg-pink-50/50 p-6 rounded-2xl border border-pink-100 hover:bg-pink-50 transition-colors flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-pink-900">Xem Thư viện ảnh</h4>
            <p className="text-sm text-pink-700/70 mt-1">Chặn 100% truy cập ngoài</p>
          </div>
          <ArrowRight className="text-pink-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
