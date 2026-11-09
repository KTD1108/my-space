"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronDown,
  ChevronUp,
  X,
  Disc,
  Cloud,
  ListMusic,
  ExternalLink,
  Music,
  Trash2,
  Plus,
} from "lucide-react";
import { useMusic, SongItem } from "@/context/MusicContext";

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function GlobalMusicPlayer() {
  const {
    currentSong,
    playlist,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffle,
    playSong,
    togglePlay,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    seekTo,
    closePlayer,
  } = useMusic();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [queueTab, setQueueTab] = useState<"queue" | "playlist">("queue");
  const [showSoundCloudWidget, setShowSoundCloudWidget] = useState(true);

  if (!currentSong) return null;

  const cleanTitle = currentSong.title.replace(/\.[^/.]+$/, "");

  // Render icon âm lượng theo mức
  const renderVolumeIcon = () => {
    if (isMuted || volume === 0) return <VolumeX size={17} />;
    if (volume < 0.5) return <Volume1 size={17} />;
    return <Volume2 size={17} />;
  };

  // Chế độ thu gọn (Mini Pill)
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-3 px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl max-w-[320px] sm:max-w-sm">
          <div
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer group"
            title="Bấm để mở rộng trình phát"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                currentSong.isLink
                  ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white"
                  : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
              }`}
            >
              {currentSong.isLink ? (
                <Cloud size={16} />
              ) : (
                <Disc
                  size={18}
                  className={isPlaying ? "animate-spin" : ""}
                  style={{ animationDuration: "3.5s" }}
                />
              )}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {cleanTitle}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                {currentSong.isLink ? "SoundCloud" : isPlaying ? "Đang phát..." : "Tạm dừng"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={playPrevious}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Bài trước"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
              aria-label={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
            </button>
            <button
              onClick={() => playNext()}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Bài tiếp theo"
            >
              <SkipForward size={14} />
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Mở rộng"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={closePlayer}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
              title="Đóng trình phát"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 inset-x-3 md:inset-x-6 max-w-5xl mx-auto z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Drawer: Danh sách hàng đợi & Playlist (Queue & Playlist Hub) */}
      {showQueue && (
        <div className="mb-2 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-2xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-bottom-2">
          {/* Header Drawer với 2 Tab: Hàng đợi (Queue) & Danh sách phát (Playlist) */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueueTab("queue")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  queueTab === "queue"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ListMusic size={13} />
                <span>Hàng đợi kế tiếp</span>
                {queue.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      queueTab === "queue"
                        ? "bg-white/20 text-white"
                        : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    {queue.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setQueueTab("playlist")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  queueTab === "playlist"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Music size={13} />
                <span>Danh sách phát ({playlist.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {queueTab === "queue" && queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-slate-400 hover:text-red-500 text-xs font-medium flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Xóa tất cả bài trong hàng đợi"
                >
                  <Trash2 size={12} />
                  <span>Xóa hết</span>
                </button>
              )}
              <button
                onClick={() => setShowQueue(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>

          {/* TAB 1: DANH SÁCH HÀNG ĐỢI (QUEUE) */}
          {queueTab === "queue" && (
            <div className="space-y-1">
              {queue.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <ListMusic size={24} className="mx-auto mb-1.5 opacity-40 text-purple-500" />
                  <p className="font-semibold text-slate-600 dark:text-slate-300">
                    Hàng đợi hiện đang trống
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Chuyển sang tab &quot;Danh sách phát&quot; và bấm dấu &quot;+&quot; để xếp bài hát muốn nghe tiếp theo vào đây!
                  </p>
                </div>
              ) : (
                queue.map((song: SongItem, idx: number) => {
                  const songName = song.title.replace(/\.[^/.]+$/, "");
                  return (
                    <div
                      key={`queue-${song.id}-${idx}`}
                      className="group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs bg-slate-50/70 dark:bg-slate-800/40 hover:bg-purple-50/80 dark:hover:bg-purple-950/40 transition-colors border border-transparent hover:border-purple-200/50 dark:hover:border-purple-800/50"
                    >
                      <div
                        onClick={() => {
                          removeFromQueue(idx);
                          playSong(song);
                        }}
                        className="flex items-center gap-2 truncate flex-1 cursor-pointer"
                        title="Bấm để phát bài này ngay"
                      >
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold w-5 text-right">
                          #{idx + 1}
                        </span>
                        <span className="truncate font-medium text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                          {songName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            removeFromQueue(idx);
                            playSong(song);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors cursor-pointer"
                          title="Phát ngay"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => removeFromQueue(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Xóa khỏi hàng đợi"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TOÀN BỘ DANH SÁCH PHÁT (PLAYLIST) */}
          {queueTab === "playlist" && (
            <div className="space-y-1">
              {playlist.map((song: SongItem, idx: number) => {
                const isCurrent = song.id === currentSong.id;
                const songName = song.title.replace(/\.[^/.]+$/, "");
                return (
                  <div
                    key={`playlist-${song.id}-${idx}`}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                      isCurrent
                        ? "bg-purple-100/70 text-purple-900 dark:bg-purple-950/50 dark:text-purple-200 font-bold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div
                      onClick={() => playSong(song)}
                      className="flex items-center gap-2 truncate flex-1 cursor-pointer"
                    >
                      <span className="text-[10px] font-mono text-slate-400 w-4 text-right">
                        {idx + 1}
                      </span>
                      <span className="truncate">{songName}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isCurrent ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-semibold">
                          Đang phát
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToQueue(song);
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Thêm vào hàng đợi phát kế tiếp"
                        >
                          <Plus size={11} />
                          <span>Hàng đợi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Glassmorphism Bar */}
      <div className="bg-white/85 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 rounded-2xl md:rounded-3xl p-3 md:px-5 md:py-3.5 transition-all">
        <div className="flex items-center justify-between gap-3 md:gap-6">
          {/* Cột 1: Thông tin bài hát & Đĩa quay */}
          <div className="flex items-center gap-3 min-w-0 max-w-[200px] sm:max-w-xs md:w-1/4">
            <div
              className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-white/20 transition-all ${
                currentSong.isLink
                  ? "bg-gradient-to-tr from-orange-500 to-amber-500 text-white shadow-orange-500/20"
                  : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-purple-600/20"
              }`}
            >
              {currentSong.isLink ? (
                <Cloud size={20} />
              ) : (
                <Disc
                  size={24}
                  className={isPlaying ? "animate-spin" : ""}
                  style={{ animationDuration: "4s" }}
                />
              )}
            </div>

            <div className="truncate">
              <h4 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-snug">
                {cleanTitle}
              </h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                {currentSong.isLink ? (
                  <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/70 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Cloud size={10} /> SoundCloud
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/70 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                    <Music size={10} /> Audio MP3
                  </span>
                )}
                {isPlaying && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cột 2: Cụm điều khiển chính & Seek Bar */}
          <div className="flex-1 max-w-xl flex flex-col items-center justify-center">
            {/* Hàng nút Controls */}
            <div className="flex items-center gap-3 md:gap-5">
              {/* Nút Shuffle (Trộn bài ngẫu nhiên) */}
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer hidden sm:block ${
                  isShuffle
                    ? "text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/50"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title={isShuffle ? "Trộn bài ngẫu nhiên: Đang BẬT" : "Trộn bài ngẫu nhiên: Đang TẮT"}
              >
                <Shuffle size={15} />
              </button>

              {/* Nút Quay lại bài trước */}
              <button
                onClick={playPrevious}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
                title="Bài trước đó"
              >
                <SkipBack size={18} />
              </button>

              {/* Nút Play / Pause */}
              <button
                onClick={togglePlay}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-all cursor-pointer ${
                  currentSong.isLink
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/30"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/30"
                }`}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>

              {/* Nút Chuyển bài kế tiếp */}
              <button
                onClick={() => playNext()}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
                title="Bài kế tiếp"
              >
                <SkipForward size={18} />
              </button>

              {/* Nút Repeat (Lặp lại: off -> all -> one -> off) */}
              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer hidden sm:block ${
                  repeatMode !== "off"
                    ? "text-purple-600 dark:text-purple-400 bg-purple-100/70 dark:bg-purple-950/50"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
                title={
                  repeatMode === "one"
                    ? "Lặp lại: 1 bài duy nhất (Nhấp để tắt)"
                    : repeatMode === "all"
                    ? "Lặp lại: Cả danh sách (Nhấp để lặp 1 bài)"
                    : "Lặp lại: Đang tắt (Nhấp để bật lặp danh sách)"
                }
              >
                {repeatMode === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
              </button>
            </div>

            {/* Thanh tiến trình (Seek bar) */}
            {!currentSong.isLink ? (
              <div className="w-full flex items-center gap-2 mt-1 px-2">
                <span className="text-[11px] font-mono text-slate-400 w-8 text-right shrink-0">
                  {formatTime(currentTime)}
                </span>
                <div className="flex-1 relative flex items-center group cursor-pointer">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-400 focus:outline-none"
                    aria-label="Thanh tiến trình bài hát"
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 w-8 text-left shrink-0">
                  {formatTime(duration)}
                </span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 mt-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                <span>SoundCloud Player • Tự động chuyển bài khi kết thúc hàng đợi</span>
              </div>
            )}
          </div>

          {/* Cột 3: Âm lượng, Hàng đợi & Nút thao tác */}
          <div className="flex items-center justify-end gap-1.5 md:gap-2.5 md:w-1/4">
            {/* Âm lượng (cho MP3) */}
            {!currentSong.isLink && (
              <div className="hidden lg:flex items-center gap-1.5 mr-1">
                <button
                  onClick={toggleMute}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={isMuted ? "Bật tiếng" : "Tắt tiếng"}
                >
                  {renderVolumeIcon()}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600 dark:accent-purple-400"
                  aria-label="Thanh âm lượng"
                />
              </div>
            )}

            {/* Nút xem hàng đợi (Queue) & Playlist */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
                showQueue
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Danh sách chờ phát & Hàng đợi"
            >
              <ListMusic size={17} />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-purple-600 text-white text-[9px] font-bold rounded-full shadow-sm">
                  {queue.length}
                </span>
              )}
            </button>

            {/* Nút bật/tắt SoundCloud Widget */}
            {currentSong.isLink && (
              <button
                onClick={() => setShowSoundCloudWidget(!showSoundCloudWidget)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  showSoundCloudWidget
                    ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
                    : "text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={showSoundCloudWidget ? "Ẩn khung SoundCloud" : "Hiện khung SoundCloud"}
              >
                <Cloud size={17} />
              </button>
            )}

            {/* Nút Thu gọn Mini */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Thu nhỏ thanh phát"
            >
              <ChevronDown size={17} />
            </button>

            {/* Nút Đóng */}
            <button
              onClick={closePlayer}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
              title="Đóng trình phát"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Khung widget SoundCloud tích hợp khi có link */}
        {currentSong.isLink && showSoundCloudWidget && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1">
              <span className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                <Cloud size={12} /> SoundCloud Player
              </span>
              <a
                href={currentSong.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline text-slate-500 dark:text-slate-300"
              >
                Mở trang gốc <ExternalLink size={10} />
              </a>
            </div>
            <div className="rounded-xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <iframe
                width="100%"
                height="100"
                scrolling="no"
                frameBorder="no"
                allow="autoplay"
                src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(
                  currentSong.publicUrl
                )}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
