import React from 'react';
import { Music, Disc, ExternalLink } from 'lucide-react';
import { detectMusicPlatform } from '@/lib/musicPlatforms';
import { YouTubeIcon, SpotifyIcon, SoundCloudIcon, AppleMusicIcon } from './MusicIcons';

interface PlatformBadgeProps {
  url?: string;
  isLink?: boolean;
  className?: string;
}

export function PlatformBadge({ url = '', isLink = false, className = '' }: PlatformBadgeProps) {
  if (!isLink && !url.startsWith('http')) {
    return (
      <span className={`text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 ${className}`}>
        <Music size={10} /> MP3
      </span>
    );
  }

  const platform = detectMusicPlatform(url);

  const renderIcon = () => {
    switch (platform.type) {
      case 'youtube':
        return <YouTubeIcon size={11} />;
      case 'spotify':
        return <SpotifyIcon size={11} />;
      case 'soundcloud':
        return <SoundCloudIcon size={11} />;
      case 'applemusic':
        return <AppleMusicIcon size={11} />;
      case 'zingmp3':
        return <Disc size={11} className="text-purple-500" />;
      case 'direct':
        return <Music size={11} className="text-blue-500" />;
      default:
        return <ExternalLink size={10} className="text-slate-500" />;
    }
  };

  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 border ${platform.badgeBg} ${platform.badgeText} ${platform.badgeBorder} ${className}`}
    >
      {renderIcon()}
      <span>{platform.name}</span>
    </span>
  );
}
