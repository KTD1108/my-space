"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Home, FileText, Music, Image as ImageIcon, Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { logout } from "./login/actions";
import { getProfileData } from "@/app/actions/data";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{name: string, avatar: string | null} | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getProfileData();
        if (data) {
          setProfile(data);
        }
      } catch (e) {
        // Ignored
      }
    }
    if (pathname !== '/login') loadProfile();
  }, [pathname]);

  const navItems = [
    { name: "Nhà của tôi", href: "/", icon: <Home size={22} /> },
    { name: "Kỷ niệm", href: "/gallery", icon: <ImageIcon size={22} /> },
    { name: "Giai điệu", href: "/music", icon: <Music size={22} /> },
    { name: "Học tập", href: "/docs", icon: <FileText size={22} /> },
    { name: "Trang cá nhân", href: "/profile", icon: <UserIcon size={22} /> },
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
      
      <button 
        className="md:hidden fixed top-4 right-4 z-50 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg text-slate-700 border border-slate-100"
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
        
        {/* Khu vực Profile dễ thương ở đáy */}
        <div className="p-5 mt-auto">
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-4 flex flex-col gap-4 shadow-sm">
            <Link href="/profile" className="flex items-center gap-3 group hover:bg-white p-2 -m-2 rounded-2xl transition-all cursor-pointer">
              <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full object-cover shadow-sm bg-white border-2 border-white group-hover:scale-105 transition-transform" />
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-bold">Chủ nhân</p>
                <p className="text-sm font-extrabold text-slate-700 truncate">{displayName}</p>
              </div>
            </Link>
            <button 
              onClick={() => logout()}
              className="flex justify-center items-center gap-2 px-4 py-2.5 w-full rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all font-bold text-sm border border-transparent hover:border-red-100 mt-1"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>
      
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 h-full w-full relative">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-pink-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
