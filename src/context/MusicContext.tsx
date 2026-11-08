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
  created_at?: string;
  [key: string]: unknown;
}

export interface MusicContextType {
  currentSong: SongItem | null;
  playlist: SongItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 -> 1.0
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
  playSong: (song: SongItem, customPlaylist?: SongItem[]) => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  seekTo: (seconds: number) => void;
  setPlaylist: (list: SongItem[]) => void;
  closePlayer: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [currentSong, setCurrentSong] = useState<SongItem | null>(null);
  const [playlist, setPlaylist] = useState<SongItem[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
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

  // Cập nhật âm lượng cho thẻ audio khi thay đổi
  const setVolume = useCallback((v: number) => {
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

  const toggleRepeat = useCallback(() => {
    setIsRepeat((prev) => !prev);
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
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
        // Nếu bài hát chưa nằm trong playlist hiện tại thì thêm vào
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

  const nextSong = useCallback(() => {
    if (playlist.length === 0) return;

    if (isShuffle && playlist.length > 1) {
      const currIdx = playlist.findIndex((s) => s.id === currentSong?.id);
      let randIdx = Math.floor(Math.random() * playlist.length);
      if (randIdx === currIdx) {
        randIdx = (randIdx + 1) % playlist.length;
      }
      const nextTrack = playlist[randIdx];
      setCurrentSong(nextTrack);
      setIsPlaying(true);
      setCurrentTime(0);
      return;
    }

    const currIdx = playlist.findIndex((s) => s.id === currentSong?.id);
    if (currIdx === -1) {
      setCurrentSong(playlist[0]);
    } else {
      const nextIdx = (currIdx + 1) % playlist.length;
      setCurrentSong(playlist[nextIdx]);
    }
    setIsPlaying(true);
    setCurrentTime(0);
  }, [playlist, currentSong, isShuffle]);

  const prevSong = useCallback(() => {
    if (playlist.length === 0) return;

    // Nếu bài đã phát hơn 3s thì lùi về đầu bài hát
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const currIdx = playlist.findIndex((s) => s.id === currentSong?.id);
    if (currIdx === -1) {
      setCurrentSong(playlist[0]);
    } else {
      const prevIdx = (currIdx - 1 + playlist.length) % playlist.length;
      setCurrentSong(playlist[prevIdx]);
    }
    setIsPlaying(true);
    setCurrentTime(0);
  }, [playlist, currentSong]);

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
              // Đổi về pause nếu trình duyệt chặn autoplay
              setIsPlaying(false);
            }
          });
      }
    } else if (currentSong?.isLink) {
      // Đối với link SoundCloud, dừng audio element nếu đang phát bài trước
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      setIsPlaying(true);
    }
  }, [currentSong]);

  // Event handlers cho audio
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
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err: Error) => {
          console.warn("[MusicContext] Lỗi phát lặp lại:", err.message);
        });
      }
    } else {
      // Auto-next sang bài kế tiếp trong playlist
      nextSong();
    }
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
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isRepeat,
        isShuffle,
        playSong,
        togglePlay,
        nextSong,
        prevSong,
        setVolume,
        toggleMute,
        toggleRepeat,
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
