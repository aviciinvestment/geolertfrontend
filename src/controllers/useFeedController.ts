import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { StreamService, Stream } from '../services/StreamService';

export function useFeedController() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        const data = await StreamService.getFeed();
        if (isMounted) {
          setStreams(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to load feed.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchFeed();

    const socket = io(import.meta.env.VITE_API_URL);

    socket.on('new_reel', (newStream: Stream) => {
      if (isMounted) {
        setStreams(prev => [newStream, ...prev]);
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const handleLike = async (id: string) => {
    setStreams(prev =>
      prev.map(s => s._id === id ? { ...s, likes: s.likes + 1 } : s)
    );
    await StreamService.likeReel(id);
  };

  return {
    streams,
    loading,
    error,
    handleLike
  };
}
