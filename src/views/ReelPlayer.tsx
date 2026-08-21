import { useState, useRef, useEffect } from 'react';
import { Stream, StreamService } from '../services/StreamService';
import { Heart, MessageCircle, Share2, UserPlus, Volume2, VolumeX, Check, Eye, MapPin } from 'lucide-react';
import { CommentSection } from './CommentSection';
import { useAudio } from '../context/AudioContext';

interface ReelPlayerProps {
  stream: Stream;
  onLike: () => void;
  onProfileClick: (userId: string) => void;
}

export function ReelPlayer({ stream, onLike, onProfileClick }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(stream.isLikedByMe || false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(stream.comments);
  const [viewCount, setViewCount] = useState(stream.views || 0);
  const [copied, setCopied] = useState(false);
  const viewCountedRef = useRef(false);
  const { muted, toggleMute } = useAudio();

  useEffect(() => {
    setCommentCount(stream.comments);
  }, [stream.comments]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => setIsPlaying(false));
            setIsPlaying(true);
            // Count view once per mount
            if (!viewCountedRef.current) {
              viewCountedRef.current = true;
              StreamService.viewReel(stream._id).then((res) => {
                if (res.success && res.data) {
                  setViewCount(res.data.views || 0);
                }
              });
            }
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, [stream._id]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMute();
  };

  const handleLikeAction = () => {
    if (!isLiked) {
      setIsLiked(true);
      onLike();

      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      handleLikeAction();
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/reel/${stream._id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by @${stream.username}`,
          text: stream.description || `Check out this reel by @${stream.username}`,
          url: shareUrl
        });
      } catch {
        // user cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (showComments) {
    return (
      <div className="w-full h-full relative bg-black">
        <CommentSection
          reelId={stream._id}
          onClose={() => setShowComments(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black group" onClick={handleDoubleTap}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={stream.url}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted
      />

      {/* Play/Pause Overlay */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />

      {/* Double Tap Heart Animation */}
      {showHeartAnim && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping opacity-75" />
        </div>
      )}

      {/* LIVE Badge */}
      {stream.isLive && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-sm tracking-wider flex items-center gap-1 shadow-lg">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
          {stream.viewers && (
            <div className="bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-sm">
              {stream.viewers.toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Mute Toggle */}
      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 z-20 p-2 bg-black/30 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors"
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Right Sidebar Actions */}
      <div className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-6">
        {stream.userId && !stream.isAnonymous && (
          <div
            className="relative group/avatar cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onProfileClick(stream.userId!);
            }}
          >
            <div className="w-12 h-12 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500">
              <img src={stream.avatar} alt={stream.username} className="w-full h-full rounded-full border-2 border-black object-cover" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-pink-500 rounded-full w-5 h-5 flex items-center justify-center border border-black shadow-sm transition-transform group-hover/avatar:scale-110">
              <UserPlus className="w-3 h-3 text-white" />
            </div>
          </div>
        )}

        {stream.canInteract !== false && (
          <button onClick={handleLikeAction} className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity z-30 relative">
            <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className={`w-7 h-7 transition-colors duration-300 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
            </div>
            <span className="text-white text-xs font-semibold">{stream.likes.toLocaleString()}</span>
          </button>
        )}

        {stream.canInteract !== false && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity z-30 relative"
          >
            <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-white fill-white/20" />
            </div>
            <span className="text-white text-xs font-semibold">{commentCount.toLocaleString()}</span>
          </button>
        )}

        <button onClick={handleShare} className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity z-30 relative">
          <div className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            {copied ? (
              <Check className="w-7 h-7 text-green-400" />
            ) : (
              <Share2 className="w-7 h-7 text-white fill-white/20" />
            )}
          </div>
          <span className="text-white text-xs font-semibold">{copied ? 'Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* Bottom Info Section */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 flex flex-col justify-end">
        <h3 className="text-white font-bold text-lg mb-1">@{stream.username}</h3>
        <p className="text-white text-sm mb-3 w-[80%] line-clamp-2 leading-tight opacity-90">
          {stream.description}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {stream.distanceMiles !== undefined && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg ${
              stream.canInteract !== false
                ? 'bg-red-500/80 border-white/20'
                : 'bg-white/20 border-white/10'
            }`}>
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">{stream.distanceMiles} miles away</span>
              {stream.canInteract === false && (
                <span className="text-white/60 text-[10px] ml-1">(view only)</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
            <Eye className="w-3.5 h-3.5 text-white/70" />
            <span className="text-white text-xs font-medium">{viewCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
