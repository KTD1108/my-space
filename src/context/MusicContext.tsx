"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import toast from "react-hot-toast";

export interface SongItem {
  id: string | number;
  title: string;
  publicUrl: string;
  isLink?: boolean;
  url?: string;
  album?: string;
  genre?: string;
  created_at?: string;
  [key: string]: unknown;
}

export type RepeatMode = "off" | "all" | "one";

export interface MusicContextType {
  currentSong: SongItem | null;
  playlist: SongItem[];
  queue: SongItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 -> 1.0
  isMuted: boolean;
  isRepeat: boolean; // Tương thích ngược: repeatMode !== 'off'
  repeatMode: RepeatMode;
  isShuffle: boolean;
  playSong: (song: SongItem, customPlaylist?: SongItem[]) => void;
  togglePlay: () => void;
  playNext: (options?: { isAutoEnded?: boolean }) => void;
  playPrevious: () => void;
  nextSong: () => void;
  prevSong: () => void;
  addToQueue: (song: SongItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setVolume: (v: number) => void;
  fadeVolume: (targetVolume: number, durationMs?: number) => Promise<void>;
  toggleMute: () => void;
  toggleRepeat: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  seekTo: (seconds: number) => void;
  setPlaylist: (list: SongItem[]) => void;
  closePlayer: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [playlist, setPlaylist] = useState<SongItem[]>([]);
  const [queue, setQueue] = useState<SongItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("my_space_player_queue");
        if (saved) return JSON.parse(saved);
      } catch (err) {
        console.warn("[MusicContext] Không thể đọc queue từ localStorage:", err);
      }
    }
    return [];
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("my_space_player_repeat_mode");
        if (saved === "off" || saved === "all" || saved === "one") return saved;
      } catch (err) {
        console.warn("[MusicContext] Không thể đọc repeatMode:", err);
      }
    }
    return "off";
  });

  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("my_space_player_shuffle") === "true";
      } catch (err) {
        console.warn("[MusicContext] Không thể đọc isShuffle:", err);
      }
    }
    return false;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("my_space_player_volume");
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
        }
      } catch (err) {
        console.warn("[MusicContext] Không thể đọc volume từ localStorage:", err);
      }
    }
    return 0.8;
  });

  const prevVolumeRef = useRef<number>(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Refs hỗ trợ tránh stale closures
  const queueRef = useRef<SongItem[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const playlistRef = useRef<SongItem[]>(playlist);
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  const currentSongRef = useRef<SongItem | null>(currentSong);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const isShuffleRef = useRef<boolean>(isShuffle);
  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  // Cập nhật âm lượng trực tiếp
  const setVolume = useCallback((v: number) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (clamped > 0) {
      setIsMuted(false);
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    try {
      localStorage.setItem("my_space_player_volume", clamped.toString());
    } catch (err) {
      console.warn("[MusicContext] Không thể lưu volume vào localStorage:", err);
    }
  }, []);

  // Chuyển âm lượng mượt mà (Fade In / Fade Out)
  const fadeVolume = useCallback(
    (targetVolume: number, durationMs: number = 1000): Promise<void> => {
      return new Promise((resolve) => {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }

        const clampedTarget = Math.max(0, Math.min(1, targetVolume));

        if (!audioRef.current) {
          setVolumeState(clampedTarget);
          resolve();
          return;
        }

        const startVolume = audioRef.current.volume;
        const volumeDiff = clampedTarget - startVolume;

        if (Math.abs(volumeDiff) < 0.01 || durationMs <= 0) {
          audioRef.current.volume = clampedTarget;
          setVolumeState(clampedTarget);
          if (clampedTarget > 0) setIsMuted(false);
          resolve();
          return;
        }

        const stepTime = 25;
        const totalSteps = Math.max(1, Math.round(durationMs / stepTime));
        let step = 0;

        fadeIntervalRef.current = setInterval(() => {
          step++;
          const progress = Math.min(1, step / totalSteps);
          // Eased progress (easeInOutQuad)
          const eased =
            progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          const currentVol = Math.max(0, Math.min(1, startVolume + volumeDiff * eased));

          if (audioRef.current) {
            audioRef.current.volume = currentVol;
          }
          setVolumeState(currentVol);

          if (step >= totalSteps) {
            if (fadeIntervalRef.current) {
              clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = null;
            }
            if (audioRef.current) {
              audioRef.current.volume = clampedTarget;
            }
            setVolumeState(clampedTarget);
            if (clampedTarget > 0) setIsMuted(false);
            try {
              localStorage.setItem("my_space_player_volume", clampedTarget.toString());
            } catch {}
            resolve();
          }
        }, stepTime);
      });
    },
    []
  );

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8;
      setVolume(restored);
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  }, [isMuted, volume, setVolume]);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
    try {
      localStorage.setItem("my_space_player_repeat_mode", mode);
    } catch {}
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatModeState((prev) => {
      let next: RepeatMode = "off";
      if (prev === "off") next = "all";
      else if (prev === "all") next = "one";
      else next = "off";

      try {
        localStorage.setItem("my_space_player_repeat_mode", next);
      } catch {}

      if (next === "all") {
        toast.success("Lặp lại: Toàn bộ danh sách 🔁", { id: "repeat-toast" });
      } else if (next === "one") {
        toast.success("Lặp lại: 1 bài duy nhất 🔂", { id: "repeat-toast" });
      } else {
        toast("Đã tắt chế độ lặp lại", { id: "repeat-toast" });
      }

      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("my_space_player_shuffle", next ? "true" : "false");
      } catch {}
      if (next) {
        toast.success("Đã bật chế độ trộn bài ngẫu nhiên 🔀", { id: "shuffle-toast" });
      } else {
        toast("Đã tắt chế độ trộn bài", { id: "shuffle-toast" });
      }
      return next;
    });
  }, []);

  // Quản lý Hàng đợi (Queue)
  const addToQueue = useCallback((song: SongItem) => {
    setQueue((prev) => {
      const updated = [...prev, song];
      try {
        localStorage.setItem("my_space_player_queue", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    const cleanName = song.title.replace(/\.[^/.]+$/, "");
    toast.success(`Đã thêm "${cleanName}" vào hàng đợi 🎵`, { id: `queue-${song.id}` });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem("my_space_player_queue", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    toast.success("Đã xóa khỏi hàng đợi");
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem("my_space_player_queue");
    } catch {}
    toast.success("Đã xóa toàn bộ hàng đợi");
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      if (audioRef.current && !currentSong?.isLink) {
        audioRef.current.currentTime = seconds;
        setCurrentTime(seconds);
      }
    },
    [currentSong]
  );

  const togglePlay = useCallback(() => {
    if (!currentSong) return;

    if (currentSong.isLink) {
      setIsPlaying((prev) => !prev);
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err: Error) => {
            if (err.name !== "AbortError") {
              console.warn("[MusicContext] Lỗi khi phát nhạc:", err.message);
              toast.error("Không thể phát bài hát. Vui lòng thử lại!");
            }
          });
      }
    }
  }, [currentSong, isPlaying]);

  const playSong = useCallback(
    (song: SongItem, customPlaylist?: SongItem[]) => {
      if (customPlaylist && customPlaylist.length > 0) {
        setPlaylist(customPlaylist);
      } else {
        setPlaylist((prev) => {
          const exists = prev.some((s) => s.id === song.id);
          return exists ? prev : [song, ...prev];
        });
      }

      if (currentSong?.id === song.id) {
        togglePlay();
        return;
      }

      setCurrentSong(song);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
    },
    [currentSong, togglePlay]
  );

  // Chuyển bài kế tiếp theo queue / shuffle / playlist
  const playNext = useCallback((options?: { isAutoEnded?: boolean }) => {
    // 1. Kiểm tra hàng đợi ưu tiên (Queue)
    const currentQueue = queueRef.current;
    if (currentQueue.length > 0) {
      const nextSongFromQueue = currentQueue[0];
      setQueue((prev) => {
        const updated = prev.slice(1);
        try {
          localStorage.setItem("my_space_player_queue", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // Đảm bảo bài này có mặt trong playlist
      setPlaylist((prev) => {
        const exists = prev.some((s) => s.id === nextSongFromQueue.id);
        return exists ? prev : [nextSongFromQueue, ...prev];
      });

      setCurrentSong(nextSongFromQueue);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // 2. Không có hàng đợi: chuyển bài theo danh sách phát (Playlist)
    const currentPlaylist = playlistRef.current;
    if (currentPlaylist.length === 0) return;

    const current = currentSongRef.current;
    const currentIdx = current ? currentPlaylist.findIndex((s) => s.id === current.id) : -1;

    // Chế độ trộn bài ngẫu nhiên (Shuffle)
    if (isShuffleRef.current && currentPlaylist.length > 1) {
      let randIdx = Math.floor(Math.random() * currentPlaylist.length);
      if (randIdx === currentIdx) {
        randIdx = (randIdx + 1) % currentPlaylist.length;
      }
      const nextTrack = currentPlaylist[randIdx];
      setCurrentSong(nextTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    // Chế độ phát tuần tự
    if (currentIdx === -1) {
      setCurrentSong(currentPlaylist[0]);
    } else {
      // Khi bài hát tự kết thúc và lặp lại đang tắt ('off') ở bài cuối cùng
      if (options?.isAutoEnded && repeatModeRef.current === "off" && currentIdx >= currentPlaylist.length - 1) {
        setIsPlaying(false);
        return;
      }
      const nextIdx = (currentIdx + 1) % currentPlaylist.length;
      setCurrentSong(currentPlaylist[nextIdx]);
    }
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Quay lại bài trước
  const playPrevious = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    if (currentPlaylist.length === 0) return;

    // Nếu bài đã phát hơn 3s thì tua về đầu bài
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const current = currentSongRef.current;
    const currentIdx = current ? currentPlaylist.findIndex((s) => s.id === current.id) : -1;

    if (currentIdx === -1) {
      setCurrentSong(currentPlaylist[0]);
    } else {
      const prevIdx = (currentIdx - 1 + currentPlaylist.length) % currentPlaylist.length;
      setCurrentSong(currentPlaylist[prevIdx]);
    }
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Bí danh tương thích ngược
  const nextSong = playNext;
  const prevSong = playPrevious;

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Xử lý nạp và tự động phát khi currentSong thay đổi
  useEffect(() => {
    if (!audioRef.current) return;

    if (currentSong && !currentSong.isLink && currentSong.publicUrl) {
      audioRef.current.src = currentSong.publicUrl;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.load();

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err: Error) => {
            if (err.name !== "AbortError") {
              console.warn("[MusicContext] Trình duyệt chặn autoplay hoặc lỗi tải file:", err.message);
              setIsPlaying(false);
            }
          });
      }
    } else if (currentSong?.isLink) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      setIsPlaying(true);
    }
  }, [currentSong]);

  // Event handlers cho thẻ audio
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    // Nếu chế độ lặp 1 bài ('one')
    if (repeatModeRef.current === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err: Error) => {
          console.warn("[MusicContext] Lỗi phát lặp lại bài:", err.message);
        });
      }
      return;
    }

    // Tự động chuyển bài kế tiếp
    playNext({ isAutoEnded: true });
  };

  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const mediaError = e.currentTarget.error;
    console.error("[MusicContext] Lỗi thẻ audio:", mediaError?.code, mediaError?.message);
    setIsPlaying(false);
    toast.error("Không thể tải nguồn âm thanh này.");
  };

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        playlist,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isRepeat: repeatMode !== "off",
        repeatMode,
        isShuffle,
        playSong,
        togglePlay,
        playNext,
        playPrevious,
        nextSong,
        prevSong,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setVolume,
        fadeVolume,
        toggleMute,
        toggleRepeat,
        setRepeatMode,
        toggleShuffle,
        seekTo,
        setPlaylist,
        closePlayer,
      }}
    >
      {/* Audio element toàn cục ẩn */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextType {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic phải được sử dụng bên trong <MusicProvider>");
  }
  return context;
}
