"use client";
import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Play, Pause, Music as MusicIcon, Disc, Link as LinkIcon, Cloud } from "lucide-react";
import toast from "react-hot-toast";
import { getSongs, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";

export default function MusicPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Trạng thái cho Thêm SoundCloud
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchSongs(); }, []);

  const fetchSongs = async () => {
    setIsLoading(true);
    try {
      const data = await getSongs();
      setSongs(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const loadingToast = toast.loading("Đang tải bài hát an toàn...");
    
    try {
      const fileName = `music/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // --- AI Phân loại Thể loại nhạc ---
      let aiGenre = '';
      try {
        toast.loading("AI đang phân tích thể loại bài hát...", { id: loadingToast });
        const { guessMusicGenre } = await import('@/app/actions/ai');
        const guessed = await guessMusicGenre(file.name);
        if (guessed && guessed.length < 20) aiGenre = guessed;
      } catch (aiErr) {
        console.error(aiErr);
      }
      
      const { signedUrl, fullPath } = await getUploadUrl(fileName);
      const res = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'audio/mpeg' }
      });
      if (!res.ok) throw new Error("Upload bị chặn");

      const finalTitle = aiGenre ? `[${aiGenre}] ${file.name}` : file.name;
      await addRecord('songs', { title: finalTitle, url: fullPath });

      toast.success(aiGenre ? `Đã thêm bài hát! AI đoán thể loại: ${aiGenre}` : "Thêm bài hát thành công!", { id: loadingToast });
      fetchSongs();
    } catch (error: any) {
      toast.error("Lỗi tải lên: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith('http')) {
      finalUrl = 'https://' + finalUrl;
    }

    const loadingToast = toast.loading("Đang lưu đường dẫn nhạc...");
    try {
      let aiGenre = '';
      const baseTitle = linkTitle.trim() || 'SoundCloud Track';
      try {
        toast.loading("AI đang phân tích thể loại...", { id: loadingToast });
        const { guessMusicGenre } = await import('@/app/actions/ai');
        const guessed = await guessMusicGenre(baseTitle + " " + finalUrl);
        if (guessed && guessed.length < 20) aiGenre = guessed;
      } catch (aiErr) {
        console.error(aiErr);
      }

      const finalTitle = aiGenre ? `[${aiGenre}] ${baseTitle}` : baseTitle;

      await addRecord('songs', { 
        title: finalTitle, 
        url: finalUrl 
      });

      toast.success(aiGenre ? `Đã lưu! AI đoán thể loại: ${aiGenre}` : "Đã thêm nhạc ngoài!", { id: loadingToast });
      setLinkTitle('');
      setLinkUrl('');
      setIsAddingLink(false);
      fetchSongs();
    } catch (error: any) {
      toast.error("Lỗi khi lưu: " + error.message, { id: loadingToast });
    }
  };

  const handleDelete = async (id: string, path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có muốn xóa bài hát này?")) return;
    
    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord('songs', id, path);
      toast.success("Đã xóa bài hát", { id: loadingToast });
      if (currentSong?.id === id) {
        setCurrentSong(null);
        setIsPlaying(false);
      }
      fetchSongs();
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message, { id: loadingToast });
    }
  };

  const playSong = (song: any) => {
    if (currentSong?.id === song.id) {
      if (song.isLink) return; // Không cần bật/tắt vì Iframe của SoundCloud tự quản lý play/pause
      
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      if (!song.isLink) {
        setTimeout(() => {
          if (audioRef.current) audioRef.current.play();
        }, 100);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Giai điệu</h1>
          <p className="text-slate-500 mt-1 font-medium">Bảo vệ riêng tư 100%</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Cloud size={18} className="text-orange-500" /> SoundCloud
          </button>
          
          <label className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center justify-center gap-2">
            {uploading ? <span className="animate-pulse flex items-center gap-2"><Upload size={18} /> Đang xử lý...</span> : <><Upload size={18} /> Thêm bài hát</>}
            <input type="file" className="hidden" accept="audio/*" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      {isAddingLink && (
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl mb-8 flex flex-col sm:flex-row gap-3 items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-500 shrink-0 shadow-sm border border-orange-100">
            <Cloud size={18} />
          </div>
          <form onSubmit={handleAddLink} className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <input 
              type="text" 
              placeholder="Tên bài hát / Playlist (Tùy chọn)" 
              value={linkTitle}
              onChange={e => setLinkTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-200 text-sm font-medium"
            />
            <input 
              type="text" 
              placeholder="Dán link SoundCloud (https://soundcloud.com/...)" 
              required
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="flex-[2] px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-200 text-sm font-medium"
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm">Lưu</button>
              <button type="button" onClick={() => setIsAddingLink(false)} className="bg-white hover:bg-slate-100 text-slate-500 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 transition-all">Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách nhạc */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-fit">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <MusicIcon size={20} className="text-purple-500" />
            <h3 className="font-extrabold text-slate-700">Danh sách phát ({songs.length})</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {isLoading ? (
              <div className="p-4 flex flex-col gap-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse w-full"></div>
                ))}
              </div>
            ) : songs.length === 0 ? (
              <li className="p-8 text-center text-slate-500 font-medium">Chưa có bài hát nào! Hãy tải lên hoặc dán link SoundCloud.</li>
            ) : songs.map((song, idx) => (
              <li 
                key={song.id} 
                onClick={() => playSong(song)}
                className={`p-4 flex items-center justify-between hover:bg-purple-50/50 cursor-pointer transition-colors group ${currentSong?.id === song.id ? 'bg-purple-50' : ''}`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                    currentSong?.id === song.id 
                      ? (song.isLink ? 'bg-orange-500 text-white shadow-md shadow-orange-200' : 'bg-purple-600 text-white shadow-md shadow-purple-200') 
                      : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm'
                  }`}>
                    {currentSong?.id === song.id && isPlaying && !song.isLink ? (
                      <Disc size={20} className="animate-spin-slow" />
                    ) : song.isLink ? (
                      <Cloud size={20} />
                    ) : (
                      (idx + 1)
                    )}
                  </div>
                  <div className="truncate">
                    <h4 className={`font-extrabold truncate text-base ${
                      currentSong?.id === song.id 
                        ? (song.isLink ? 'text-orange-600' : 'text-purple-700') 
                        : 'text-slate-700'
                    }`}>
                      {song.title.replace(/\.[^/.]+$/, "")}
                    </h4>
                    <p className="text-sm font-medium text-slate-400">{song.isLink ? 'SoundCloud Track' : 'Audio Track'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSong?.id === song.id && !song.isLink && (
                    <span className="text-purple-600 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm">
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </span>
                  )}
                  {song.isLink && (
                    <span className="text-orange-500 w-8 h-8 flex items-center justify-center opacity-50">
                      <LinkIcon size={16} />
                    </span>
                  )}
                  <button 
                    onClick={(e) => handleDelete(song.id, song.url, e)}
                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Trình phát nhạc */}
        <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden text-white flex flex-col h-fit md:sticky md:top-6">
          <div className={`h-48 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${currentSong?.isLink ? 'bg-orange-600' : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700'}`}>
            <div className={`absolute inset-0 bg-black/20 transition-opacity ${isPlaying ? 'opacity-0' : 'opacity-100'}`}></div>
            {currentSong?.isLink ? (
              <Cloud size={80} className="text-white/80 drop-shadow-xl" />
            ) : (
              <Disc size={80} className={`text-white/80 drop-shadow-xl ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '4s' }} />
            )}
          </div>
          <div className="p-8">
            <h3 className="font-extrabold text-xl mb-1 truncate text-center leading-tight">
              {currentSong ? currentSong.title.replace(/\.[^/.]+$/, "") : 'Chưa chọn bài'}
            </h3>
            <p className={`text-sm mb-6 text-center font-bold uppercase tracking-widest ${currentSong?.isLink ? 'text-orange-300' : 'text-purple-300'}`}>
              {currentSong ? (currentSong.isLink ? 'SoundCloud Player' : 'Now Playing') : 'Sẵn sàng'}
            </p>
            
            {currentSong ? (
              currentSong.isLink ? (
                // Nếu là Link SoundCloud, nhúng Iframe của SoundCloud vào
                <div className="w-full rounded-xl overflow-hidden bg-white mt-4 border border-slate-700">
                  <iframe 
                    width="100%" 
                    height="166" 
                    scrolling="no" 
                    frameBorder="no" 
                    allow="autoplay"
                    src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(currentSong.publicUrl)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
                  ></iframe>
                </div>
              ) : (
                // Nếu là Audio thường
                <audio 
                  ref={audioRef}
                  src={currentSong.publicUrl} 
                  controls 
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-12 accent-purple-500 outline-none mt-4 rounded-full"
                />
              )
            ) : (
              <div className="w-full bg-slate-800 h-12 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 mt-4">
                Hãy chọn 1 bài hát
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
