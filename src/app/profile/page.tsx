"use client";
import { useState, useEffect } from "react";
import { UserCircle, Camera, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { getProfileData, updateProfileMetadata, getUploadUrl } from "@/app/actions/data";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const data = await getProfileData();
      if (data) {
        setProfile(data);
        setDisplayName(data.name || "");
        if (data.avatar) setAvatarPreview(data.avatar);
      }
    }
    loadProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Tên không được để trống");
      return;
    }

    setSaving(true);
    const loadingToast = toast.loading("Đang cập nhật hồ sơ...");

    try {
      let avatarPath = undefined;
      
      // Nếu có chọn ảnh mới thì upload lên trước
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const fileName = `profile/avatar_${Date.now()}.${ext}`;
        const { signedUrl, fullPath } = await getUploadUrl(fileName);
        
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: avatarFile,
          headers: { 'Content-Type': avatarFile.type }
        });
        
        if (!uploadRes.ok) throw new Error("Lỗi tải ảnh lên máy chủ");
        avatarPath = fullPath;
      }

      // Cập nhật thông tin vào metadata của Supabase
      await updateProfileMetadata(displayName.trim(), avatarPath);
      
      toast.success("Đã lưu thông tin cá nhân!", { id: loadingToast });
      
      // Load lại trang để cập nhật Sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in flex flex-col h-full mt-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="text-yellow-400" size={28} /> Trang cá nhân
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Tùy chỉnh cách bạn hiển thị trong không gian của mình</p>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100">
        <form onSubmit={handleSave} className="flex flex-col items-center">
          
          {/* Avatar Upload */}
          <div className="relative mb-10 group">
            <div className="w-40 h-40 rounded-full border-4 border-slate-50 shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center relative z-10">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={80} className="text-slate-300" />
              )}
              
              {/* Lớp mờ khi hover để đổi ảnh */}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <Camera size={32} className="text-white drop-shadow-md" />
              </div>
            </div>
            
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
              accept="image/*"
              onChange={handleAvatarChange}
            />
            
            {/* Trang trí bóng mờ */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100 to-pink-100 rounded-full blur-2xl -z-10 opacity-60"></div>
          </div>

          <div className="w-full max-w-md space-y-6">
            <div>
              <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-2 px-1">Email đăng nhập</label>
              <input 
                type="email" 
                value={profile.email} 
                disabled 
                className="w-full bg-slate-100 border border-slate-200 text-slate-400 font-medium text-base rounded-2xl py-3.5 px-5 outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-500 uppercase tracking-widest mb-2 px-1">Tên hiển thị</label>
              <input 
                type="text" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-bold text-base rounded-2xl py-3.5 px-5 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm"
              />
            </div>

            <button 
              type="submit"
              disabled={saving}
              className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={24} /> : <><CheckCircle2 size={24} /> Lưu thay đổi</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
