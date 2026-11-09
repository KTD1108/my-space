"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, Sun, Moon, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { login, signup } from "./actions";
import ForgotPasswordModal from "./components/ForgotPasswordModal";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      title={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      aria-label="Đổi giao diện sáng/tối"
    >
      {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
    </button>
  );
}

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  return (
    <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs animate-in fade-in">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <span>{decodeURIComponent(error)}</span>
    </div>
  );
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const router = useRouter();

  // Tự động chuyển hướng sang /reset-password nếu URL mang token khôi phục
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
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const loadingToast = toast.loading("Đang xử lý...");
    
    try {
      const result = isLogin ? await login(formData) : await signup(formData);
      
      if (result.success) {
        if (isLogin || result.hasSession) {
          toast.success(
            isLogin ? "Đăng nhập thành công!" : "Đăng ký thành công! Đang vào hệ thống...",
            { id: loadingToast }
          );
          router.push("/");
          router.refresh(); 
        } else {
          toast.success(
            result.message || "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.",
            { id: loadingToast, duration: 8000 }
          );
          setIsLogin(true);
        }
      } else {
        toast.error(result.error || "Có lỗi xảy ra", { id: loadingToast });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      console.error("[LoginPage] Form submit error:", msg);
      toast.error("Không thể xử lý yêu cầu lúc này.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8 relative overflow-hidden transition-colors">
      {/* Nút đổi giao diện Dark/Light ở góc trên */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Các quầng sáng mềm mại tạo chiều sâu */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/25 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/25 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-200/20 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Khung đăng nhập chính */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-none max-w-md w-full z-10 border border-slate-100/80 dark:border-slate-800 transition-all">
        
        {/* Banner lỗi từ callback URL (nếu có) */}
        <Suspense fallback={null}>
          <AuthErrorBanner />
        </Suspense>

        {/* Logo & Tiêu đề */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isLogin ? "Chào mừng trở lại! 👋" : "Tạo tài khoản mới ✨"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
            {isLogin ? "Đăng nhập để vào Không gian lưu trữ cá nhân của bạn" : "Bắt đầu lưu giữ những kỷ niệm và tài liệu của bạn"}
          </p>
        </div>

        {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
        <div className="flex bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              isLogin 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              !isLogin 
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            Đăng ký
          </button>
        </div>
        
        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
              Email của bạn
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Mail size={19} />
              </div>
              <input 
                type="email" 
                name="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="vidu@gmail.com" 
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Mật khẩu
              </label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                <Lock size={19} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                placeholder="Nhập ít nhất 6 ký tự" 
                required
                minLength={6}
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-lg transition-colors cursor-pointer"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nút Submit */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 mt-4 text-base disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Đang xử lý...
              </span>
            ) : (
              <>
                <span>{isLogin ? "Đăng nhập ngay" : "Tạo tài khoản"}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        
        {/* Footer ghi chú bảo mật */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            🔒 Không gian cá nhân được bảo vệ & mã hóa an toàn.
          </p>
        </div>
      </div>

      {/* Modal Quên mật khẩu */}
      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        initialEmail={emailValue}
      />
    </div>
  );
}
