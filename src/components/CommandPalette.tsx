"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
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
  Bot,
  LayoutDashboard,
  Layers,
  GraduationCap
} from "lucide-react";
import { getCommandSearchData } from "@/app/actions/data";
import { logout } from "@/app/login/actions";
import { useMusic } from "@/context/MusicContext";

interface DocResult {
  id: string;
  title: string;
  category?: string;
  type?: string;
  url?: string;
}

interface SongResult {
  id: string;
  title: string;
  url?: string;
}

interface ScheduleResult {
  id: string;
  title: string;
  date: string;
  start_time: string;
  is_completed: boolean;
}

interface PhotoResult {
  id: string;
  title: string;
  album?: string;
  url?: string;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Điều hướng & Tác vụ" | "Tài liệu & Ghi chú" | "Giai điệu âm nhạc" | "Thư viện Kỷ niệm" | "Lịch trình học tập";
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
}

type CategoryFilter = "all" | "docs" | "songs" | "photos" | "schedules";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbData, setDbData] = useState<{
    docs: DocResult[];
    songs: SongResult[];
    schedules: ScheduleResult[];
    photos: PhotoResult[];
  }>({
    docs: [],
    songs: [],
    schedules: [],
    photos: []
  });
  const [loading, setLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();
  const { playSong } = useMusic();

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

  // Tự động focus ô tìm kiếm và tải dữ liệu mới nhất khi mở
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedCategory("all");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);

      setLoading(true);
      getCommandSearchData()
        .then((data) => {
          setDbData({
            docs: (data.docs || []) as DocResult[],
            songs: (data.songs || []) as SongResult[],
            schedules: (data.schedules || []) as ScheduleResult[],
            photos: ((data as { photos?: PhotoResult[] }).photos || []) as PhotoResult[]
          });
        })
        .catch((err) => console.error("Lỗi tải dữ liệu Command Palette:", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Xây dựng danh sách tác vụ và kết quả tìm kiếm đa nguồn
  const commandList: CommandItem[] = useMemo(() => {
    const q = query.toLowerCase().trim();
    const list: CommandItem[] = [];

    // 1. TÁC VỤ & ĐIỀU HƯỚNG TRANG CHÍNH
    if (selectedCategory === "all") {
      const actions: CommandItem[] = [
        {
          id: "action-focus-hub",
          title: "Vào phòng học tập trung (Focus Studio)",
          subtitle: "Đồng hồ Pomodoro & Âm thanh thiên nhiên Mưa / Sóng / Lửa trại",
          category: "Điều hướng & Tác vụ",
          badge: "MỚI ✨",
          icon: <Sparkles size={16} className="text-amber-500" />,
          onSelect: () => { 
            window.dispatchEvent(new CustomEvent("open-focus-hub"));
            setIsOpen(false); 
          }
        },
        {
          id: "action-ai-chat",
          title: "Trợ lý AI Toàn năng (My Space AI)",
          subtitle: "Hỏi đáp bài vở, tra cứu kiến thức, tóm tắt nội dung",
          category: "Điều hướng & Tác vụ",
          badge: "Gemini 🤖",
          icon: <Bot size={16} className="text-blue-500" />,
          onSelect: () => { 
            window.dispatchEvent(new CustomEvent("open-ai-chat"));
            setIsOpen(false); 
          }
        },
        {
          id: "nav-home",
          title: "Trang chủ / Bảng điều khiển",
          subtitle: "Xem tổng quan thống kê, tiến độ và dữ liệu hôm nay",
          category: "Điều hướng & Tác vụ",
          icon: <LayoutDashboard size={16} className="text-blue-500" />,
          onSelect: () => { router.push("/"); setIsOpen(false); }
        },
        {
          id: "nav-schedule",
          title: "Lịch trình học tập & Nhiệm vụ",
          subtitle: "Thời khóa biểu, thời gian biểu và hạn chót ôn tập",
          category: "Điều hướng & Tác vụ",
          icon: <Calendar size={16} className="text-indigo-500" />,
          onSelect: () => { router.push("/schedule"); setIsOpen(false); }
        },
        {
          id: "nav-docs",
          title: "Kho Tài liệu & Học tập",
          subtitle: "Quản lý bài giảng PDF, Word, ghi chú thông minh",
          category: "Điều hướng & Tác vụ",
          icon: <FileText size={16} className="text-emerald-500" />,
          onSelect: () => { router.push("/docs"); setIsOpen(false); }
        },
        {
          id: "nav-toeic",
          title: "Từ vựng TOEIC Hàng ngày (AI)",
          subtitle: "Bộ từ vựng theo ngày, phát âm chuẩn Mỹ, Flashcard 3D & Mini-Quiz",
          category: "Điều hướng & Tác vụ",
          icon: <GraduationCap size={16} className="text-blue-500" />,
          onSelect: () => { router.push("/toeic"); setIsOpen(false); }
        },
        {
          id: "nav-music",
          title: "Giai điệu tập trung & Thư giãn",
          subtitle: "Bộ sưu tập nhạc không lời, lofi và âm thanh sóng não",
          category: "Điều hướng & Tác vụ",
          icon: <Headphones size={16} className="text-violet-500" />,
          onSelect: () => { router.push("/music"); setIsOpen(false); }
        },
        {
          id: "nav-gallery",
          title: "Thư viện Kỷ niệm & Hình ảnh",
          subtitle: "Lưu giữ khoảnh khắc và album ảnh cá nhân",
          category: "Điều hướng & Tác vụ",
          icon: <ImageIcon size={16} className="text-pink-500" />,
          onSelect: () => { router.push("/gallery"); setIsOpen(false); }
        },
        {
          id: "nav-profile",
          title: "Cài đặt tài khoản & Hồ sơ",
          subtitle: "Tùy biến tên hiển thị, ảnh đại diện, mật khẩu",
          category: "Điều hướng & Tác vụ",
          icon: <Settings size={16} className="text-slate-500" />,
          onSelect: () => { router.push("/profile"); setIsOpen(false); }
        },
        {
          id: "action-logout",
          title: "Đăng xuất tài khoản",
          subtitle: "Đăng xuất an toàn khỏi phiên làm việc",
          category: "Điều hướng & Tác vụ",
          icon: <LogOut size={16} className="text-red-500" />,
          onSelect: () => { logout(); setIsOpen(false); }
        }
      ];

      actions.forEach((item) => {
        if (!q || item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)) {
          list.push(item);
        }
      });
    }

    // 2. TÌM KIẾM TÀI LIỆU (DOCUMENTS)
    if (selectedCategory === "all" || selectedCategory === "docs") {
      dbData.docs.forEach((doc) => {
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchCategory = doc.category?.toLowerCase().includes(q);
        if (!q || matchTitle || matchCategory) {
          list.push({
            id: `doc-${doc.id}`,
            title: doc.title || "Tài liệu không tên",
            subtitle: `Chủ đề: ${doc.category || "Chung"} • Định dạng: ${doc.type ? doc.type.toUpperCase() : "FILE"}`,
            category: "Tài liệu & Ghi chú",
            badge: doc.category || "Tài liệu",
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
    if (selectedCategory === "all" || selectedCategory === "songs") {
      dbData.songs.forEach((song) => {
        if (!q || song.title?.toLowerCase().includes(q)) {
          list.push({
            id: `song-${song.id}`,
            title: song.title || "Giai điệu không tên",
            subtitle: "Bài hát trong bộ sưu tập nhạc tập trung",
            category: "Giai điệu âm nhạc",
            badge: "Nhạc",
            icon: <Headphones size={16} className="text-violet-500" />,
            onSelect: () => {
              if (song.url) {
                playSong({
                  id: song.id,
                  title: song.title,
                  publicUrl: song.url,
                  url: song.url
                });
              }
              router.push("/music");
              setIsOpen(false);
            }
          });
        }
      });
    }

    // 4. TÌM KIẾM HÌNH ẢNH (PHOTOS)
    if (selectedCategory === "all" || selectedCategory === "photos") {
      dbData.photos.forEach((photo) => {
        const matchTitle = photo.title?.toLowerCase().includes(q);
        const matchAlbum = photo.album?.toLowerCase().includes(q);
        if (!q || matchTitle || matchAlbum) {
          list.push({
            id: `photo-${photo.id}`,
            title: photo.title || "Khoảnh khắc kỷ niệm",
            subtitle: `Thuộc Album: ${photo.album || "Chung"}`,
            category: "Thư viện Kỷ niệm",
            badge: photo.album || "Hình ảnh",
            icon: <ImageIcon size={16} className="text-pink-500" />,
            onSelect: () => {
              router.push("/gallery");
              setIsOpen(false);
            }
          });
        }
      });
    }

    // 5. TÌM KIẾM LỊCH TRÌNH (SCHEDULES)
    if (selectedCategory === "all" || selectedCategory === "schedules") {
      dbData.schedules.forEach((sch) => {
        if (!q || sch.title?.toLowerCase().includes(q)) {
          list.push({
            id: `sch-${sch.id}`,
            title: sch.title || "Lịch học tập",
            subtitle: `Ngày: ${sch.date} lúc ${sch.start_time?.substring(0, 5) || "08:00"} • ${sch.is_completed ? "Đã xong" : "Sắp diễn ra"}`,
            category: "Lịch trình học tập",
            badge: sch.is_completed ? "Hoàn thành" : "Sắp tới",
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
  }, [query, selectedCategory, dbData, router, playSong]);

  // Cuộn item đang chọn vào tầm nhìn (Scroll into view)
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  }, [selectedIndex]);

  // Điều hướng bằng bàn phím mũi tên & Enter
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

  // Phân nhóm kết quả theo danh mục
  const groupedItems = commandList.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ item, globalIndex: idx });
    return acc;
  }, {} as Record<string, { item: CommandItem; globalIndex: number }[]>);

  const categoryChips: { key: CategoryFilter; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: commandList.length },
    { key: "docs", label: "Tài liệu", count: dbData.docs.length },
    { key: "songs", label: "Nhạc", count: dbData.songs.length },
    { key: "photos", label: "Hình ảnh", count: dbData.photos.length },
    { key: "schedules", label: "Lịch trình", count: dbData.schedules.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-150">
      {/* Backdrop mờ nền */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Floating Raycast-Style Modal */}
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 transition-colors"
        onKeyDown={handleKeyDown}
      >
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 gap-3 bg-slate-50/70 dark:bg-slate-950/40">
          <Search size={18} className="text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Tìm tài liệu, giai điệu, hình ảnh, lịch học hoặc gõ lệnh..."
            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 text-sm font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {query ? (
            <button 
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              aria-label="Xóa nội dung tìm kiếm"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="font-mono text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar text-xs">
          {categoryChips.map((chip) => {
            const isActive = selectedCategory === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => {
                  setSelectedCategory(chip.key);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                }`}
              >
                <span>{chip.label}</span>
                {chip.count > 0 && (
                  <span className={`text-[10px] font-mono px-1 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {chip.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 divide-y divide-slate-100/60 dark:divide-slate-800/50">
          {loading && commandList.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500 font-medium animate-pulse flex flex-col items-center gap-2">
              <Layers size={20} className="animate-spin text-blue-500" />
              <span>Đang kết nối kho dữ liệu đa nguồn...</span>
            </div>
          ) : commandList.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              Không tìm thấy mục nào phù hợp với &quot;<span className="text-slate-700 dark:text-slate-300 font-bold">{query}</span>&quot;
            </div>
          ) : (
            Object.entries(groupedItems).map(([catName, items]) => (
              <div key={catName} className="pt-2.5 first:pt-0">
                <div className="flex items-center justify-between px-3 py-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {catName}
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {items.length} mục
                  </span>
                </div>

                <div className="space-y-0.5 mt-0.5">
                  {items.map(({ item, globalIndex }) => {
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        ref={(el) => {
                          itemRefs.current[globalIndex] = el;
                        }}
                        onClick={item.onSelect}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected 
                            ? "bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs" 
                            : "hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isSelected 
                              ? "bg-white/10 text-white" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className={`text-[11px] truncate mt-0.5 ${
                                isSelected ? "text-slate-300 dark:text-blue-100" : "text-slate-400 dark:text-slate-500"
                              }`}>
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                              isSelected 
                                ? "bg-white/20 text-white" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          <ArrowRight 
                            size={13} 
                            className={`transition-opacity ${isSelected ? "opacity-100 text-slate-300 dark:text-white" : "opacity-0"}`} 
                          />
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
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs text-[10px] text-slate-600 dark:text-slate-300">↑</kbd>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs text-[10px] text-slate-600 dark:text-slate-300">↓</kbd>
              <span>Chọn</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs text-[10px] text-slate-600 dark:text-slate-300">↵</kbd>
              <span>Mở</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shadow-2xs text-[10px] text-slate-600 dark:text-slate-300">ESC</kbd>
              <span>Đóng</span>
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-mono text-[10px]">
            Omni Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
