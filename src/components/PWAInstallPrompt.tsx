"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Sparkles, Share, MoreVertical, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "myspace_pwa_dismissed_until";
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 ngày nhắc lại nếu người dùng bấm "Để sau"

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Khởi tạo Service Worker và phát hiện thiết bị
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Đăng ký Service Worker chuẩn PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.debug("[PWA] Service Worker registered successfully.");
        })
        .catch((err) => {
          console.debug("[PWA] Service Worker registration skipped:", err);
        });
    }

    // 2. Nếu đã chạy trong chế độ PWA Standalone (đã cài đặt) thì không hiển thị
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 3. Phát hiện hệ điều hành thiết bị
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 4. Kiểm tra xem người dùng đã bấm "Để sau" gần đây chưa
    let isDismissed = false;
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        isDismissed = true;
      }
    } catch {}

    // 5. Bắt sự kiện beforeinstallprompt trên Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 6. Trên thiết bị di động (cả iOS lẫn Android khi chưa có prompt native):
    // Tự động hiển thị sau 1.5 giây nếu chưa bị bỏ qua
    if (!isDismissed && (isIosDevice || isAndroidDevice)) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    // 7. Lắng nghe sự kiện mở thủ công từ menu hoặc nút "Cài đặt App"
    const handleManualOpen = () => {
      setIsVisible(true);
    };
    window.addEventListener("open-pwa-install", handleManualOpen);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("open-pwa-install", handleManualOpen);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    // Nếu có prompt cài đặt tự động của trình duyệt (Chrome/Android/Desktop)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsVisible(false);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.warn("Lỗi kích hoạt cài đặt PWA:", err);
      }
    }

    // Nếu không có native prompt (như trên iPhone Safari, hoặc Chrome không kích hoạt prompt tự động):
    setShowGuide(true);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION_MS).toString());
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <aside 
      aria-label="Cài đặt ứng dụng My Space"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200/90 dark:border-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
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
              Tải & Cài đặt My Space
            </h4>
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800">
              <Sparkles size={9} /> App
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {isIOS 
              ? "Cài ứng dụng vào màn hình chính iPhone để mở nhanh trong 1 chạm & dùng toàn màn hình."
              : "Cài đặt vào điện thoại hoặc máy tính để mở siêu tốc và trải nghiệm như app gốc."
            }
          </p>

          {/* Hướng dẫn cài đặt khi không có nút tự động */}
          {showGuide && (
            <div className="mt-2.5 p-2.5 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/60 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 space-y-1.5 animate-in fade-in duration-200">
              {isIOS ? (
                <>
                  <p className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <Share size={13} /> Cách thêm vào màn hình chính iPhone:
                  </p>
                  <p className="pl-4">1. Bấm nút <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng Safari.</p>
                  <p className="pl-4">2. Cuộn xuống chọn <strong className="text-blue-600 dark:text-blue-400">&quot;Thêm vào MH chính&quot;</strong> (<PlusSquare size={11} className="inline mb-0.5" /> Add to Home Screen).</p>
                  <p className="pl-4">3. Bấm <strong>Thêm</strong> ở góc trên bên phải là xong!</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <MoreVertical size={13} /> Cách thêm vào màn hình chính Android:
                  </p>
                  <p className="pl-4">1. Bấm vào biểu tượng <strong>Menu 3 chấm (⋮)</strong> ở góc trên Chrome.</p>
                  <p className="pl-4">2. Chọn <strong className="text-blue-600 dark:text-blue-400">&quot;Cài đặt ứng dụng&quot;</strong> hoặc <strong>&quot;Thêm vào Màn hình chính&quot;</strong>.</p>
                  <p className="pl-4">3. Bấm <strong>Cài đặt</strong> để hoàn tất.</p>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {isIOS ? <Smartphone size={13} /> : <Download size={13} />}
              <span>{deferredPrompt ? "Cài đặt ngay" : isIOS ? "Xem cách cài trên iPhone" : "Tải về màn hình chính"}</span>
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
