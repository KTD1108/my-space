"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { getPhotos, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => { fetchPhotos(); }, []);

  const fetchPhotos = async () => {
    const data = await getPhotos();
    setPhotos(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const loadingToast = toast.loading(`Đang xử lý tải lên ${files.length} ảnh an toàn...`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `photos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const signedUploadUrl = await getUploadUrl(fileName);
        
        const uploadRes = await fetch(signedUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'image/jpeg' }
        });
        if (!uploadRes.ok) throw new Error("Tải ảnh thất bại do mạng hoặc bảo mật");

        await addRecord('photos', { title: file.name, url: fileName });
      }

      toast.success(`Đã tải lên ${files.length} ảnh thành công!`, { id: loadingToast });
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi tải ảnh: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Xóa bức ảnh này vĩnh viễn?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('photos', id, path);
      toast.success("Đã xóa ảnh", { id: loadingToast });
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Thư viện Ảnh</h1>
          <p className="text-slate-500 mt-1">Dữ liệu cá nhân tuyệt mật</p>
        </div>
        <label className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-pink-600/30 cursor-pointer flex items-center gap-2">
          {uploading ? <span className="animate-pulse">Đang tải...</span> : <><Upload size={18} /> Đăng ảnh mới</>}
          <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        
        <label className="group rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 hover:border-pink-400 hover:bg-pink-50/50 transition-all flex flex-col items-center justify-center aspect-square cursor-pointer shadow-sm hover:shadow-md">
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mb-2"></div>
              <span className="text-slate-500 font-medium text-sm">Đang bảo mật...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <span className="text-sm font-semibold text-slate-600 group-hover:text-pink-600">Thêm nhiều ảnh</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleUpload} disabled={uploading} />
            </>
          )}
        </label>

        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className="group rounded-2xl overflow-hidden shadow-sm bg-white hover:shadow-xl transition-all cursor-zoom-in relative aspect-square"
            onClick={() => setLightboxImage(photo.publicUrl)}
          >
            <img 
              src={photo.publicUrl} 
              alt={photo.title} 
              loading="lazy"
              className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <button 
              onClick={(e) => handleDelete(photo.id, photo.url, e)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0"
            >
              <Trash2 size={16} />
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[10px] group-hover:translate-y-0 text-white">
              <h4 className="font-medium text-sm truncate drop-shadow-md">{photo.title.replace(/\.[^/.]+$/, "")}</h4>
            </div>
          </div>
        ))}
      </div>

      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImage(null)}>
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Phóng to" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
