import React, { useState, useEffect } from 'react';

// This component seems to have a local asset, we'll leave it in case it's used as a fallback
import Gigalith_1 from "@assets/Gigalith 1.png"; 

// Client-side image cache to prevent repeated API calls
const imageCache = new Map<string, string>();

// --- CHANGE 1: UPDATED PROPS ---
// Corrected the props to accept 'level' and the 'tiny' size.
interface VeoMonsterProps {
  monsterId: number;
  level: number; 
  size?: 'tiny' | 'small' | 'medium' | 'large';
  animationState?: 'idle' | 'windup' | 'attack' | 'hit' | 'victory' | 'defeat';
  facingDirection?: 'left' | 'right';
}

export default function VeoMonster({ 
  monsterId, 
  level,
  size = 'medium',
  animationState = 'idle',
  facingDirection = 'right'
}: VeoMonsterProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- CHANGE 2: ADDED 'tiny' TO DIMENSIONS ---
  // Added the missing 'tiny' key to prevent the crash.
  const dimensions = {
    tiny: { width: 120, height: 120 },
    small: { width: 200, height: 200 },
    medium: { width: 320, height: 320 },
    large: { width: 450, height: 450 }
  };

  const { width, height } = dimensions[size];

  // --- CHANGE 3: CONSTRUCT upgradeChoices FROM level PROP ---
  // Create the object the API expects using the 'level' prop we are now receiving.
  const upgradeChoices = { level };

  useEffect(() => {
    generateMonsterImage();
    // Preload common variations to prevent future delays
    preloadCommonVariations();
  }, [monsterId, level]); // Depend on level now

  const preloadCommonVariations = async () => {
    const variations = [
      { monsterId, upgradeChoices: { level: 1 } },
      { monsterId, upgradeChoices: { level: 10 } } 
    ];

    for (const variation of variations) {
      const cacheKey = `${variation.monsterId}-${JSON.stringify(variation.upgradeChoices)}`;
      if (!imageCache.has(cacheKey)) {
        try {
          const response = await fetch('/api/generate/monster-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(variation)
          });
          const data = await response.json();
          if (data.success && data.imageData) {
            imageCache.set(cacheKey, data.imageData);
          }
        } catch (err) {
          // Silent preload - don't show errors
        }
      }
    }
  };

  const generateMonsterImage = async () => {
    const cacheKey = `${monsterId}-${JSON.stringify(upgradeChoices)}`;

    if (imageCache.has(cacheKey)) {
      setImageData(imageCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/monster-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          monsterId,
          upgradeChoices
        })
      });

      const data = await response.json();

      if (data.success && data.imageData) {
        imageCache.set(cacheKey, data.imageData);
        setImageData(data.imageData);
      } else {
        throw new Error(data.error || 'Failed to generate monster image');
      }
    } catch (err) {
      console.error('Error generating monster image:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransform = () => {
    const baseTransform = facingDirection === 'left' ? 'scaleX(-1)' : '';

    switch (animationState) {
      case 'windup':
        return `${baseTransform} scale(0.95) rotate(-3deg) translateY(5px)`;
      case 'attack':
        return `${baseTransform} scale(1.08) rotate(2deg) translateX(${facingDirection === 'right' ? '15px' : '-15px'}) translateY(-3px)`;
      case 'hit':
        return `${baseTransform} scale(0.92) rotate(${facingDirection === 'right' ? '-4deg' : '4deg'}) translateX(${facingDirection === 'right' ? '-10px' : '10px'}) translateY(8px)`;
      case 'victory':
        return `${baseTransform} scale(1.05) rotate(1deg) translateY(-5px)`;
      case 'defeat':
        return `${baseTransform} scale(0.85) rotate(-8deg) translateY(25px)`;
      default:
        return baseTransform;
    }
  };

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg animate-pulse"
        style={{ width, height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-slate-600 dark:text-slate-400">Generating...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg border border-red-200 dark:border-red-800"
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <div className="text-red-600 dark:text-red-400 mb-2">⚠️</div>
          <p className="text-xs text-red-600 dark:text-red-400">Failed to generate</p>
          <button 
            onClick={generateMonsterImage}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      <div 
        className="relative transition-all duration-500 ease-out rounded-lg"
        style={{ 
          width, 
          height,
          transform: getTransform(),
          filter: animationState === 'attack' ? 'drop-shadow(0 0 30px rgba(255, 165, 0, 0.8)) contrast(1.1)' : 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.3))'
        }}
      >
        {/* Ground Shadow */}
        <div 
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/20 rounded-full blur-sm"
          style={{ width: width * 0.8, height: height * 0.1, top: '90%' }}
        />
        {/* Monster Image */}
        {imageData ? (
          <div 
            className="w-full h-full rounded-lg flex items-center justify-center"
            style={{
              filter: animationState === 'attack' ? 'contrast(1.2) saturate(1.3)' : 'contrast(1.1) saturate(1.1)',
              overflow: 'visible'
            }}
          >
            <div 
              className="w-full h-full"
              style={{ 
                minWidth: '100%',
                minHeight: '100%'
              }}
              dangerouslySetInnerHTML={{ __html: atob(imageData) }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg">
            <span className="text-gray-400">Loading...</span>
          </div>
        )}

        {/* Battle Effects Overlay */}
        {animationState === 'attack' && (
          <div className="absolute inset-0 bg-gradient-radial from-orange-400/20 via-transparent to-transparent animate-pulse rounded-lg" />
        )}

        {animationState === 'hit' && (
          <div className="absolute inset-0 bg-gradient-radial from-red-500/30 via-transparent to-transparent animate-ping rounded-lg" />
        )}

        {animationState === 'victory' && (
          <div className="absolute inset-0 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent animate-pulse rounded-lg" />
        )}
      </div>
    </div>
  );
}