import { useState, useCallback, useRef, useEffect } from 'react';

export function useDraggable(defaultX: number, defaultY: number, storageKey?: string) {
  const [pos, setPos] = useState(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`geolert_drag_${storageKey}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { x: parsed.x, y: parsed.y };
        }
      } catch {}
    }
    return { x: defaultX, y: defaultY };
  });
  const [locked, setLocked] = useState(() => {
    if (storageKey) {
      try {
        return localStorage.getItem(`geolert_lock_${storageKey}`) === 'true';
      } catch {}
    }
    return false;
  });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`geolert_drag_${storageKey}`, JSON.stringify(pos));
      } catch {}
    }
  }, [pos.x, pos.y, storageKey]);

  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`geolert_lock_${storageKey}`, String(locked));
      } catch {}
    }
  }, [locked, storageKey]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (locked) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [locked]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onToggleLock = useCallback(() => setLocked(prev => !prev), []);

  return { x: pos.x, y: pos.y, locked, onToggleLock, onPointerDown, onPointerMove, onPointerUp };
}
