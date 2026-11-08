"use client";

import { useState, useEffect } from "react";
import { Mail, ArrowRight, X, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { resetPassword } from "../actions";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialEmail]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Vui lòng nhập địa chỉ email của bạn.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const toastId = toast.loading("Đang gửi yêu cầu đặt lại mật khẩu...");

    try {
      const res = await resetPassword(trimmedEmail);
      if (res.success) {
        setIsSuccess(true);
        toast.success(res.message || "Đã gửi email khôi phục thành công!", { id: toastId });
      } else {
        const errText = res.error || "Không thể gửi yêu cầu đặt lại mật khẩu.";
        setErrorMessage(errText);
        toast.error(errText, { id: toastId });
      }
    } catch (err) {
      const unexpectedError = err instanceof Error ? err.message : "Có lỗi không mong muốn xảy ra.";
      console.error("[ForgotPasswordModal] Error:", unexpectedError);
      setErrorMessage("Không thể kết nối với máy chủ. Vui lòng thử lại sau.");
      toast.error("Có lỗi xảy ra khi gửi yêu cầu.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      {/* Backdrop click to close */}
      <div 
        className="absolute inset-0" 
        onClick={() => !loading && onClose()} 
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-10 transition-all">
        {/* Nút Đóng */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          title="Đóng cửa sổ"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {isSuccess ? (
          /* Trạng thái gửi thành công */
          <div className="text-center py-3 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={34} />
            </div>
            <div>
              <h3 id="forgot-password-title" className="text-xl font-bold text-slate-800 dark:text-white">
                Kiểm tra email của bạn 📬
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                Chúng tôi đã gửi liên kết đặt lại mật khẩu đến:
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm mt-1 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-lg inline-block break-all">
                {email}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                Vui lòng kiểm tra hộp thư đến (và hòm thư Spam/Rác) để bấm vào liên kết đặt lại mật khẩu.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-2xl transition-all shadow-md shadow-blue-500/20 text-sm cursor-pointer"
              >
                Đã hiểu, quay lại Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                Chưa nhận được? Gửi lại email
              </button>
            </div>
          </div>
        ) : (
          /* Form nhập Email khôi phục */
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Mail size={28} />
              </div>
              <h3 id="forgot-password-title" className="text-xl font-bold text-slate-800 dark:text-white">
                Quên mật khẩu?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
                Nhập địa chỉ email tài khoản của bạn. Hệ thống sẽ gửi cho bạn một liên kết an toàn để đặt mật khẩu mới.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-red-600 dark:text-red-400 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label 
                  htmlFor="forgot-password-email"
                  className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2"
                >
                  Email đăng ký
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                    <Mail size={18} />
                  </div>
                  <input
                    id="forgot-password-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vidu@gmail.com"
                    required
                    autoFocus
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Đang gửi yêu cầu...
                    </span>
                  ) : (
                    <>
                      <span>Gửi liên kết khôi phục</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Hủy & Quay lại đăng nhập
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
