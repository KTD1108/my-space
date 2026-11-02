"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Command, 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  Headphones, 
  Image as ImageIcon, 
  Settings, 
  LogOut, 
  ArrowRight, 
  Clock, 
  Folder,
  X,
  Sparkles,
  ExternalLink
} from "lucide-react";
import { getCommandSearchData } from "@/app/actions/data";
import { logout } from "@/app/login/actions";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbData, setDbData] = useState<{ docs: any[]; songs: any[]; schedules: any[] }>({
    docs: [],
    songs: [],
    schedules: []
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Đăng ký phím tắt toàn cục Ctrl+K / Cmd+K và custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Tự động focus ô tìm kiếm và tải dữ liệu khi mở
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Tải dữ liệu tìm kiếm
      setLoading(true);
      getCommandSearchData()
        .then((data) => setDbData(data))
        .catch((err) => console.error("Command palette error:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Xây dựng danh sách tác vụ và kết quả tìm kiếm
  const commandList: CommandItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list: CommandItem[] = [];

    // 1. ĐIỀU HƯỚNG TRANG CHÍNH & TÁC VỤ
    const navItems: CommandItem[] = [
      {
        id: "action-focus-hub",
        title: "Vào phòng học tập trung (Focus Studio)",
        subtitle: "Đồng hồ Pomodoro kết hợp Bộ trộn âm thanh Mưa / Sóng biển / Lửa trại",
        category: "Công cụ đột phá",
        badge: "MỚI ✨",
        icon: <Sparkles size={16} className="text-amber-500" />,
        onSelect: () => { 
          window.dispatchEvent(new CustomEvent('open-focus-hub'));
          setIsOpen(false); 
        }
      },
      {
        id: "nav-home",
        title: "Trang chủ / Tổng quan",
        subtitle: "Xem bảng điều khiển và tiến độ",
        category: "Điều hướng",
        icon: <LayoutDashboard size={16} className="text-blue-500" />,
        onSelect: () => { router.push("/"); setIsOpen(false); }
      },
      {
        id: "nav-schedule",
        title: "Lịch trình học tập",
        subtitle: "Xem và quản lý thời khóa biểu",
        category: "Điều hướng",
        icon: <Calendar size={16} className="text-indigo-500" />,
        onSelect: () => { router.push("/schedule"); setIsOpen(false); }
      },
      {
        id: "nav-docs",
        title: "Tài liệu & Bài giảng",
        subtitle: "Quản lý file PDF, Word và tóm tắt AI",
        category: "Điều hướng",
        icon: <FileText size={16} className="text-emerald-500" />,
        onSelect: () => { router.push("/docs"); setIsOpen(false); }
      },
      {
        id: "nav-music",
        title: "Giai điệu tập trung",
        subtitle: "Nghe nhạc và âm thanh học tập",
        category: "Điều hướng",
        icon: <Headphones size={16} className="text-violet-500" />,
        onSelect: () => { router.push("/music"); setIsOpen(false); }
      },
      {
        id: "nav-gallery",
        title: "Thư viện Kỷ niệm",
        subtitle: "Kho lưu giữ album ảnh cá nhân",
        category: "Điều hướng",
        icon: <ImageIcon size={16} className="text-pink-500" />,
        onSelect: () => { router.push("/gallery"); setIsOpen(false); }
      },
      {
        id: "nav-profile",
        title: "Cài đặt tài khoản",
        subtitle: "Đổi tên hiển thị, ảnh đại diện",
        category: "Hệ thống",
        icon: <Settings size={16} className="text-slate-500" />,
        onSelect: () => { router.push("/profile"); setIsOpen(false); }
      },
      {
        id: "action-logout",
        title: "Đăng xuất an toàn",
        subtitle: "Thoát khỏi phiên làm việc hiện tại",
        category: "Hệ thống",
        icon: <LogOut size={16} className="text-red-500" />,
        onSelect: () => { logout(); setIsOpen(false); }
      }
    ];

    // Lọc các mục điều hướng theo query
    navItems.forEach(item => {
      if (!q || item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
        list.push(item);
      }
    });

    // 2. TÌM KIẾM TÀI LIỆU (DOCS)
    if (dbData.docs.length > 0) {
      dbData.docs.forEach(doc => {
        if (!q || doc.title.toLowerCase().includes(q) || doc.category?.toLowerCase().includes(q)) {
          list.push({
            id: `doc-${doc.id}`,
            title: doc.title,
            subtitle: `Chủ đề: ${doc.category || 'Chung'} • Định dạng: ${doc.type?.toUpperCase() || 'FILE'}`,
            category: "Tài liệu & Học tập",
            badge: doc.category || 'Chung',
            icon: <Folder size={16} className="text-blue-500" />,
            onSelect: () => {
              router.push("/docs");
              setIsOpen(false);
            }
          });
        }
      });
    }

    // 3. TÌM KIẾM BÀI HÁT (SONGS)
    if (dbData.songs.length > 0) {
      dbData.songs.forEach(song => {
        if (!q || song.title.toLowerCase().includes(q)) {
          list.push({
            id: `song-${song.id}`,
            title: song.title,
            subtitle: "Bài hát trong bộ sưu tập",
            category: "Giai điệu âm nhạc",
            badge: "Nhạc",
            icon: <Headphones size={16} className="text-emerald-500" />,
            onSelect: () => {
              router.push("/music");
              setIsOpen(false);
            }
          });
        }
      });
    }

    // 4. TÌM KIẾM LỊCH TRÌNH (SCHEDULES)
    if (dbData.schedules.length > 0) {
      dbData.schedules.forEach(sch => {
        if (!q || sch.title.toLowerCase().includes(q)) {
          list.push({
            id: `sch-${sch.id}`,
            title: sch.title,
            subtitle: `Ngày: ${sch.date} lúc ${sch.start_time?.substring(0, 5)} • ${sch.is_completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}`,
            category: "Lịch trình học tập",
            badge: sch.is_completed ? 'Xong' : 'Sắp tới',
            icon: <Clock size={16} className="text-amber-500" />,
            onSelect: () => {
              router.push("/schedule");
              setIsOpen(false);
            }
          });
        }
      });
    }

    return list;
  }, [query, dbData, router]);

  // Điều hướng bằng phím mũi tên và Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (commandList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % commandList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + commandList.length) % commandList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (commandList[selectedIndex]) {
        commandList[selectedIndex].onSelect();
      }
    }
  };

  if (!isOpen) return null;

  // Gom nhóm các mục theo Category
  const groupedItems = commandList.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ item, globalIndex: idx });
    return acc;
  }, {} as Record<string, { item: CommandItem; globalIndex: number }[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 animate-in fade-in duration-150">
      {/* Backdrop mờ */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Floating Modal Window - Phong cách Raycast/Linear */}
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-slate-50/50">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm tài liệu, bài hát, lịch trình hoặc gõ lệnh..."
            className="w-full bg-transparent border-none outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400"
          />
          {query ? (
            <button 
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="font-mono text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 divide-y divide-slate-100/60">
          {loading && commandList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium animate-pulse">
              Đang tải dữ liệu nhanh...
            </div>
          ) : commandList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Không tìm thấy kết quả nào cho &quot;<span className="text-slate-600 font-bold">{query}</span>&quot;
            </div>
          ) : (
            Object.entries(groupedItems).map(([catName, items]) => (
              <div key={catName} className="pt-2 first:pt-0">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {catName}
                </p>
                <div className="space-y-0.5 mt-0.5">
                  {items.map(({ item, globalIndex }) => {
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-slate-900 text-white shadow-xs" 
                            : "hover:bg-slate-100/70 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                              isSelected 
                                ? "bg-white/20 text-slate-200" 
                                : "bg-slate-100 text-slate-600 border border-slate-200/60"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          <ArrowRight size={13} className={`opacity-0 ${isSelected ? "opacity-100 text-slate-300" : ""}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs text-[10px] text-slate-600">↑</kbd>
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs text-[10px] text-slate-600">↓</kbd>
              <span>Điều hướng</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs text-[10px] text-slate-600">↵</kbd>
              <span>Mở</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs text-[10px] text-slate-600">ESC</kbd>
              <span>Đóng</span>
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400 font-mono text-[10px]">
            Universal Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
