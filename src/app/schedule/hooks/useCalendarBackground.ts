"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { getUploadUrl } from "@/app/actions/data";

export function useCalendarBackground() {
  const [calendarBg, setCalendarBg] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendar_custom_bg');
    }
    return null;
  });

  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('calendar_custom_bg_opacity');
      if (saved) return Number(saved);
    }
    return 75;
  });

  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn một file ảnh hợp lệ (PNG, JPG, WEBP).");
      return;
    }

    setIsUploadingBg(true);
    const toastId = toast.loading("Đang tải ảnh nền lên...");

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          try {
            localStorage.setItem('calendar_custom_bg', reader.result);
            setCalendarBg(reader.result);
          } catch {
            const blobUrl = URL.createObjectURL(file);
            setCalendarBg(blobUrl);
          }
        }
      };
      reader.readAsDataURL(file);

      try {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `calendar_bg/${Date.now()}.${fileExt}`;
        const { signedUrl } = await getUploadUrl(fileName);
        await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
      } catch (cloudErr) {
        console.warn("[CalendarBg] Lưu trữ cloud không khả dụng, sử dụng bản lưu trình duyệt:", cloudErr);
      }

      toast.success("Đã cài đặt ảnh nền thành công!", { id: toastId });
    } catch (err: unknown) {
      const e = err as Error;
      toast.error("Lỗi khi tải ảnh: " + e.message, { id: toastId });
    } finally {
      setIsUploadingBg(false);
      e.target.value = '';
    }
  };

  const handleRemoveBg = () => {
    setCalendarBg(null);
    localStorage.removeItem('calendar_custom_bg');
    toast.success("Đã xóa ảnh nền, trở về mặc định.");
  };

  const handleChangeOpacity = (val: number) => {
    setBgOpacity(val);
    localStorage.setItem('calendar_custom_bg_opacity', String(val));
  };

  return {
    calendarBg,
    bgOpacity,
    isUploadingBg,
    handleBgUpload,
    handleRemoveBg,
    handleChangeOpacity
  };
}
