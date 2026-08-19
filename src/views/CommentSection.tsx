import { useState, useRef, useEffect, useCallback } from 'react';
import { Comment, StreamService } from '../services/StreamService';
import { X, Send, Camera, Square, Loader2 } from 'lucide-react';

interface CommentSectionProps {
  reelId: string;
  onClose: () => void;
}

export function CommentSection({ reelId, onClose }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef(false);

  const username = 'user_' + Math.floor(Math.random() * 10000);

  const fetchComments = useCallback(async () => {
    const data = await StreamService.getComments(reelId);
    setComments(data);
    setLoading(false);
  }, [reelId]);

  useEffect(() => {
    fetchComments();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchComments]);

  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const res = await StreamService.addComment(reelId, username, trimmed);
    if (res.success && res.data) {
      setComments(prev => [...prev, res.data!]);
      setText('');
    }
    setSending(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      const mimeTypeCandidates = [
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
      ];

      let selectedMime = '';
      for (const mime of mimeTypeCandidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options = selectedMime ? { mimeType: selectedMime } : undefined;
      const recorder = new MediaRecorder(stream, options);

      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const mimeType = recorder.mimeType || 'video/webm';
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const file = new File([blob], `comment-video.${ext}`, { type: mimeType });
        uploadVideoComment(file);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingTime(0);

      let elapsed = 0;
      timerRef.current = setInterval(() => {
        elapsed += 1;
        setRecordingTime(elapsed);
        if (elapsed >= 15) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadVideoComment = async (file: File) => {
    setUploadingVideo(true);
    const res = await StreamService.addVideoComment(reelId, username, file);
    if (res.success && res.data) {
      setComments(prev => [...prev, res.data!]);
    }
    setUploadingVideo(false);
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-white font-bold text-lg">Comments</span>
        <button onClick={onClose} className="p-1 text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-white/40 text-center py-8">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c._id} className="flex gap-3">
              <img src={c.avatar} alt={c.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white/60 text-xs font-semibold">@{c.username}</span>
                {c.videoUrl ? (
                  <video
                    src={c.videoUrl}
                    controls
                    playsInline
                    muted
                    className="mt-1 w-full max-w-[240px] rounded-lg object-cover"
                  />
                ) : (
                  <p className="text-white text-sm mt-0.5">{c.text}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Bar */}
      <div className="px-4 py-3 border-t border-white/10">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-mono">
                {recordingTime.toString().padStart(2, '0')}s / 15s
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="p-2 bg-red-500 rounded-full text-white"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          </div>
        ) : uploadingVideo ? (
          <div className="flex items-center gap-2 justify-center py-2">
            <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
            <span className="text-white/60 text-sm">Uploading video...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendText()}
              placeholder="Add a comment..."
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 focus:outline-none focus:border-pink-500 transition-colors"
            />
            <button
              onClick={startRecording}
              className="p-2 bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <button
              onClick={sendText}
              disabled={!text.trim() || sending}
              className="p-2 bg-pink-500 rounded-full text-white disabled:opacity-40 transition-opacity"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
