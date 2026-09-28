"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, FileText, Music, Image as ImageIcon, Menu, X } from "lucide-react";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: "Tổng quan", href: "/", icon: <Home size={20} /> },
    { name: "Tài liệu", href: "/docs", icon: <FileText size={20} /> },
    { name: "Nghe nhạc", href: "/music", icon: <Music size={20} /> },
    { name: "Thư viện ảnh", href: "/gallery", icon: <ImageIcon size={20} /> },
  ];

  // Nếu đang ở trang Đăng nhập, ẩn Sidebar đi
  if (pathname === "/login") {
    return (
      <div className="flex h-screen w-full font-sans">
        <Toaster position="top-right" toastOptions={{ className: 'font-sans rounded-xl shadow-lg' }} />
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full text-slate-800">
      <Toaster position="top-right" toastOptions={{ className: 'font-sans rounded-xl shadow-lg' }} />
      
      {/* Nút mở menu trên Mobile */}
      <button 
        className="md:hidden fixed top-4 right-4 z-50 bg-white p-2 rounded-xl shadow-md text-slate-700 border border-slate-100"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Thanh Sidebar (Tự ẩn hiện trên Mobile) */}
      <aside className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 w-72 h-full bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out`}>
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            MY SPACE
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium tracking-wide uppercase">Không gian riêng tư</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                onClick={() => setIsMobileMenuOpen(false)} 
                className={`flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-medium ${isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1" : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-100"}`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 text-xs text-slate-500 text-center font-medium">
          &copy; {new Date().getFullYear()} Coded with ❤️
        </div>
      </aside>
      
      {/* Lớp nền đen mờ khi mở menu trên Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Khu vực nội dung chính */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50 h-full w-full">
        {children}
      </main>
    </div>
  );
}
