"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const loadingToast = toast.loading("Đang xử lý...");
    
    try {
      const result = isLogin ? await login(formData) : await signup(formData);
      
      if (result.success) {
        toast.success(isLogin ? "Đăng nhập thành công!" : "Đăng ký thành công! Đang vào hệ thống...", { id: loadingToast });
        router.push("/");
        router.refresh(); 
      } else {
        toast.error(result.error || "Có lỗi xảy ra", { id: loadingToast });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/40 px-4 py-8 relative overflow-hidden">
      {/* Các quầng sáng mềm mại tạo chiều sâu, không chói mắt */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-purple-200/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Khung đăng nhập chính */}
      <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 max-w-md w-full z-10 border border-slate-100/80 transition-all">
        
        {/* Logo & Tiêu đề */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Sparkles size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            {isLogin ? "Chào mừng trở lại! 👋" : "Tạo tài khoản mới ✨"}
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            {isLogin ? "Đăng nhập để vào Không gian lưu trữ cá nhân của bạn" : "Bắt đầu lưu giữ những kỷ niệm và tài liệu của bạn"}
          </p>
        </div>

        {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
        <div className="flex bg-slate-100/90 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              !isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Đăng ký
          </button>
        </div>
        
        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Email của bạn
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={19} />
              </div>
              <input 
                type="email" 
                name="email"
                placeholder="vidu@gmail.com" 
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/60 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400 text-sm"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={19} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password"
                placeholder="Nhập ít nhất 6 ký tự" 
                required
                minLength={6}
                className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/60 focus:bg-white text-slate-800 font-medium placeholder:text-slate-400 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
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
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 mt-4 text-base disabled:opacity-70 disabled:cursor-not-allowed"
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
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium">
            🔒 Không gian cá nhân được bảo vệ & mã hóa an toàn.
          </p>
        </div>
      </div>
    </div>
  );
}
