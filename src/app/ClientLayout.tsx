"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Headphones, 
  Image as ImageIcon, 
  Calendar, 
  Menu, 
  X, 
  LogOut, 
  Settings, 
  Search,
  Sparkles,
  Command,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { logout } from "./login/actions";
import { getProfileData } from "@/app/actions/data";
import CommandPalette from "@/components/CommandPalette";
import FocusStudyHub from "@/components/FocusStudyHub";
import AIChatDrawer from "@/components/AIChatDrawer";
import { MusicProvider } from "@/context/MusicContext";
import GlobalMusicPlayer from "@/components/GlobalMusicPlayer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{name: string, avatar?: string | null, email?: string} | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('myspace_profile_cache_v2');
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return null;
  });
  const [isDark, setIsDark] = useState(false);

  // Khởi tạo theme (Dark/Light) từ localStorage hoặc system preference
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const isAuthRoute = pathname === "/login" || pathname === "/reset-password" || pathname.startsWith("/login/");

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const data = await getProfileData();
        if (data && isMounted) {
          setProfile(data);
          try {
            localStorage.setItem('myspace_profile_cache_v2', JSON.stringify(data));
          } catch {}
        }
      } catch (e) {
        console.warn("Không thể tải thông tin hồ sơ người dùng:", e);
      }
    }
    if (!isAuthRoute) {
      loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthRoute]);

  const navGroups = [
    {
      group: "Không gian làm việc",
      items: [
        { name: "Tổng quan", href: "/", icon: <LayoutDashboard size={18} />, shortcut: "G H" },
        { name: "Lịch trình", href: "/schedule", icon: <Calendar size={18} />, shortcut: "G S" },
      ]
    },
    {
      group: "Kho tri thức & Media",
      items: [
        { name: "Tài liệu & Học tập", href: "/docs", icon: <FileText size={18} />, shortcut: "G D" },
        { name: "Giai điệu tập trung", href: "/music", icon: <Headphones size={18} />, shortcut: "G M" },
        { name: "Thư viện Kỷ niệm", href: "/gallery", icon: <ImageIcon size={18} />, shortcut: "G G" },
      ]
    }
  ];

  if (isAuthRoute) {
    return (
      <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors">
        <Toaster 
          position="top-center" 
          toastOptions={{ 
            className: 'rounded-xl shadow-lg font-medium text-sm border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100' 
          }} 
        />
        {children}
      </div>
    );
  }

  const displayName = profile?.name || "Người dùng";
  const avatarUrl = profile?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}&backgroundColor=e2e8f0,cbd5e1`;

  return (
    <MusicProvider>
      <div className="flex h-screen w-full text-slate-800 dark:text-slate-100 bg-slate-50/70 dark:bg-slate-950 antialiased transition-colors">
        <Toaster position="top-center" toastOptions={{ className: 'rounded-xl shadow-lg font-medium text-sm border border-slate-200/80 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100' }} />
        <CommandPalette />
        <FocusStudyHub />
      
      {/* Nút mở menu & theme trên Mobile */}
      <div className="md:hidden fixed top-3.5 right-4 z-50 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
          aria-label="Đổi giao diện sáng/tối"
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
        </button>

        <button 
          className="bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Mở Menu"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Chuẩn Studio / SaaS Cao Cấp */}
      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-out`}>
        
        {/* Brand Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-sm group-hover:scale-105 transition-all">
              M
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 block leading-tight">My Space</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Workspace</span>
            </div>
          </Link>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            PRO
          </span>
        </div>
        
        {/* Navigation Groups */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive 
                        ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs" 
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-white" : "text-slate-400 dark:text-slate-500"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-white"></span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Footer Sidebar: Nút đổi Dark Mode & Trạng thái */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Nút Toggle Theme Desktop */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-500" />}
              <span>{isDark ? "Giao diện: Tối" : "Giao diện: Sáng"}</span>
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Đổi</span>
          </button>

          <div className="px-3 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-500 dark:text-slate-400">Hệ sinh thái</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Trực tuyến
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full w-[24%]"></div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Overlay Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full w-full relative flex flex-col bg-slate-50/60 dark:bg-slate-950 transition-colors">
        
        {/* Top Navbar */}
        <header className="h-16 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 md:px-10 flex items-center justify-between sticky top-0 z-30 transition-colors">
          
          {/* Nút tìm kiếm nhanh Command Palette */}
          <div className="flex items-center gap-2.5">
            <button 
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer shadow-2xs"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-command-palette'));
              }}
            >
              <Search size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Tìm kiếm nhanh hoặc lệnh...</span>
              <span className="sm:hidden">Tìm kiếm...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-2xs">
                <Command size={10} /> K
              </kbd>
            </button>

            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-focus-hub'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
              title="Mở phòng học tập trung (Pomodoro & Âm thanh thư giãn)"
            >
              <Sparkles size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Phòng tập trung</span>
            </button>
          </div>

          {/* User Profile Menu */}
          <div className="relative flex items-center gap-3">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
            >
              <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover bg-slate-100 ring-1 ring-slate-200 dark:ring-slate-700" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">{displayName}</span>
              <ChevronRight size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 top-11 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Đang đăng nhập</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{profile?.email || 'Tài khoản'}</p>
                  </div>
                  
                  <Link 
                    href="/profile" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />
                    Cài đặt tài khoản
                  </Link>
                  
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <LogOut size={15} />
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Nội dung trang */}
        <div className="flex-1 px-6 py-6 md:px-10 md:py-8 max-w-7xl w-full mx-auto pb-32">
          {children}
        </div>
      </main>

      {/* Global Music Player (Thanh phát nhạc toàn cục) */}
      <GlobalMusicPlayer />

      {/* Trợ lý AI Toàn Năng (Floating Action Button & Chat Drawer) */}
      <AIChatDrawer />
    </div>
  </MusicProvider>
  );
}
