"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle, ArrowRight, Sun, Moon } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/utils/supabase/client";
import { updateUserPassword } from "@/app/login/actions";

const MIN_PASSWORD_LENGTH = 6;

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function initializeSession() {
      try {
        // 1. Kiểm tra query parameters (PKCE code hoặc OTP token_hash)
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");
          const tokenHash = params.get("token_hash");
          const type = params.get("type") as any;

          if (code) {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data?.session && isMounted) {
                setHasValidSession(true);
                setVerifyingSession(false);
                return;
              }
            } catch (err) {
              console.warn("[ResetPassword] Code exchange error:", err);
            }
          }

          if (tokenHash && type) {
            try {
              const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
              if (!error && data?.session && isMounted) {
                setHasValidSession(true);
                setVerifyingSession(false);
                return;
              }
            } catch (err) {
              console.warn("[ResetPassword] verifyOtp error:", err);
            }
          }
        }

        // 2. Kiểm tra session hiện có (từ cookie hoặc session storage)
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          setHasValidSession(true);
          setVerifyingSession(false);
          return;
        }

        // 3. Nếu có hash fragment (#access_token=... hoặc #type=recovery), chờ onAuthStateChange xử lý
        const hasHashRecovery = typeof window !== "undefined" && 
          (window.location.hash.includes("access_token") || window.location.hash.includes("type=recovery"));

        if (!hasHashRecovery && isMounted) {
          setVerifyingSession(false);
        } else {
          // Cho phép tối đa 3 giây để Supabase SDK parse xong hash fragment
          const timer = setTimeout(() => {
            if (isMounted) {
              setVerifyingSession(false);
            }
          }, 3000);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error("[ResetPassword] Error verifying session:", err);
        if (isMounted) {
          setVerifyingSession(false);
        }
      }
    }

    initializeSession();

    // 4. Lắng nghe sự kiện auth từ Supabase (PASSWORD_RECOVERY hoặc SIGNED_IN)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session) || session) {
        setHasValidSession(true);
        setVerifyingSession(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMessage(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp với mật khẩu mới.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Đang cập nhật mật khẩu...");

    try {
      // 1. Thử gọi Server Action
      const res = await updateUserPassword(password);
      
      if (res.success) {
        setIsSuccess(true);
        toast.success("Mật khẩu đã được đặt lại thành công!", { id: toastId });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
        return;
      }

      // 2. Nếu Server Action báo lỗi phiên (do luồng Implicit hash chưa đồng bộ cookie), thử tiếp qua Browser Client
      const supabase = createClient();
      const { error: clientError } = await supabase.auth.updateUser({ password });

      if (clientError) {
        console.error("[ResetPassword] Client update failed:", clientError.message);
        const errText = res.error || clientError.message;
        setErrorMessage(errText);
        toast.error(errText, { id: toastId });
      } else {
        setIsSuccess(true);
        toast.success("Mật khẩu đã được đặt lại thành công!", { id: toastId });
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      const unexpectedError = err instanceof Error ? err.message : String(err);
      console.error("[ResetPassword] Submit error:", unexpectedError);
      setErrorMessage("Không thể cập nhật mật khẩu. Vui lòng thử lại sau.");
      toast.error("Có lỗi xảy ra khi cập nhật mật khẩu.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/50 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4 py-8 relative overflow-hidden transition-colors">
      {/* Nút đổi Theme */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Ánh sáng nền */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/25 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/25 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Thẻ chính */}
      <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-none max-w-md w-full z-10 border border-slate-100/80 dark:border-slate-800 transition-all">
        {verifyingSession ? (
          <div className="text-center py-12">
            <span className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mb-4"></span>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Đang xác thực liên kết...
            </p>
          </div>
        ) : isSuccess ? (
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                Thành công! 🎉
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                Mật khẩu mới của bạn đã được cập nhật an toàn. Đang tự động chuyển hướng vào hệ thống...
              </p>
            </div>
            <div className="pt-3">
              <Link
                href="/"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 inline-flex items-center justify-center gap-2 text-sm"
              >
                <span>Vào không gian làm việc ngay</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        ) : !hasValidSession ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={34} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Liên kết không hợp lệ hoặc đã hết hạn
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                Liên kết đặt lại mật khẩu này có thể đã được sử dụng hoặc đã hết thời gian hiệu lực vì lý do bảo mật.
              </p>
            </div>
            <div className="pt-3">
              <Link
                href="/login"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 inline-flex items-center justify-center gap-2 text-sm"
              >
                <span>Về trang Đăng nhập & Yêu cầu lại</span>
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
                <KeyRound size={32} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                Đặt lại mật khẩu mới 🔑
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                Vui lòng nhập mật khẩu mới để bảo vệ tài khoản của bạn.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Mật khẩu mới */}
              <div>
                <label 
                  htmlFor="new-password"
                  className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2"
                >
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Lock size={19} />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập ít nhất 6 ký tự"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
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

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label 
                  htmlFor="confirm-password"
                  className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2"
                >
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Lock size={19} />
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    className="w-full pl-11 pr-12 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all bg-slate-50/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1 rounded-lg transition-colors cursor-pointer"
                    title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Đang lưu mật khẩu...
                    </span>
                  ) : (
                    <>
                      <span>Cập nhật mật khẩu</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <Link
                  href="/login"
                  className="w-full py-2.5 text-xs font-semibold text-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Quay lại Đăng nhập
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            🔒 Thiết lập mật khẩu được bảo vệ và mã hóa đầu cuối.
          </p>
        </div>
      </div>
    </div>
  );
}
