import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface VeoBattleVideoProps {
  playerMonsterId: number;
  aiMonsterId: number;
  playerUpgrades: Record<string, any>;
  aiUpgrades: Record<string, any>;
  isPlaying: boolean;
  onVideoEnd?: () => void;
}

interface VideoResponse {
    success: boolean;
    videoData?: string;
    message?: string;
}

export default function VeoBattleVideo({ 
  playerMonsterId, 
  aiMonsterId, 
  playerUpgrades, 
  aiUpgrades,
  isPlaying,
  onVideoEnd
}: VeoBattleVideoProps) {
  const [videoData, setVideoData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaying && !videoData) {
      generateBattleVideo();
    }
  }, [isPlaying, playerMonsterId, aiMonsterId]);

  const generateBattleVideo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/api/generate/battle-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          playerMonsterId,
          aiMonsterId,
          playerUpgrades,
          aiUpgrades
        }
      });
      const response: VideoResponse = await res.json();

      if (response.success && response.videoData) {
        setVideoData(response.videoData);
      } else {
        throw new Error(response.message || 'Failed to generate battle video');
      }
    } catch (err) {
      console.error('Error generating battle video:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPlaying) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center max-w-md mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Generating Epic Battle</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Creating photorealistic battle video with Google Veo...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-8 text-center max-w-md mx-4">
          <div className="text-red-600 dark:text-red-400 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Generation Failed</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {error}
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={generateBattleVideo}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={onVideoEnd}
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (videoData) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="relative w-full h-full max-w-4xl max-h-3xl">
          <video
            src={`data:video/mp4;base64,${videoData}`}
            autoPlay
            controls
            className="w-full h-full object-contain"
            onEnded={onVideoEnd}
          />
          <button
            onClick={onVideoEnd}
            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
}