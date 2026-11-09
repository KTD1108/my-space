export type MusicPlatformType =
  | 'youtube'
  | 'spotify'
  | 'soundcloud'
  | 'applemusic'
  | 'zingmp3'
  | 'direct'
  | 'unknown';

export interface PlatformInfo {
  type: MusicPlatformType;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  embedUrl: string | null;
  isNativeAudio: boolean;
  canEmbed: boolean;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/(?:watch\?.*v=)?)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

export function extractSpotifyInfo(url: string): { type: string; id: string } | null {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i);
  if (match) {
    return { type: match[1], id: match[2] };
  }
  return null;
}

export function extractZingMp3Id(url: string): string | null {
  if (!url) return null;
  const match = url.match(/([A-Z0-9]{8,12})\.html/i);
  return match ? match[1] : null;
}

export function isDirectAudioUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp3|wav|ogg|m4a|aac|flac)($|\?)/i.test(url.trim());
}

export function detectMusicPlatform(url: string): PlatformInfo {
  if (!url || typeof url !== 'string') {
    return {
      type: 'unknown',
      name: 'Khác',
      color: 'slate',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-600 dark:text-slate-300',
      badgeBorder: 'border-slate-200 dark:border-slate-700',
      embedUrl: null,
      isNativeAudio: false,
      canEmbed: false,
    };
  }

  const clean = url.trim();

  // 1. Direct audio file (.mp3, .wav, .m4a, ...)
  if (isDirectAudioUrl(clean)) {
    return {
      type: 'direct',
      name: 'Audio MP3 Trực tiếp',
      color: 'blue',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/70',
      badgeText: 'text-blue-700 dark:text-blue-300',
      badgeBorder: 'border-blue-200 dark:border-blue-800',
      embedUrl: null,
      isNativeAudio: true,
      canEmbed: false,
    };
  }

  // 2. YouTube / YouTube Music
  const ytId = extractYouTubeId(clean);
  if (ytId) {
    const isYtMusic = clean.includes('music.youtube.com');
    return {
      type: 'youtube',
      name: isYtMusic ? 'YouTube Music' : 'YouTube',
      color: 'red',
      badgeBg: 'bg-red-100 dark:bg-red-950/70',
      badgeText: 'text-red-700 dark:text-red-300',
      badgeBorder: 'border-red-200 dark:border-red-800',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1`,
      isNativeAudio: false,
      canEmbed: true,
    };
  }

  // 3. Spotify
  const spot = extractSpotifyInfo(clean);
  if (spot) {
    return {
      type: 'spotify',
      name: 'Spotify',
      color: 'emerald',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/70',
      badgeText: 'text-emerald-700 dark:text-emerald-300',
      badgeBorder: 'border-emerald-200 dark:border-emerald-800',
      embedUrl: `https://open.spotify.com/embed/${spot.type}/${spot.id}?utm_source=generator&theme=0`,
      isNativeAudio: false,
      canEmbed: true,
    };
  }

  // 4. SoundCloud
  if (clean.includes('soundcloud.com')) {
    return {
      type: 'soundcloud',
      name: 'SoundCloud',
      color: 'orange',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/70',
      badgeText: 'text-orange-700 dark:text-orange-300',
      badgeBorder: 'border-orange-200 dark:border-orange-800',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        clean
      )}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false`,
      isNativeAudio: false,
      canEmbed: true,
    };
  }

  // 5. Apple Music
  if (clean.includes('music.apple.com')) {
    const embedUrl = clean.replace('https://music.apple.com/', 'https://embed.music.apple.com/');
    return {
      type: 'applemusic',
      name: 'Apple Music',
      color: 'rose',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/70',
      badgeText: 'text-rose-700 dark:text-rose-300',
      badgeBorder: 'border-rose-200 dark:border-rose-800',
      embedUrl,
      isNativeAudio: false,
      canEmbed: true,
    };
  }

  // 6. Zing MP3
  if (clean.includes('zingmp3.vn')) {
    const zingId = extractZingMp3Id(clean);
    return {
      type: 'zingmp3',
      name: 'Zing MP3',
      color: 'purple',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/70',
      badgeText: 'text-purple-700 dark:text-purple-300',
      badgeBorder: 'border-purple-200 dark:border-purple-800',
      embedUrl: zingId ? `https://zingmp3.vn/embed/song/${zingId}` : null,
      isNativeAudio: false,
      canEmbed: !!zingId,
    };
  }

  // 7. Generic link
  return {
    type: 'unknown',
    name: 'Link Ngoài',
    color: 'slate',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-600 dark:text-slate-300',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
    embedUrl: null,
    isNativeAudio: false,
    canEmbed: false,
  };
}
