"use client";
import { useState, useEffect } from "react";
import { Upload, Trash2, Maximize2, X, Image as ImageIcon, ImagePlus, FolderHeart, FolderOpen, Images } from "lucide-react";
import toast from "react-hot-toast";
import { getPhotos, getUploadUrl, addRecord, deleteRecord, getAlbums, addAlbum, deleteAlbum } from "@/app/actions/data";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [activeAlbum, setActiveAlbum] = useState('Tất cả');
  const [uploadAlbum, setUploadAlbum] = useState('Chung');
  
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => { 
    fetchPhotos(); 
    fetchAlbums();
  }, []);

  const fetchPhotos = async () => {
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchAlbums = async () => {
    try {
      const data = await getAlbums();
      setAlbums(data);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    if (newAlbumName.trim() === 'Chung' || newAlbumName.trim() === 'Tất cả') {
      toast.error("Tên album này đã được hệ thống giữ lại.");
      return;
    }
    
    const loadingToast = toast.loading("Đang tạo album...");
    try {
      await addAlbum(newAlbumName.trim());
      toast.success("Tạo thành công!", { id: loadingToast });
      setNewAlbumName('');
      setIsAddingAlbum(false);
      fetchAlbums();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleDeleteAlbum = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa album "${name}"? Các bức ảnh bên trong sẽ được dời về mục Chung.`)) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteAlbum(id, name);
      toast.success("Đã xóa album!", { id: loadingToast });
      if (activeAlbum === name) setActiveAlbum('Tất cả');
      if (uploadAlbum === name) setUploadAlbum('Chung');
      fetchPhotos();
      fetchAlbums();
    } catch (error: any) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const loadingToast = toast.loading(`Đang tải lên ${files.length} ảnh vào ${uploadAlbum}...`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `photos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const { signedUrl, fullPath } = await getUploadUrl(fileName);
        
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'image/jpeg' }
        });
        if (!uploadRes.ok) throw new Error("Tải ảnh thất bại do mạng hoặc bảo mật");

        await addRecord('photos', { 
          title: file.name, 
          url: fullPath,
          album: uploadAlbum 
        });
      }

      toast.success(`Đã tải lên ${files.length} ảnh thành công!`, { id: loadingToast });
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bức ảnh này vĩnh viễn?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('photos', id, path);
      toast.success("Đã xóa ảnh!", { id: loadingToast });
      fetchPhotos();
      if (selectedPhoto === path) setSelectedPhoto(null);
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  const handleAlbumClick = (name: string) => {
    setActiveAlbum(name);
    if (name !== 'Tất cả') {
      setUploadAlbum(name);
    } else {
      setUploadAlbum('Chung');
    }
  };

  const filteredPhotos = activeAlbum === 'Tất cả' 
    ? photos 
    : photos.filter(p => (p.album || 'Chung') === activeAlbum);

  const allAlbumNames = ['Chung', ...albums.map(a => a.name)];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kỷ niệm</h1>
          <p className="text-slate-500 mt-1 font-medium">Những khoảnh khắc đáng nhớ của bạn</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <select 
            value={uploadAlbum} 
            onChange={(e) => setUploadAlbum(e.target.value)}
            className="bg-slate-50 border-none text-slate-600 font-bold text-sm rounded-xl py-2.5 px-4 outline-none cursor-pointer focus:ring-2 focus:ring-pink-100 min-w-[120px]"
          >
            {allAlbumNames.map(album => (
              <option key={album} value={album}>{album}</option>
            ))}
          </select>

          <label className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-pink-500/30 cursor-pointer flex items-center gap-2">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2"><Upload size={18} /> Đang tải...</span>
            ) : (
              <><ImagePlus size={18} /> Đăng ảnh</>
            )}
            <input type="file" multiple className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start h-full">
        {/* Sidebar Album */}
        <div className="w-full md:w-64 flex flex-col gap-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 shrink-0 sticky top-6">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Thư viện ảnh</h3>
          
          <button
            onClick={() => handleAlbumClick('Tất cả')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeAlbum === 'Tất cả' ? "bg-pink-50 text-pink-600 border border-pink-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <Images size={18} className={activeAlbum === 'Tất cả' ? "text-pink-500" : "text-slate-400"} />
            Tất cả ảnh
            <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs">{photos.length}</span>
          </button>

          <button
            onClick={() => handleAlbumClick('Chung')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeAlbum === 'Chung' ? "bg-pink-50 text-pink-600 border border-pink-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
            }`}
          >
            <FolderOpen size={18} className={activeAlbum === 'Chung' ? "text-pink-500" : "text-slate-400"} />
            Chưa phân loại
            <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs">{photos.filter(p => (p.album || 'Chung') === 'Chung').length}</span>
          </button>

          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-2 mt-4">Album của bạn</h3>
          
          {albums.map(album => (
            <div key={album.id} className="group relative">
              <button
                onClick={() => handleAlbumClick(album.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm w-full text-left ${
                  activeAlbum === album.name ? "bg-pink-50 text-pink-600 border border-pink-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <FolderHeart size={18} className={activeAlbum === album.name ? "text-pink-500" : "text-slate-400"} />
                <span className="truncate max-w-[120px]">{album.name}</span>
                <span className="ml-auto bg-slate-100 text-slate-400 py-0.5 px-2 rounded-full text-xs group-hover:opacity-0 transition-opacity">
                  {photos.filter(p => p.album === album.name).length}
                </span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id, album.name); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm"
                title="Xóa album"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {isAddingAlbum ? (
            <form onSubmit={handleAddAlbum} className="mt-2 p-2 bg-pink-50/50 rounded-2xl border border-pink-100 flex items-center">
              <input
                autoFocus
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Tên album..."
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none px-2"
              />
              <button type="button" onClick={() => setIsAddingAlbum(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              <button type="submit" className="p-1 text-pink-500 hover:text-pink-600 font-bold ml-1">OK</button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingAlbum(true)}
              className="flex items-center gap-2 px-4 py-3 mt-2 rounded-2xl transition-all font-bold text-sm text-pink-500 hover:bg-pink-50 border border-dashed border-pink-200"
            >
              <FolderHeart size={18} />
              Tạo Album
            </button>
          )}
        </div>

        {/* Lưới ảnh */}
        <div className="flex-1 w-full bg-transparent">
          {filteredPhotos.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-pink-50 rounded-[2rem] flex items-center justify-center text-pink-300 mb-4 rotate-3">
                <ImageIcon size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Chưa có bức ảnh nào</h3>
              <p className="text-slate-500 font-medium">Hãy lưu giữ khoảnh khắc đầu tiên vào album này nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square bg-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                  <img src={photo.publicUrl} alt={photo.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                    <p className="text-white text-sm font-bold truncate mb-3 drop-shadow-md">{photo.title}</p>
                    <div className="flex justify-between items-center">
                      <button onClick={() => setSelectedPhoto(photo.publicUrl)} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl text-white transition-colors" title="Phóng to">
                        <Maximize2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(photo.id, photo.url)} className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-xl text-white transition-colors" title="Xóa ảnh">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Phóng to ảnh */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in duration-200">
          <button onClick={() => setSelectedPhoto(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors border border-white/10">
            <X size={24} />
          </button>
          <img src={selectedPhoto} alt="Phóng to" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
