import { createContext, useContext, useState, ReactNode } from 'react';

interface AudioContextValue {
  muted: boolean;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextValue>({
  muted: true,
  toggleMute: () => {},
});

export function AudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true);

  const toggleMute = () => setMuted(prev => !prev);

  return (
    <AudioContext.Provider value={{ muted, toggleMute }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  return useContext(AudioContext);
}
