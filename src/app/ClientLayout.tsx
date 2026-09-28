"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, FileText, Music, Image as ImageIcon, Menu, X, LogOut, Settings, Calendar } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { logout } from "./login/actions";
import { getProfileData } from "@/app/actions/data";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{name: string, avatar: string | null, email?: string} | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfileData();
        if (data) setProfile(data);
      } catch (e) {
        // Ignored
      }
    }
    if (pathname !== '/login') loadProfile();
  }, [pathname]);

  const navItems = [
    { name: "Nhà của tôi", href: "/", icon: <Home size={22} /> },
    { name: "Lịch học", href: "/schedule", icon: <Calendar size={22} /> },
    { name: "Kỷ niệm", href: "/gallery", icon: <ImageIcon size={22} /> },
    { name: "Giai điệu", href: "/music", icon: <Music size={22} /> },
    { name: "Học tập", href: "/docs", icon: <FileText size={22} /> },
  ];

  if (pathname === "/login") {
    return (
      <div className="flex h-screen w-full">
        <Toaster position="top-center" toastOptions={{ className: 'rounded-2xl shadow-xl font-bold' }} />
        {children}
      </div>
    );
  }

  const displayName = profile?.name || "Bạn";
  const avatarUrl = profile?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}&backgroundColor=ffd5dc,b6e3f4`;

  return (
    <div className="flex h-screen w-full text-slate-700 bg-[#F9FAFB]">
      <Toaster position="top-center" toastOptions={{ className: 'rounded-2xl shadow-xl font-bold border border-slate-100' }} />
      
      {/* Nút mở menu trên Mobile */}
      <button 
        className="md:hidden fixed top-5 right-5 z-50 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-slate-700 border border-slate-100"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Sáng, Kính mờ, Bo góc thanh thoát */}
      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 w-72 h-full bg-white/70 backdrop-blur-2xl border-r border-slate-200/60 flex flex-col transition-transform duration-300 ease-in-out`}>
        
        {/* Header thân thiện */}
        <div className="p-8 pb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-300 to-purple-400 rounded-2xl rotate-3 shadow-md"></div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Trạm Dừng Chân</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">My Space ✨</p>
          </div>
        </div>
        
        <nav className="flex-1 px-5 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${isActive ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.02]" : "hover:bg-slate-100/80 text-slate-500 hover:text-slate-800"}`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-5 mt-auto text-xs text-slate-400 text-center font-bold mb-2 uppercase tracking-widest">
          &copy; {new Date().getFullYear()} Coded with ❤️
        </div>
      </aside>
      
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Khu vực nội dung chính */}
      <main className="flex-1 overflow-y-auto h-full w-full relative flex flex-col">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-pink-400/10 rounded-full blur-3xl pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none z-0"></div>
        
        {/* HEADER GÓC TRÊN PHẢI (ẢNH ĐẠI DIỆN) */}
        <div className="w-full flex justify-end items-center px-6 pt-5 md:px-12 md:pt-8 relative z-40">
          {/* Căn lề mr-14 trên Mobile để không đè vào nút Menu Hamburger */}
          <div className="relative mr-14 md:mr-0">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-all active:scale-95"
            >
              <img src={avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-100" />
              <span className="text-sm font-bold text-slate-700 hidden sm:block truncate max-w-[120px]">{displayName}</span>
            </button>

            {/* Menu Dropdown Cài đặt / Đăng xuất */}
            {isProfileOpen && (
              <>
                {/* Lớp nền trong suốt để bấm ra ngoài thì đóng menu */}
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-xl border border-slate-100 p-2 py-3 z-50 animate-in fade-in slide-in-from-top-4">
                  <div className="px-5 py-3 border-b border-slate-50 mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tài khoản</p>
                    <p className="text-sm font-extrabold text-slate-700 truncate">{profile?.email || 'Đang tải...'}</p>
                  </div>
                  
                  <Link 
                    href="/profile" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 rounded-2xl text-slate-600 font-bold transition-colors"
                  >
                    <Settings size={18} className="text-slate-400" />
                    Cài đặt cá nhân
                  </Link>
                  
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-5 py-3.5 mt-1 hover:bg-red-50 text-red-500 font-bold rounded-2xl transition-colors"
                  >
                    <LogOut size={18} />
                    Đăng xuất an toàn
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* NỘI DUNG TỪNG TRANG */}
        <div className="relative z-10 px-6 pb-6 md:px-12 md:pb-12 mt-2 md:mt-4 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
