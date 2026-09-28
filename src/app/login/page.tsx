"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 w-full relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-sm w-full z-10 animate-fade-in border border-slate-100">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-3">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2 text-center">{isLogin ? "Đăng nhập" : "Đăng ký"}</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium text-center">
          {isLogin ? "Chào mừng trở lại Không gian đám mây." : "Tạo tài khoản lưu trữ riêng của bạn."}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="email" 
              name="email"
              placeholder="Email của bạn" 
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
            />
          </div>
          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="password" 
              name="password"
              placeholder="Mật khẩu" 
              required
              minLength={6}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 mt-2">
            {loading ? "Đang xử lý..." : (isLogin ? "ĐĂNG NHẬP" : "TẠO TÀI KHOẢN")}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 font-medium hover:underline">
            {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
