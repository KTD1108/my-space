"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import { verifyPin } from "./actions";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gọi hàm kiểm tra ngầm trên máy chủ, truyền mã PIN người dùng nhập vào
    const result = await verifyPin(password);
    
    if (result.success) {
      toast.success("Mở khóa thành công!");
      router.push("/");
      router.refresh(); 
    } else {
      toast.error("Sai mã PIN, vui lòng thử lại!");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 w-full relative overflow-hidden">
      {/* Vòng tròn trang trí nền */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-sm w-full z-10 text-center animate-fade-in border border-slate-100">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-3">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Vùng riêng tư</h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">Vui lòng nhập mã PIN để truy cập Không gian cá nhân.</p>
        
        <form onSubmit={handleLogin}>
          <div className="relative mb-6">
            <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mã PIN..." 
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-[0.5em] text-xl font-bold transition-all bg-slate-50 focus:bg-white"
              autoFocus
            />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5">
            MỞ KHÓA
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-6 font-medium">Mã PIN mặc định: <span className="font-bold text-slate-600">123456</span></p>
      </div>
    </div>
  );
}
