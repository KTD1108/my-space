"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "myspace_pwa_dismissed_until";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày không làm phiền lại

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra môi trường browser
    if (typeof window === "undefined") return;

    // 2. Nếu đã chạy trong chế độ PWA Standalone thì không hiện
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 3. Kiểm tra xem người dùng đã chọn bỏ qua gần đây chưa
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return;
      }
    } catch {}

    // 4. Phát hiện thiết bị iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isIosDevice && isSafari) {
      setIsIOS(true);
      // Hiển thị sau 3 giây để người dùng làm quen trang trước
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // 5. Bắt sự kiện beforeinstallprompt trên Android / Chromium / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("Lỗi khi kích hoạt cài đặt PWA:", err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION_MS).toString());
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <aside 
      aria-label="Cài đặt ứng dụng My Space"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        {/* App Icon */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 ring-2 ring-blue-500/20">
          M
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              Cài đặt My Space
            </h4>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
              <Sparkles size={9} /> App
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {isIOS 
              ? "Thêm vào Màn hình chính để sử dụng mượt mà như app gốc trên iOS."
              : "Cài đặt vào điện thoại hoặc máy tính để mở nhanh trong 1 chạm và sử dụng toàn màn hình."
            }
          </p>

          {showIOSGuide && (
            <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-blue-600 dark:text-blue-400">Hướng dẫn cài đặt trên iOS:</p>
              <p>1. Bấm nút <span className="font-bold">Chia sẻ (Share)</span> ở thanh dưới Safari.</p>
              <p>2. Chọn <span className="font-bold">&quot;Thêm vào MH chính&quot; (Add to Home Screen)</span>.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {isIOS ? <Smartphone size={13} /> : <Download size={13} />}
              <span>{isIOS ? "Xem cách cài" : "Cài đặt ngay"}</span>
            </button>
            
            <button
              onClick={handleDismiss}
              className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Đóng thông báo"
        >
          <X size={15} />
        </button>
      </div>
    </aside>
  );
}
