"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Trash2,
  Play,
  Pause,
  Music as MusicIcon,
  Disc,
  Link as LinkIcon,
  SkipBack,
  SkipForward,
  Headphones,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { getSongs, getUploadUrl, addRecord, deleteRecord } from "@/app/actions/data";
import { useMusic, SongItem } from "@/context/MusicContext";
import { detectMusicPlatform } from "@/lib/musicPlatforms";
import { PlatformBadge } from "@/components/music/PlatformBadge";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

const SONGS_CACHE_KEY = 'myspace_songs_cache_v2';

function getStoredSongs(): SongItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('myspace_songs_cache_v2')
      || localStorage.getItem('myspace_songs_cache_v1')
      || sessionStorage.getItem('myspace_songs_cache_v1');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export default function MusicPage() {
  const [songs, setSongs] = useState<SongItem[]>(getStoredSongs);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(() => getStoredSongs().length === 0);

  // Trạng thái cho form thêm link nhạc
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Tận dụng Context toàn cục
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    playSong,
    togglePlay,
    nextSong,
    prevSong,
    seekTo,
    closePlayer,
    setPlaylist,
  } = useMusic();

  const heroPlatform = currentSong?.isLink ? detectMusicPlatform(currentSong.publicUrl) : null;

  const fetchSongs = async () => {
    try {
      const data = await getSongs();
      const songItems: SongItem[] = (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        publicUrl: item.publicUrl,
        isLink: item.isLink,
        url: item.url,
        created_at: item.created_at,
      }));
      setSongs(songItems);
      // Đồng bộ vào playlist toàn cục nếu chưa có playlist
      setPlaylist(songItems);
      try {
        localStorage.setItem(SONGS_CACHE_KEY, JSON.stringify(songItems));
      } catch {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Không thể tải danh sách bài hát";
      console.error("[MusicPage] Lỗi tải bài hát:", e);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Khôi phục cache tức thì trong 0ms khi client mount
    const stored = getStoredSongs();
    if (stored.length > 0) {
      setSongs(stored);
      setPlaylist(stored);
      setIsLoading(false);
    }
    fetchSongs();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const loadingToast = toast.loading("Đang tải bài hát an toàn...");

    try {
      const fileName = `music/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      // --- AI Phân loại thể loại bài hát ---
      let aiGenre = "";
      try {
        toast.loading("AI đang phân tích thể loại bài hát...", { id: loadingToast });
        const { guessMusicGenre } = await import("@/app/actions/ai");
        const resAi = await guessMusicGenre(file.name);
        if (resAi.success && resAi.data && resAi.data.length < 25) {
          aiGenre = resAi.data;
        }
      } catch (aiErr) {
        console.warn("[Music] AI đoán thể loại bài hát không thành công:", aiErr);
      }

      const { signedUrl, fullPath } = await getUploadUrl(fileName);
      const res = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "audio/mpeg" },
      });
      if (!res.ok) throw new Error("Tải file lên bộ lưu trữ không thành công");

      const finalTitle = aiGenre ? `[${aiGenre}] ${file.name}` : file.name;
      await addRecord("songs", { title: finalTitle, url: fullPath });

      toast.success(
        aiGenre ? `Đã thêm bài hát! Thể loại: ${aiGenre}` : "Thêm bài hát thành công!",
        { id: loadingToast }
      );
      await fetchSongs();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi không xác định khi tải lên";
      console.error("[MusicPage] Lỗi tải lên:", error);
      toast.error("Lỗi tải lên: " + msg, { id: loadingToast });
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    let finalUrl = linkUrl.trim();
    if (!finalUrl.startsWith("http")) {
      finalUrl = "https://" + finalUrl;
    }

    const loadingToast = toast.loading("Đang nhận diện & lưu đường dẫn nhạc...");
    try {
      const platformInfo = detectMusicPlatform(finalUrl);
      const defaultTitle = `${platformInfo.name} Track`;
      const baseTitle = linkTitle.trim() || defaultTitle;
      let aiGenre = "";
      try {
        toast.loading("AI đang phân tích thể loại...", { id: loadingToast });
        const { guessMusicGenre } = await import("@/app/actions/ai");
        const resAi = await guessMusicGenre(baseTitle + " " + finalUrl);
        if (resAi.success && resAi.data && resAi.data.length < 25) {
          aiGenre = resAi.data;
        }
      } catch (aiErr) {
        console.warn("[Music] AI đoán thể loại link không thành công:", aiErr);
      }

      const finalTitle = aiGenre ? `[${aiGenre}] ${baseTitle}` : baseTitle;

      await addRecord("songs", {
        title: finalTitle,
        url: finalUrl,
      });

      toast.success(
        aiGenre
          ? `Đã lưu [${platformInfo.name}]! Thể loại: ${aiGenre}`
          : `Đã thêm nhạc từ ${platformInfo.name}!`,
        { id: loadingToast }
      );
      setLinkTitle("");
      setLinkUrl("");
      setIsAddingLink(false);
      await fetchSongs();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi khi lưu link";
      console.error("[MusicPage] Lỗi lưu link nhạc:", error);
      toast.error("Lỗi khi lưu: " + msg, { id: loadingToast });
    }
  };

  const handleDelete = async (id: string | number, path: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn xóa bài hát này khỏi danh sách?")) return;

    const loadingToast = toast.loading("Đang xóa...");
    try {
      await deleteRecord("songs", String(id), path || "");
      toast.success("Đã xóa bài hát", { id: loadingToast });

      if (currentSong?.id === id) {
        closePlayer();
      }
      await fetchSongs();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Lỗi khi xóa";
      console.error("[MusicPage] Lỗi xóa bài hát:", error);
      toast.error("Lỗi khi xóa: " + msg, { id: loadingToast });
    }
  };

  const handleSelectSong = (song: SongItem) => {
    if (currentSong?.id === song.id) {
      togglePlay();
    } else {
      playSong(song, songs);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-300 flex flex-col h-full">
      {/* Tiêu đề & Nút hành động */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Headphones size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                Giai điệu & Âm nhạc
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Phát liên tục xuyên suốt mọi trang • Tự động chuyển bài (Auto-next)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <LinkIcon size={17} className="text-purple-600 dark:text-purple-400" /> Thêm link nhạc
          </button>

          <label className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-purple-600/20 hover:shadow-purple-600/30 cursor-pointer flex items-center gap-2">
            {uploading ? (
              <span className="animate-pulse flex items-center gap-2">
                <Upload size={16} /> Đang tải lên...
              </span>
            ) : (
              <>
                <Upload size={16} /> Tải file MP3
              </>
            )}
            <input
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Form thêm link nhạc đa nền tảng */}
      {isAddingLink && (
        <div className="bg-purple-50/60 dark:bg-slate-800/80 border border-purple-200/70 dark:border-slate-700 p-4 rounded-2xl mb-8 flex flex-col gap-3 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-purple-100 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-100 dark:bg-purple-950/60 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <LinkIcon size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Hỗ trợ: YouTube, Spotify, SoundCloud, Zing MP3, Apple Music, link MP3 trực tiếp
              </span>
            </div>
            {linkUrl.trim() && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Nền tảng:</span>
                <PlatformBadge url={linkUrl.trim()} isLink={true} />
              </div>
            )}
          </div>

          <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-3 w-full">
            <input
              type="text"
              placeholder="Tên bài hát / Tiêu đề (Tùy chọn - tự sinh theo nguồn)"
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
            />
            <input
              type="text"
              placeholder="Dán link bài hát (YouTube, Spotify, SoundCloud, Zing MP3, Apple Music, MP3...)"
              required
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="flex-[2] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setIsAddingLink(false)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid: Danh sách bài hát & Trình phát chi tiết */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Danh sách bài hát */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/70 dark:border-slate-800 overflow-hidden h-fit">
          <div className="p-5 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MusicIcon size={18} className="text-purple-600 dark:text-purple-400" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm md:text-base">
                Danh sách phát ({songs.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Bấm vào bài để phát toàn cục</span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse w-full"
                  />
                ))}
              </div>
            ) : songs.length === 0 ? (
              <li className="p-10 text-center text-slate-400 dark:text-slate-500 font-medium text-sm">
                Chưa có bài hát nào! Hãy tải lên file MP3 hoặc dán link nhạc (YouTube, Spotify, SoundCloud, Zing MP3...) để thưởng thức.
              </li>
            ) : (
              songs.map((song, idx) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <li
                    key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors group ${
                      isCurrent
                        ? "bg-purple-50/80 dark:bg-purple-950/40"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div
                        className={`w-11 h-11 flex-shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 shadow-2xs"
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <Disc size={20} className="animate-spin" style={{ animationDuration: "3s" }} />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div className="truncate">
                        <h4
                          className={`font-bold truncate text-sm md:text-base leading-snug ${
                            isCurrent
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {song.title.replace(/\.[^/.]+$/, "")}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <PlatformBadge url={song.publicUrl} isLink={song.isLink} />
                          {song.created_at && (
                            <span className="text-[11px] text-slate-400">
                              {new Date(song.created_at).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent && (
                        <span className="text-purple-600 dark:text-purple-400 w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full shadow-2xs">
                          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                        </span>
                      )}

                      {song.isLink && !isCurrent && (
                        <span className="text-slate-400 w-8 h-8 flex items-center justify-center opacity-60">
                          <LinkIcon size={14} />
                        </span>
                      )}

                      <button
                        onClick={(e) => handleDelete(song.id, song.url, e)}
                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100 opacity-100 cursor-pointer"
                        title="Xóa bài hát"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Cột phải: Trình phát đĩa Vinyl Hero */}
        <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden text-white flex flex-col h-fit md:sticky md:top-6 border border-slate-800">
          <div
            className={`h-48 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 ${
              heroPlatform
                ? heroPlatform.type === "youtube"
                  ? "bg-gradient-to-tr from-red-600 to-rose-500"
                  : heroPlatform.type === "spotify"
                  ? "bg-gradient-to-tr from-emerald-600 to-teal-500"
                  : heroPlatform.type === "soundcloud"
                  ? "bg-gradient-to-tr from-orange-600 to-amber-500"
                  : heroPlatform.type === "applemusic"
                  ? "bg-gradient-to-tr from-rose-600 to-pink-500"
                  : heroPlatform.type === "zingmp3"
                  ? "bg-gradient-to-tr from-purple-700 to-indigo-600"
                  : "bg-gradient-to-tr from-slate-700 to-slate-800"
                : "bg-gradient-to-br from-purple-700 via-indigo-600 to-blue-700"
            }`}
          >
            <div
              className={`absolute inset-0 bg-black/20 transition-opacity ${
                isPlaying ? "opacity-0" : "opacity-100"
              }`}
            />
            <Disc
              size={84}
              className={`text-white/80 drop-shadow-2xl ${
                isPlaying ? "animate-spin" : ""
              }`}
              style={{ animationDuration: "4s" }}
            />
          </div>

          <div className="p-6 md:p-8 flex flex-col items-center text-center">
            <h3 className="font-extrabold text-lg md:text-xl mb-1 truncate w-full leading-tight">
              {currentSong ? currentSong.title.replace(/\.[^/.]+$/, "") : "Chưa chọn bài"}
            </h3>
            <p className="text-xs mb-5 font-bold uppercase tracking-wider text-purple-300">
              {currentSong
                ? heroPlatform
                  ? `${heroPlatform.name} Track`
                  : isPlaying
                  ? "Đang phát liên tục"
                  : "Tạm dừng"
                : "Sẵn sàng phát nhạc"}
            </p>

            {currentSong ? (
              currentSong.isLink ? (
                // Nếu là link ngoài: Nhúng iframe player tương ứng với nền tảng
                heroPlatform?.embedUrl ? (
                  <div className="w-full rounded-2xl overflow-hidden bg-slate-950 mt-2 border border-slate-700 shadow-inner">
                    {heroPlatform.type === "youtube" && (
                      <iframe
                        width="100%"
                        height="180"
                        src={heroPlatform.embedUrl}
                        title="YouTube player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full border-none"
                      />
                    )}
                    {heroPlatform.type === "spotify" && (
                      <iframe
                        src={heroPlatform.embedUrl}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                        className="w-full border-none"
                      />
                    )}
                    {heroPlatform.type === "soundcloud" && (
                      <iframe
                        width="100%"
                        height="166"
                        scrolling="no"
                        frameBorder="no"
                        allow="autoplay"
                        src={heroPlatform.embedUrl}
                        className="w-full border-none"
                      />
                    )}
                    {heroPlatform.type === "applemusic" && (
                      <iframe
                        allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
                        frameBorder="0"
                        height="175"
                        style={{ width: "100%", overflow: "hidden", borderRadius: "12px" }}
                        src={heroPlatform.embedUrl}
                        className="w-full border-none"
                      />
                    )}
                    {heroPlatform.type === "zingmp3" && (
                      <iframe
                        src={heroPlatform.embedUrl}
                        width="100%"
                        height="120"
                        frameBorder="0"
                        allowFullScreen
                        className="w-full border-none"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-full p-4 rounded-2xl bg-slate-800/80 text-center text-xs text-slate-300 mt-2 border border-slate-700">
                    <p className="font-semibold mb-2">{heroPlatform?.name || "Nguồn ngoài"}</p>
                    <a
                      href={currentSong.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700"
                    >
                      Mở nghe trực tiếp <ExternalLink size={12} />
                    </a>
                  </div>
                )
              ) : (
                // Nếu là file Audio thường: Trình phát đồng bộ với Global Player
                <div className="w-full flex flex-col items-center gap-4 mt-2">
                  {/* Seek Bar */}
                  <div className="w-full flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                      aria-label="Thanh tiến trình"
                    />
                    <span className="text-[11px] font-mono text-slate-400 w-8 text-left">
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Nút điều khiển */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={prevSong}
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                      title="Bài trước đó"
                    >
                      <SkipBack size={18} />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                      aria-label={isPlaying ? "Tạm dừng" : "Phát"}
                    >
                      {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                    </button>

                    <button
                      onClick={nextSong}
                      className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                      title="Bài kế tiếp"
                    >
                      <SkipForward size={18} />
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="w-full bg-slate-800/80 border border-slate-700/60 h-12 rounded-2xl flex items-center justify-center text-xs font-semibold text-slate-400 mt-2">
                Bấm vào một bài hát trong danh sách để phát
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
