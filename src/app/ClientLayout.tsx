"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
  Moon,
  Download
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { logout } from "./login/actions";
import { getProfileData } from "@/app/actions/data";
import CommandPalette from "@/components/CommandPalette";
import FocusStudyHub from "@/components/FocusStudyHub";
import AIChatDrawer from "@/components/AIChatDrawer";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { MusicProvider } from "@/context/MusicContext";
import GlobalMusicPlayer from "@/components/GlobalMusicPlayer";
import { createClient } from "@/utils/supabase/client";

function getStoredProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('myspace_profile_cache_v2')
      || localStorage.getItem('myspace_profile_cache_v1')
      || sessionStorage.getItem('myspace_profile_cache_v1');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{name: string, avatar?: string | null, email?: string} | null>(getStoredProfile);
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
  const hasLoadedProfileRef = useRef(false);

  // Tự động phát hiện và chuyển hướng liên kết Đặt lại mật khẩu (nếu bị Supabase fallback về trang chủ)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (
        hash.includes("type=recovery") || 
        search.includes("type=recovery") ||
        search.includes("next=%2Freset-password") || 
        search.includes("next=/reset-password")
      ) {
        window.location.replace(`/reset-password${search}${hash}`);
        return;
      }
    }

    try {
      const supabase = createClient();
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          window.location.replace("/reset-password");
        }
      });
      return () => {
        authListener?.subscription.unsubscribe();
      };
    } catch {}
  }, []);

  useEffect(() => {
    // 1. Khôi phục Profile ngay lập tức từ cache (0ms)
    const stored = getStoredProfile();
    if (stored) setProfile(stored);

    // 2. Chỉ đồng bộ hồ sơ 1 lần duy nhất khi ứng dụng mở, không gọi lại ở mỗi lần đổi tab
    if (isAuthRoute || hasLoadedProfileRef.current) return;
    hasLoadedProfileRef.current = true;

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
    loadProfile();

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
        <PWAInstallPrompt />
      
      {/* Sidebar Chuẩn Studio / SaaS Cao Cấp */}
      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-50 w-72 md:w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-out shadow-2xl md:shadow-none`}>
        
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
                    prefetch={true}
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
        
        {/* Footer Sidebar: Nút đổi Dark Mode, Cài đặt App & Trạng thái */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
          {/* Nút Cài đặt App / PWA */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              window.dispatchEvent(new CustomEvent('open-pwa-install'));
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-blue-200/70 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/60 text-xs font-bold text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Download size={14} />
              <span>Cài đặt ứng dụng (App)</span>
            </span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 text-blue-700 dark:text-blue-300">PWA</span>
          </button>

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
        <header className="h-14 sm:h-16 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md px-3.5 sm:px-6 md:px-10 flex items-center justify-between sticky top-0 z-30 transition-colors">
          
          {/* Mobile Left: Menu Toggle + Brand Logo */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Mở Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                M
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">My Space</span>
            </Link>
          </div>

          {/* Desktop Left: Nút tìm kiếm nhanh Command Palette & Focus Hub */}
          <div className="hidden md:flex items-center gap-2.5">
            <button 
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer shadow-2xs"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-command-palette'));
              }}
            >
              <Search size={14} className="text-slate-400" />
              <span>Tìm kiếm nhanh hoặc lệnh...</span>
              <kbd className="inline-flex items-center gap-0.5 font-mono text-[10px] bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 shadow-2xs">
                <Command size={10} /> K
              </kbd>
            </button>

            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-focus-hub'))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-lg hover:border-slate-300 transition-all cursor-pointer shadow-2xs group"
              title="Mở phòng học tập trung (Pomodoro & Âm thanh thư giãn)"
            >
              <Sparkles size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Phòng tập trung</span>
            </button>
          </div>

          {/* Right: Actions, Theme & User Profile Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Quick Actions trên Mobile (Search & Focus Hub) */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Tìm kiếm nhanh"
              title="Tìm kiếm nhanh"
            >
              <Search size={18} />
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-focus-hub'))}
              className="md:hidden p-2 rounded-xl text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Phòng tập trung"
              title="Phòng học tập trung"
            >
              <Sparkles size={18} />
            </button>

            {/* Nút Toggle Theme */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
              aria-label="Đổi giao diện sáng/tối"
              title={isDark ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* User Profile Avatar & Dropdown */}
            <div className="relative flex items-center">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 pr-1 sm:pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                aria-label="Tài khoản cá nhân"
              >
                <img src={avatarUrl} alt="Avatar" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover bg-slate-100 ring-1 ring-slate-200 dark:ring-slate-700" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">{displayName}</span>
                <ChevronRight size={14} className={`text-slate-400 hidden sm:block transition-transform ${isProfileOpen ? 'rotate-90' : ''}`} />
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
                      onClick={() => {
                        setIsProfileOpen(false);
                        window.dispatchEvent(new CustomEvent('open-pwa-install'));
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-left"
                    >
                      <Download size={15} />
                      Cài đặt ứng dụng vào máy
                    </button>
                    
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
          </div>
        </header>

        {/* Nội dung trang */}
        <div className="flex-1 px-3.5 sm:px-6 md:px-10 py-4 sm:py-6 md:py-8 max-w-7xl w-full mx-auto pb-36 md:pb-24">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Thanh điều hướng dưới đáy màn hình chuẩn Native App) */}
      <nav 
        aria-label="Điều hướng chính di động"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-around px-1 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 6px)' }}
      >
        <Link 
          href="/" 
          prefetch={true}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            pathname === '/' 
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <LayoutDashboard size={20} className={pathname === '/' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] tracking-tight mt-0.5">Tổng quan</span>
        </Link>

        <Link 
          href="/schedule" 
          prefetch={true}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            pathname === '/schedule' 
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Calendar size={20} className={pathname === '/schedule' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] tracking-tight mt-0.5">Lịch trình</span>
        </Link>

        <Link 
          href="/docs" 
          prefetch={true}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            pathname === '/docs' 
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <FileText size={20} className={pathname === '/docs' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] tracking-tight mt-0.5">Tài liệu</span>
        </Link>

        <Link 
          href="/music" 
          prefetch={true}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            pathname === '/music' 
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Headphones size={20} className={pathname === '/music' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] tracking-tight mt-0.5">Giai điệu</span>
        </Link>

        <Link 
          href="/gallery" 
          prefetch={true}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            pathname === '/gallery' 
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105' 
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <ImageIcon size={20} className={pathname === '/gallery' ? 'stroke-[2.5]' : ''} />
          <span className="text-[10px] tracking-tight mt-0.5">Kỷ niệm</span>
        </Link>
      </nav>

      {/* Global Music Player (Thanh phát nhạc toàn cục) */}
      <GlobalMusicPlayer />

      {/* Trợ lý AI Toàn Năng (Floating Action Button & Chat Drawer) */}
      <AIChatDrawer />
    </div>
  </MusicProvider>
  );
}
