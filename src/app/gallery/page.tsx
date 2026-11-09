"use client";
import { useState, useEffect } from "react";
import { 
  Upload, 
  Trash2, 
  Maximize2, 
  X, 
  Image as ImageIcon, 
  ImagePlus, 
  FolderHeart, 
  FolderOpen, 
  Images, 
  FolderInput, 
  Share2,
  CheckSquare,
  Check
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  getPhotos, 
  getUploadUrl, 
  addRecord, 
  deleteRecord, 
  getAlbums, 
  addAlbum, 
  deleteAlbum, 
  movePhotoToAlbum, 
  createShareLink,
  deletePhotosBulk,
  movePhotosBulk
} from "@/app/actions/data";

const PHOTOS_CACHE_KEY = 'myspace_photos_cache_v2';
const ALBUMS_CACHE_KEY = 'myspace_albums_cache_v2';

export default function GalleryPage() {
  const [photos, setPhotos] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(PHOTOS_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [albums, setAlbums] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(ALBUMS_CACHE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  
  const [activeAlbum, setActiveAlbum] = useState('Tất cả');
  const [uploadAlbum, setUploadAlbum] = useState('Chung');
  
  const [isAddingAlbum, setIsAddingAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [movingPhoto, setMovingPhoto] = useState<any | null>(null);
  const [targetAlbumMove, setTargetAlbumMove] = useState('Chung');

  // Chế độ Chọn nhiều ảnh (Multi-Select Mode)
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [targetBulkAlbumMove, setTargetBulkAlbumMove] = useState('Chung');

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem(PHOTOS_CACHE_KEY);
    }
    return true;
  });

  useEffect(() => { 
    fetchPhotos(); 
    fetchAlbums();
  }, []);

  const handleShare = async (id: string, type: 'photo' | 'doc') => {
    const toastId = toast.loading("Đang tạo liên kết chia sẻ...");
    try {
      const shareId = await createShareLink(type, id);
      const url = `${window.location.origin}/share/${shareId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link chia sẻ vào khay nhớ tạm!", { id: toastId });
    } catch (e: any) {
      toast.error("Lỗi: " + e.message, { id: toastId });
    }
  };

  const fetchPhotos = async () => {
    try {
      const data = await getPhotos();
      setPhotos(data || []);
      try {
        localStorage.setItem(PHOTOS_CACHE_KEY, JSON.stringify(data || []));
      } catch {}
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      const data = await getAlbums();
      setAlbums(data || []);
      try {
        localStorage.setItem(ALBUMS_CACHE_KEY, JSON.stringify(data || []));
      } catch {}
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

  const handleDelete = async (id: string, path: string, publicUrl?: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bức ảnh này vĩnh viễn?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('photos', id, path);
      toast.success("Đã xóa ảnh!", { id: loadingToast });
      fetchPhotos();
      if (selectedPhoto === path || (publicUrl && selectedPhoto === publicUrl)) setSelectedPhoto(null);
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  const handleMovePhoto = async () => {
    if (!movingPhoto) return;
    const loadingToast = toast.loading("Đang chuyển...");
    try {
      await movePhotoToAlbum(movingPhoto.id, targetAlbumMove);
      toast.success("Chuyển thành công!", { id: loadingToast });
      setMovingPhoto(null);
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: loadingToast });
    }
  };

  const handleAlbumClick = (name: string) => {
    setActiveAlbum(name);
    if (name !== 'Tất cả') {
      setUploadAlbum(name);
    } else {
      setUploadAlbum('Chung');
    }
    // Khi đổi album, hủy các ảnh đã chọn ngoài tầm hiển thị
    setSelectedPhotoIds([]);
  };

  const filteredPhotos = activeAlbum === 'Tất cả' 
    ? photos 
    : photos.filter(p => (p.album || 'Chung') === activeAlbum);

  const allAlbumNames = ['Chung', ...albums.map(a => a.name)];

  // Thao tác Multi-Select
  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(filteredPhotos.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh để xóa!");
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedPhotoIds.length} bức ảnh đã chọn? Thao tác này không thể hoàn tác!`)) {
      return;
    }

    const loadingToast = toast.loading(`Đang xóa ${selectedPhotoIds.length} ảnh...`);
    try {
      const photosToDelete = photos
        .filter(p => selectedPhotoIds.includes(p.id))
        .map(p => ({ id: p.id, url: p.url }));

      await deletePhotosBulk(photosToDelete);
      toast.success(`Đã xóa thành công ${selectedPhotoIds.length} bức ảnh!`, { id: loadingToast });
      setSelectedPhotoIds([]);
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi xóa hàng loạt: " + error.message, { id: loadingToast });
    }
  };

  const handleConfirmBulkMove = async () => {
    if (selectedPhotoIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 ảnh để chuyển!");
      return;
    }

    const loadingToast = toast.loading(`Đang chuyển ${selectedPhotoIds.length} ảnh sang "${targetBulkAlbumMove}"...`);
    try {
      await movePhotosBulk(selectedPhotoIds, targetBulkAlbumMove);
      toast.success(`Đã chuyển ${selectedPhotoIds.length} ảnh sang album "${targetBulkAlbumMove}"!`, { id: loadingToast });
      setIsBulkMoving(false);
      setSelectedPhotoIds([]);
      fetchPhotos();
    } catch (error: any) {
      toast.error("Lỗi chuyển hàng loạt: " + error.message, { id: loadingToast });
    }
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in flex flex-col h-full relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Kỷ niệm</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Những khoảnh khắc đáng nhớ của bạn</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          {/* Nút bật/tắt chế độ Chọn nhiều */}
          <button
            onClick={() => {
              const next = !isMultiSelect;
              setIsMultiSelect(next);
              if (!next) setSelectedPhotoIds([]);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 border cursor-pointer active:scale-95 ${
              isMultiSelect 
                ? "bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-600/30" 
                : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
            }`}
          >
            <CheckSquare size={17} />
            <span>{isMultiSelect ? `Thoát chọn (${selectedPhotoIds.length})` : "Chọn nhiều"}</span>
          </button>

          <select 
            value={uploadAlbum} 
            onChange={(e) => setUploadAlbum(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-200 font-bold text-sm rounded-xl py-2.5 px-4 outline-none cursor-pointer focus:ring-2 focus:ring-pink-100 dark:focus:ring-pink-900 min-w-[120px]"
          >
            {allAlbumNames.map(album => (
              <option key={album} value={album}>{album}</option>
            ))}
          </select>

          <label className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-pink-500/30 cursor-pointer flex items-center gap-2 active:scale-95">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2"><Upload size={18} /> Đang tải...</span>
            ) : (
              <><ImagePlus size={18} /> Đăng ảnh</>
            )}
            <input type="file" multiple className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start h-full pb-20">
        {/* Sidebar Album */}
        <div className="w-full md:w-64 flex flex-col gap-2 bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 shrink-0 md:sticky md:top-6">
          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2">Thư viện ảnh</h3>
          
          <button
            onClick={() => handleAlbumClick('Tất cả')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeAlbum === 'Tất cả' 
                ? "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
            }`}
          >
            <Images size={18} className={activeAlbum === 'Tất cả' ? "text-pink-500" : "text-slate-400"} />
            Tất cả ảnh
            <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-300 py-0.5 px-2 rounded-full text-xs">{photos.length}</span>
          </button>

          <button
            onClick={() => handleAlbumClick('Chung')}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm ${
              activeAlbum === 'Chung' 
                ? "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 shadow-sm" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
            }`}
          >
            <FolderOpen size={18} className={activeAlbum === 'Chung' ? "text-pink-500" : "text-slate-400"} />
            Chưa phân loại
            <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-300 py-0.5 px-2 rounded-full text-xs">{photos.filter(p => (p.album || 'Chung') === 'Chung').length}</span>
          </button>

          <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2 mt-4">Album của bạn</h3>
          
          {albums.map(album => (
            <div key={album.id} className="group relative">
              <button
                onClick={() => handleAlbumClick(album.name)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold text-sm w-full text-left ${
                  activeAlbum === album.name 
                    ? "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent"
                }`}
              >
                <FolderHeart size={18} className={activeAlbum === album.name ? "text-pink-500" : "text-slate-400"} />
                <span className="truncate max-w-[120px]">{album.name}</span>
                <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-300 py-0.5 px-2 rounded-full text-xs group-hover:opacity-0 transition-opacity">
                  {photos.filter(p => p.album === album.name).length}
                </span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id, album.name); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all bg-white dark:bg-slate-800 shadow-sm"
                title="Xóa album"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {isAddingAlbum ? (
            <form onSubmit={handleAddAlbum} className="mt-2 p-2 bg-pink-50/50 dark:bg-pink-950/20 rounded-2xl border border-pink-100 dark:border-pink-900/40 flex items-center">
              <input
                autoFocus
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="Tên album..."
                className="w-full bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none px-2"
              />
              <button type="button" onClick={() => setIsAddingAlbum(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={16} /></button>
              <button type="submit" className="p-1 text-pink-500 hover:text-pink-600 font-bold ml-1">OK</button>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingAlbum(true)}
              className="flex items-center gap-2 px-4 py-3 mt-2 rounded-2xl transition-all font-bold text-sm text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 border border-dashed border-pink-200 dark:border-pink-800/60 cursor-pointer"
            >
              <FolderHeart size={18} />
              Tạo Album
            </button>
          )}
        </div>

        {/* Lưới ảnh */}
        <div className="flex-1 w-full bg-transparent">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1,2,3,4,5,6,7,8,9,10].map(i => (
                <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-pink-50 dark:bg-pink-950/40 rounded-[2rem] flex items-center justify-center text-pink-400 dark:text-pink-500 mb-4 rotate-3">
                <ImageIcon size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Chưa có bức ảnh nào</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Hãy lưu giữ khoảnh khắc đầu tiên vào album này nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedPhotoIds.includes(photo.id);
                return (
                  <div 
                    key={photo.id} 
                    onClick={() => {
                      if (isMultiSelect) {
                        toggleSelectPhoto(photo.id);
                      }
                    }}
                    className={`group relative aspect-square bg-slate-200 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all select-none ${
                      isMultiSelect ? "cursor-pointer" : "hover:shadow-xl hover:-translate-y-1"
                    } ${
                      isSelected 
                        ? "ring-4 ring-pink-500 scale-[0.97] shadow-lg shadow-pink-500/20" 
                        : isMultiSelect ? "hover:scale-[0.99] opacity-90 hover:opacity-100" : ""
                    }`}
                  >
                    <img 
                      src={photo.publicUrl} 
                      alt={photo.title} 
                      className={`w-full h-full object-cover transition-transform duration-500 ${!isMultiSelect ? "group-hover:scale-110" : ""}`} 
                      loading="lazy" 
                    />
                    
                    {/* Checkbox đánh dấu khi ở Chế độ Chọn nhiều */}
                    {isMultiSelect && (
                      <div className="absolute top-3 right-3 z-20">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-md ${
                          isSelected 
                            ? "bg-pink-500 text-white ring-2 ring-white scale-110" 
                            : "bg-black/40 hover:bg-black/60 text-transparent border-2 border-white/80 backdrop-blur-sm"
                        }`}>
                          <Check size={16} className={isSelected ? "opacity-100 stroke-[3]" : "opacity-0"} />
                        </div>
                      </div>
                    )}

                    {/* Lớp phủ hành động cá nhân khi KHÔNG ở chế độ Chọn nhiều */}
                    {!isMultiSelect && (
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 sm:p-4">
                        <p className="text-white text-xs font-bold truncate mb-3 drop-shadow-md">{photo.title}</p>
                        <div className="flex justify-between items-center gap-1.5">
                          <button onClick={() => setSelectedPhoto(photo.publicUrl)} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-xl text-white transition-colors flex-1 flex justify-center cursor-pointer" title="Phóng to">
                            <Maximize2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleShare(photo.id, 'photo')} 
                            className="p-2 bg-purple-500/80 hover:bg-purple-500 backdrop-blur-md rounded-xl text-white transition-colors flex-1 flex justify-center cursor-pointer" 
                            title="Chia sẻ"
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={() => { setTargetAlbumMove(photo.album || 'Chung'); setMovingPhoto(photo); }} 
                            className="p-2 bg-blue-500/80 hover:bg-blue-500 backdrop-blur-md rounded-xl text-white transition-colors flex-1 flex justify-center cursor-pointer" 
                            title="Chuyển album"
                          >
                            <FolderInput size={16} />
                          </button>
                          <button onClick={() => handleDelete(photo.id, photo.url, photo.publicUrl)} className="p-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md rounded-xl text-white transition-colors flex-1 flex justify-center cursor-pointer" title="Xóa ảnh">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* THANH CÔNG CỤ HÀNG LOẠT (BULK ACTIONS TOOLBAR) */}
      {isMultiSelect && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700/80">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-300">
              Đã chọn <strong className="text-pink-400 font-extrabold text-sm">{selectedPhotoIds.length}</strong> / {filteredPhotos.length} ảnh
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSelectAllToggle}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
            >
              {selectedPhotoIds.length === filteredPhotos.length && filteredPhotos.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>

            <button
              onClick={() => {
                if (selectedPhotoIds.length === 0) {
                  toast.error("Vui lòng chọn ít nhất 1 ảnh!");
                  return;
                }
                setIsBulkMoving(true);
              }}
              disabled={selectedPhotoIds.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <FolderInput size={15} />
              <span>Chuyển {selectedPhotoIds.length > 0 ? `${selectedPhotoIds.length} ảnh` : ''} sang Album...</span>
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={selectedPhotoIds.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs text-white shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Xóa {selectedPhotoIds.length > 0 ? `${selectedPhotoIds.length} ảnh` : ''} đã chọn</span>
            </button>

            <button
              onClick={() => {
                setIsMultiSelect(false);
                setSelectedPhotoIds([]);
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Thoát chế độ chọn"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Chuyển Hàng Loạt Ảnh Sang Album Khác */}
      {isBulkMoving && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 scale-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/40">
              <FolderInput size={28} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">Chuyển {selectedPhotoIds.length} ảnh</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6">Chọn album đích để chuyển các bức ảnh đã chọn:</p>
            
            <select 
              value={targetBulkAlbumMove}
              onChange={e => setTargetBulkAlbumMove(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl py-3 px-4 outline-none mb-6 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            >
              {allAlbumNames.map(album => (
                <option key={album} value={album}>{album}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsBulkMoving(false)} 
                className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleConfirmBulkMove} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-colors active:scale-95 cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chuyển 1 Ảnh */}
      {movingPhoto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 scale-100 animate-in zoom-in-95">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800/40">
              <FolderInput size={28} />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">Chuyển ảnh</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6 truncate">Chuyển "{movingPhoto.title}" sang album:</p>
            
            <select 
              value={targetAlbumMove}
              onChange={e => setTargetAlbumMove(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl py-3 px-4 outline-none mb-6 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
            >
              {allAlbumNames.map(album => (
                <option key={album} value={album}>{album}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button onClick={() => setMovingPhoto(null)} className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer">Hủy bỏ</button>
              <button onClick={handleMovePhoto} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-colors cursor-pointer active:scale-95">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Phóng to ảnh */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in duration-200">
          <button onClick={() => setSelectedPhoto(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors border border-white/10 cursor-pointer">
            <X size={24} />
          </button>
          <img src={selectedPhoto} alt="Phóng to" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
