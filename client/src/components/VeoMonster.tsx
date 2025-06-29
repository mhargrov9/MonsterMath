import React, { useState, useEffect } from 'react';
import { getMonsterImageUrl } from '@/lib/assetHelper';

interface VeoMonsterProps {
  monsterId: number;
  level: number; 
  size?: 'tiny' | 'small' | 'medium' | 'large';
}

export default function VeoMonster({ 
  monsterId, 
  level,
  size = 'medium',
}: VeoMonsterProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset error state and get the correct URL when props change
    setError(false);
    const url = getMonsterImageUrl(monsterId, level);
    setImageUrl(url);
  }, [monsterId, level]);

  const dimensions = {
    tiny: 120,
    small: 200,
    medium: 320,
    large: 450
  };

  const sizePx = dimensions[size];

  // Handle image loading errors
  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-red-900/20 rounded-lg border border-red-500/50"
        style={{ width: sizePx, height: sizePx }}
      >
        <div className="text-center p-2">
          <div className="text-red-500 mb-1">⚠️</div>
          <p className="text-xs text-red-400">Image Error</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: sizePx, height: sizePx }}
    >
        <img
          src={imageUrl}
          alt={`Monster ${monsterId}`}
          width={sizePx}
          height={sizePx}
          className="object-contain"
          onError={handleError}
          // The key forces a re-render if the URL changes, helping with state updates
          key={imageUrl} 
        />
    </div>
  );
}