import { useStreamController } from '../controllers/useStreamController';
import { Camera, X, SwitchCamera, Loader2, Square, EyeOff, Eye } from 'lucide-react';

interface GoLiveViewProps {
  onCancel: () => void;
}

export function GoLiveView({ onCancel }: GoLiveViewProps) {
  const { 
    isStarting, 
    title, 
    setTitle, 
    videoRef, 
    isRecording,
    timeLeft,
    startRecording,
    stopRecording,
    flipCamera,
    isAnonymous,
    setIsAnonymous,
    uploadStatus,
  } = useStreamController();

  return (
    <div className="w-full h-full bg-black relative flex flex-col">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
      
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <button onClick={onCancel} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
            <X className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/80 backdrop-blur-md rounded-full">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-sm font-bold tracking-wider">
                  00:{timeLeft.toString().padStart(2, '0')}
                </span>
              </div>
            )}
            <button 
              onClick={flipCamera}
              disabled={isRecording}
              className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white disabled:opacity-40"
            >
              <SwitchCamera className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`p-2 backdrop-blur-md rounded-full transition-colors ${isAnonymous ? 'bg-white/90 text-black' : 'bg-black/40 text-white'}`}
              title={isAnonymous ? 'Posting anonymously' : 'Posting as yourself'}
            >
              {isAnonymous ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Controls */}
        <div className="p-6 pb-20">
          <div className="mb-6">
            <input
              type="text"
              placeholder="Enter a description for your reel..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          <button 
            onClick={isRecording ? stopRecording : () => startRecording(onCancel)}
            disabled={isStarting}
            className={`w-full relative overflow-hidden rounded-full font-bold text-lg text-white shadow-[0_0_40px_rgba(236,72,153,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${isRecording ? 'border-2 border-red-500' : ''}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500" />
            <div className="relative py-4 flex items-center justify-center gap-2">
              {isStarting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {uploadStatus || 'Uploading...'}
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-6 h-6 fill-white" />
                  STOP RECORDING (00:{timeLeft.toString().padStart(2, '0')})
                </>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  RECORD 10S REEL
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
