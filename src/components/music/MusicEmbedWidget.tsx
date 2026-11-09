import React from 'react';
import { ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react';
import { SongItem } from '@/context/MusicContext';
import { detectMusicPlatform } from '@/lib/musicPlatforms';
import { YouTubeIcon, SpotifyIcon, SoundCloudIcon, AppleMusicIcon } from './MusicIcons';

interface MusicEmbedWidgetProps {
  song: SongItem;
  isOpen: boolean;
  onToggle: () => void;
}

export function MusicEmbedWidget({ song, isOpen, onToggle }: MusicEmbedWidgetProps) {
  if (!song.isLink) return null;

  const platform = detectMusicPlatform(song.publicUrl);

  const renderPlatformIcon = () => {
    switch (platform.type) {
      case 'youtube':
        return <YouTubeIcon size={14} />;
      case 'spotify':
        return <SpotifyIcon size={14} />;
      case 'soundcloud':
        return <SoundCloudIcon size={14} />;
      case 'applemusic':
        return <AppleMusicIcon size={14} />;
      default:
        return null;
    }
  };

  return (
    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-1">
      {/* Widget Header */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 font-bold cursor-pointer hover:underline text-slate-700 dark:text-slate-300"
        >
          {renderPlatformIcon()}
          <span>{platform.name} Player</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <a
          href={song.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:underline text-slate-500 dark:text-slate-400 text-[10px]"
        >
          <span>Mở gốc</span>
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Widget Embed Body */}
      {isOpen && platform.embedUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner">
          {platform.type === 'youtube' && (
            <iframe
              width="100%"
              height="180"
              src={platform.embedUrl}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full border-none"
            />
          )}

          {platform.type === 'spotify' && (
            <iframe
              src={platform.embedUrl}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="w-full border-none rounded-xl"
            />
          )}

          {platform.type === 'soundcloud' && (
            <iframe
              width="100%"
              height="100"
              scrolling="no"
              frameBorder="no"
              allow="autoplay"
              src={platform.embedUrl}
              className="w-full border-none"
            />
          )}

          {platform.type === 'applemusic' && (
            <iframe
              allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
              frameBorder="0"
              height="175"
              style={{ width: '100%', overflow: 'hidden', borderRadius: '10px' }}
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              src={platform.embedUrl}
              className="w-full border-none"
            />
          )}

          {platform.type === 'zingmp3' && (
            <iframe
              src={platform.embedUrl}
              width="100%"
              height="120"
              frameBorder="0"
              allowFullScreen
              className="w-full border-none rounded-xl"
            />
          )}
        </div>
      )}
    </div>
  );
}
