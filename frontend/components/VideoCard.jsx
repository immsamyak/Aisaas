'use client';

import { useState } from 'react';
import { Play, Pause } from 'lucide-react';

export default function VideoCard({ videoUrl, thumbnailUrl, duration, fileSize }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="mb-8">
      <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden max-w-sm mx-auto">
        <video
          src={videoUrl}
          poster={thumbnailUrl}
          controls
          className="w-full h-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video Info */}
      <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        {duration && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Duration:</span>
            <span>{formatDuration(duration)}</span>
          </div>
        )}
        {fileSize && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Size:</span>
            <span>{formatFileSize(fileSize)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
