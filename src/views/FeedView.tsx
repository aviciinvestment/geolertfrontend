import { useEffect, useRef } from 'react';
import { useFeedController } from '../controllers/useFeedController';
import { ReelPlayer } from './ReelPlayer';
import { Loader2 } from 'lucide-react';

interface FeedViewProps {
  onProfileClick?: (userId: string) => void;
}

export function FeedView({ onProfileClick }: FeedViewProps) {
  const { streams, loading, error, handleLike } = useFeedController();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || streams.length === 0) return;

    const path = window.location.pathname;
    const match = path.match(/^\/reel\/(.+)$/);
    if (match) {
      const targetId = match[1];
      const index = streams.findIndex(s => s._id === targetId);
      if (index > 0 && containerRef.current) {
        const container = containerRef.current;
        container.scrollTo({ top: index * container.clientHeight, behavior: 'instant' });
      }
    }
  }, [loading, streams]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-white animate-spin opacity-50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black">
      {streams.map((stream) => (
        <div key={stream._id} className="w-full h-full snap-start snap-always">
          <ReelPlayer 
            stream={stream} 
            onLike={() => handleLike(stream._id)}
            onProfileClick={onProfileClick || (() => {})}
          />
        </div>
      ))}
    </div>
  );
}
