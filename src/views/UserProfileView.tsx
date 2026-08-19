import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, User, Film, Eye, Play, X } from 'lucide-react';
import { StreamService, Stream, UserProfile } from '../services/StreamService';
import { ReelPlayer } from './ReelPlayer';

interface UserProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function UserProfileView({ userId, onBack }: UserProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reels, setReels] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReel, setSelectedReel] = useState<Stream | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedReel && containerRef.current) {
      const index = reels.findIndex(r => r._id === selectedReel._id);
      if (index !== -1) {
        containerRef.current.scrollTo({ top: index * containerRef.current.clientHeight, behavior: 'instant' });
      }
    }
  }, [selectedReel, reels]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const res = await StreamService.getUserProfile(userId);
      if (res.success && res.user) {
        setProfile(res.user);
        setReels(res.reels || []);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [userId]);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrolled(scrollRef.current.scrollTop > 50);
    }
  }, []);

  const handleReelLike = useCallback(async (reelId: string) => {
    await StreamService.likeReel(reelId);
    setReels((prev) =>
      prev.map((r) => (r._id === reelId ? { ...r, likes: r.likes + 1 } : r))
    );
  }, []);

  const totalLikes = reels.reduce((sum, r) => sum + r.likes, 0);
  const totalViews = reels.reduce((sum, r) => sum + (r.views || 0), 0);

  if (loading) {
    return (
      <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full h-full bg-[#0A0A0A] text-white flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <button onClick={onBack} className="p-1"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-lg font-bold">Not Found</h1>
        </div>
      </div>
    );
  }

  if (selectedReel) {
    return (
      <div className="absolute inset-0 z-[70] bg-black">
        <button
          onClick={() => setSelectedReel(null)}
          className="absolute top-4 left-4 z-[80] p-2 bg-black/40 backdrop-blur-md rounded-full text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <div ref={containerRef} className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll no-scrollbar bg-black">
          {reels.map((stream) => (
            <div key={stream._id} className="w-full h-full snap-start snap-always">
              <ReelPlayer
                stream={stream}
                onLike={() => handleReelLike(stream._id)}
                onProfileClick={() => {}}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0A0A0A] text-white flex flex-col">
      {/* Frosted Header */}
      <div
        className={`flex items-center gap-3 px-4 transition-all duration-300 ${
          scrolled
            ? 'py-3 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/5'
            : 'py-4 bg-transparent'
        }`}
      >
        <button onClick={onBack} className="p-1 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1
          className={`font-bold transition-all duration-300 ${
            scrolled ? 'text-lg opacity-100' : 'text-lg opacity-0'
          }`}
        >
          @{profile.name}
        </h1>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="flex flex-col items-center pt-4 pb-6 px-4">
          <div className="relative mb-4">
            <div className="w-[88px] h-[88px] rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-violet-500 p-[2.5px]">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full rounded-full object-cover border-[3px] border-[#0A0A0A]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center border-[3px] border-[#0A0A0A]">
                  <User className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>
          </div>

          <h2 className="text-[22px] font-bold tracking-tight">{profile.name}</h2>

          {profile.bio && (
            <p className="text-white/50 text-[14px] mt-1.5 text-center max-w-[280px] leading-snug">
              {profile.bio}
            </p>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-8 mt-5">
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold">{reels.length}</span>
              <span className="text-white/40 text-[12px] font-medium">Reels</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold">{totalLikes.toLocaleString()}</span>
              <span className="text-white/40 text-[12px] font-medium">Likes</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[20px] font-bold">{totalViews.toLocaleString()}</span>
              <span className="text-white/40 text-[12px] font-medium">Views</span>
            </div>
          </div>
        </div>

        {/* Reels Grid or Empty State */}
        {reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Film className="w-8 h-8" />
            </div>
            <p className="text-[15px] font-medium">No reels yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[1px]">
            {reels.map((reel) => (
              <button
                key={reel._id}
                onClick={() => setSelectedReel(reel)}
                className="relative aspect-[9/16] bg-white/5 overflow-hidden group"
              >
                <video
                  src={reel.url}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-90 transition-opacity fill-white" />
                </div>

                {/* Bottom gradient + stats */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-white/80" />
                    <span className="text-white text-[10px] font-semibold drop-shadow-md">
                      {(reel.views || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
