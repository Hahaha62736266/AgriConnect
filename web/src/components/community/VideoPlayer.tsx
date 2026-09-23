import React, { useRef } from 'react';
import { getImageUrl } from '../../api';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = getImageUrl(src);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        backgroundColor: '#000000',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        playsInline
        preload="metadata"
        controls
        style={{
          width: '100%',
          maxHeight: '520px',
          objectFit: 'contain',
          display: 'block',
          borderRadius: '16px',
        }}
      />
    </div>
  );
};
