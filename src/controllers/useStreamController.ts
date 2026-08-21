import { useState, useRef, useEffect } from 'react';
import { StreamService } from '../services/StreamService';

export function useStreamController() {
  const [isStarting, setIsStarting] = useState(false);
  const [title, setTitle] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Optional callback to notify the view when upload finishes
  const onUploadSuccessRef = useRef<(() => void) | null>(null);

  // Initialize camera preview
  useEffect(() => {
    let cancelled = false;
    
    const initCamera = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to access camera", err);
      }
    };

    initCamera();

    return () => {
      cancelled = true;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const doUpload = async (file: File) => {
    setIsStarting(true);
    setUploadStatus('Uploading video...');
    // Delay to let the UI render the status before the heavy work begins
    await new Promise(r => setTimeout(r, 100));
    const res = await StreamService.uploadReel(file, title || "My New Reel", isAnonymous);
    setIsStarting(false);
    setUploadStatus(null);
    
    if (res.success && onUploadSuccessRef.current) {
      onUploadSuccessRef.current();
    }
  };

  const startRecording = (onSuccess?: () => void) => {
    if (onSuccess) onUploadSuccessRef.current = onSuccess;
    
    if (videoRef.current && mediaStreamRef.current) {
      recordedChunks.current = [];
      const stream = mediaStreamRef.current;
      
      const mimeTypeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=mp4a.40.2',
        'video/mp4',
      ];

      let selectedMime = '';
      for (const mime of mimeTypeCandidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const options: MediaRecorderOptions | undefined = selectedMime
        ? { mimeType: selectedMime }
        : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'video/mp4';
        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
        const blob = new Blob(recordedChunks.current, { type: mimeType });
        const file = new File([blob], `recorded-reel.${ext}`, { type: mimeType });
        doUpload(file);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setTimeLeft(10);
      
      let secondsLeft = 10;
      timerRef.current = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (isRecordingRef.current && mediaRecorderRef.current) {
            isRecordingRef.current = false;
            setIsRecording(false);
            mediaRecorderRef.current.stop();
          }
        } else {
          setTimeLeft(secondsLeft);
        }
      }, 1000);
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

  const flipCamera = async () => {
    if (isRecordingRef.current) return;

    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      // Release the old camera first so the device can switch
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: newFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setFacingMode(newFacing);
    } catch (err) {
      console.error("Failed to flip camera", err);
      // If flip failed, restart the previous camera
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        mediaStreamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (_) {
        console.error("Could not restart camera");
      }
    }
  };

  return {
    isStarting,
    title,
    setTitle,
    videoRef,
    isRecording,
    timeLeft,
    facingMode,
    isAnonymous,
    setIsAnonymous,
    startRecording,
    stopRecording,
    flipCamera,
    uploadStatus,
  };
}
