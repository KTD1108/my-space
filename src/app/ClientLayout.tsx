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
  ChevronRight
} from "lucide-react";
import { Toaster } from "react-hot-toast";
import { logout } from "./login/actions";
import { getProfileData } from "@/app/actions/data";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<{name: string, avatar?: string | null, email?: string} | null>(null);

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

  if (pathname === "/login") {
    return (
      <div className="flex h-screen w-full bg-slate-50">
        <Toaster position="top-center" toastOptions={{ className: 'rounded-xl shadow-lg font-medium text-sm' }} />
        {children}
      </div>
    );
  }

  const displayName = profile?.name || "Người dùng";
  const avatarUrl = profile?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}&backgroundColor=e2e8f0,cbd5e1`;

  return (
    <div className="flex h-screen w-full text-slate-800 bg-slate-50/70 antialiased">
      <Toaster position="top-center" toastOptions={{ className: 'rounded-xl shadow-lg font-medium text-sm border border-slate-200/80' }} />
      
      {/* Nút mở menu trên Mobile */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 text-slate-700 active:scale-95 transition-all"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Mở Menu"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Chuẩn Studio / SaaS Cao Cấp */}
      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 w-64 h-full bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-200 ease-out`}>
        
        {/* Brand Header */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-sm group-hover:bg-blue-600 transition-colors">
              M
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">My Space</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Workspace</span>
            </div>
          </Link>
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
            PRO
          </span>
        </div>
        
        {/* Navigation Groups */}
        <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? "bg-slate-900 text-white shadow-xs" 
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? "text-white" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Footer Sidebar: Trạng thái & Dung lượng */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="px-3 py-2 rounded-lg border border-slate-200/60 bg-white">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-500">Hệ sinh thái</span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Trực tuyến
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full w-[24%]"></div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Overlay Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full w-full relative flex flex-col bg-slate-50/60">
        
        {/* Top Navbar */}
        <header className="h-16 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 md:px-10 flex items-center justify-between sticky top-0 z-30">
          
          {/* Nút tìm kiếm nhanh Command Palette (Chuẩn bị cho Ctrl+K) */}
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg hover:border-slate-300 hover:text-slate-600 transition-all cursor-pointer shadow-2xs"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
                window.dispatchEvent(event);
              }}
            >
              <Search size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Tìm kiếm nhanh hoặc lệnh...</span>
              <span className="sm:hidden">Tìm kiếm...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                <Command size={10} /> K
              </kbd>
            </button>
          </div>

          {/* User Profile Menu */}
          <div className="relative flex items-center gap-3">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            >
              <img src={avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover bg-slate-100 ring-1 ring-slate-200" />
              <span className="text-xs font-semibold text-slate-700 hidden sm:block max-w-[120px] truncate">{displayName}</span>
              <ChevronRight size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)}></div>
                <div className="absolute right-0 top-11 w-60 bg-white rounded-xl shadow-lg border border-slate-200/90 p-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Đang đăng nhập</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{profile?.email || 'Tài khoản'}</p>
                  </div>
                  
                  <Link 
                    href="/profile" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                  >
                    <Settings size={15} className="text-slate-400" />
                    Cài đặt tài khoản
                  </Link>
                  
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium transition-colors cursor-pointer"
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
        <div className="flex-1 px-6 py-6 md:px-10 md:py-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
