"use client";
import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Play, Pause, Music as MusicIcon, Disc } from "lucide-react";
import toast from "react-hot-toast";
import { getSongs, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";

export default function MusicPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { fetchSongs(); }, []);

  const fetchSongs = async () => {
    const data = await getSongs();
    setSongs(data);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const loadingToast = toast.loading("Đang tải bài hát an toàn...");
    
    try {
      const fileName = `music/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      const signedUploadUrl = await getUploadUrl(fileName);
      const res = await fetch(signedUploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'audio/mpeg' }
      });
      if (!res.ok) throw new Error("Upload bị chặn");

      await addRecord('songs', { title: file.name, url: fileName });

      toast.success("Thêm bài hát thành công!", { id: loadingToast });
      fetchSongs();
    } catch (error: any) {
      toast.error("Lỗi tải lên: " + error.message, { id: loadingToast });
    } finally {
      setUploading(false);
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
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      setTimeout(() => {
        if (audioRef.current) audioRef.current.play();
      }, 100);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Góc Nghe Nhạc</h1>
          <p className="text-slate-500 mt-1">Bảo vệ riêng tư 100%</p>
        </div>
        <label className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2">
          {uploading ? <span className="animate-pulse">Đang xử lý...</span> : <><Upload size={18} /> Thêm bài hát</>}
          <input type="file" className="hidden" accept="audio/*" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden h-fit">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
            <MusicIcon size={20} className="text-purple-500" />
            <h3 className="font-semibold text-slate-700">Danh sách phát ({songs.length})</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {songs.length === 0 ? (
              <li className="p-8 text-center text-slate-500 italic">Chưa có bài hát nào!</li>
            ) : songs.map((song, idx) => (
              <li 
                key={song.id} 
                onClick={() => playSong(song)}
                className={`p-4 flex items-center justify-between hover:bg-purple-50/50 cursor-pointer transition-colors group ${currentSong?.id === song.id ? 'bg-purple-50' : ''}`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold transition-colors ${currentSong?.id === song.id ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                    {currentSong?.id === song.id && isPlaying ? <Disc size={20} className="animate-spin-slow" /> : (idx + 1)}
                  </div>
                  <div className="truncate">
                    <h4 className={`font-semibold truncate text-base ${currentSong?.id === song.id ? 'text-purple-700' : 'text-slate-800'}`}>
                      {song.title.replace(/\.[^/.]+$/, "")}
                    </h4>
                    <p className="text-sm text-slate-400">Audio track</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSong?.id === song.id && (
                    <span className="text-purple-600 w-8 h-8 flex items-center justify-center">
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </span>
                  )}
                  <button 
                    onClick={(e) => handleDelete(song.id, song.url, e)}
                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden text-white flex flex-col h-fit sticky top-6">
          <div className="h-56 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 flex flex-col items-center justify-center relative overflow-hidden">
            <div className={`absolute inset-0 bg-black/20 transition-opacity ${isPlaying ? 'opacity-0' : 'opacity-100'}`}></div>
            <Disc size={80} className={`text-white/80 drop-shadow-xl ${isPlaying ? 'animate-spin-slow' : ''}`} style={{ animationDuration: '4s' }} />
          </div>
          <div className="p-8">
            <h3 className="font-bold text-xl mb-1 truncate text-center">{currentSong ? currentSong.title.replace(/\.[^/.]+$/, "") : 'Chưa chọn bài'}</h3>
            <p className="text-purple-300 text-sm mb-6 text-center font-medium">{currentSong ? 'Now Playing (Secure)' : 'Sẵn sàng'}</p>
            
            {currentSong ? (
              <audio 
                ref={audioRef}
                src={currentSong.publicUrl} 
                controls 
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-10 accent-purple-500 outline-none"
              />
            ) : (
              <div className="w-full bg-slate-800 h-10 rounded-full flex items-center justify-center text-sm text-slate-500">
                Hãy chọn 1 bài hát
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
