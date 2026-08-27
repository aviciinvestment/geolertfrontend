import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Circle, Rectangle, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Radio, Eye, MessageCircle, Heart, RefreshCw, Navigation, X, Clock, Route, Play, GripVertical, AlertTriangle, ChevronRight, PanelLeftOpen, Shield, MapPin, Menu, Info, Search, ChevronDown, Check, Layers, Activity, Lock, Unlock, TrendingUp, BarChart3, Target, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDraggable } from '../hooks/useDraggable';
import { ReelPlayer } from './ReelPlayer';
import { StreamService, Stream } from '../services/StreamService';
import { NotificationToasts } from '../components/NotificationToasts';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

const CLOSE_RANGE = 3.5;
const SCAN_RANGE = 30;

function severityColor(severity: number): string {
  if (severity >= 0.8) return '#ef4444';
  if (severity >= 0.6) return '#f97316';
  if (severity >= 0.4) return '#eab308';
  return '#22c55e';
}

function severityLabel(severity: number): string {
  if (severity >= 0.9) return 'CRITICAL';
  if (severity >= 0.7) return 'HIGH';
  if (severity >= 0.5) return 'MODERATE';
  if (severity >= 0.3) return 'LOW';
  return 'SAFE';
}

function severityBg(severity: number): string {
  if (severity >= 0.8) return 'bg-red-500';
  if (severity >= 0.6) return 'bg-orange-500';
  if (severity >= 0.4) return 'bg-yellow-500';
  return 'bg-green-500';
}

function createPostIcon(severity: number): L.DivIcon {
  const color = severityColor(severity);
  const size = severity >= 0.7 ? 18 : severity >= 0.4 ? 15 : 13;
  const glow = severity >= 0.7
    ? `0 0 14px ${color}88, 0 0 4px ${color}`
    : severity >= 0.4
    ? `0 0 10px ${color}66`
    : `0 0 6px ${color}44`;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid white;border-radius:50%;box-shadow:${glow};${severity >= 0.7 ? 'animation:pulse 2s infinite;' : ''}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: '',
  html: `<div style="width:20px;height:20px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 15px rgba(239,68,68,0.8);display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:white;border-radius:50%;"></div></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function DraggablePanel({ x, y, locked, onToggleLock, onPointerDown, onPointerMove, onPointerUp, children }: {
  x: number; y: number;
  locked: boolean;
  onToggleLock: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{ position: 'absolute', left: x, top: y, zIndex: 30, opacity: locked ? 0.9 : 1 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          className={`absolute -top-1.5 -right-1.5 z-50 w-5 h-5 rounded-full flex items-center justify-center transition-all ${locked ? 'bg-amber-500/90 text-black shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'bg-white/10 text-gray-500 hover:bg-white/20 hover:text-gray-300'}`}
          title={locked ? 'Unlock position' : 'Lock position'}
        >
          {locked ? <Lock size={10} /> : <Unlock size={10} />}
        </button>
        {children}
      </div>
    </div>
  );
}

interface RouteInfo {
  coordinates: [number, number][];
  distanceMiles: number;
  durationMin: number;
  destination: { lat: number; lng: number };
  postUsername: string;
}

function Grip() {
  return <GripVertical className="w-4 h-4 text-gray-500 cursor-grab active:cursor-grabbing" />;
}

function FlyToPosition({ position }: { position: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (position.lat !== 0 && position.lng !== 0) {
      map.flyTo([position.lat, position.lng], map.getZoom(), { duration: 1.2 });
    }
  }, [position.lat, position.lng]);
  return null;
}

function FlyToPost({ post }: { post: Stream }) {
  const map = useMap();
  useEffect(() => {
    if (post.location?.coordinates) {
      map.flyTo([post.location.coordinates[1], post.location.coordinates[0]], 15, { duration: 1.2 });
    }
  }, [post]);
  return null;
}

function ScanOverlay({ position, scanRange }: { position: { lat: number; lng: number }; scanRange: number }) {
  const milesPerDegLat = 1 / 69.0;
  const milesPerDegLng = 1 / (69.0 * Math.cos(position.lat * Math.PI / 180));
  const dLat = scanRange * milesPerDegLat;
  const dLng = scanRange * milesPerDegLng;
  return (
    <>
      <Circle center={[position.lat, position.lng]} radius={scanRange * 1609.34} pathOptions={{ color: '#6366f1', weight: 1.5, opacity: 0.4, fillOpacity: 0.06, dashArray: '10 6' }} />
      <Circle center={[position.lat, position.lng]} radius={CLOSE_RANGE * 1609.34} pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.5, fillOpacity: 0.08, dashArray: '4 4' }} />
      <Rectangle
        bounds={[[position.lat - dLat, position.lng - dLng], [position.lat + dLat, position.lng + dLng]]}
        pathOptions={{ color: '#6366f1', weight: 1, opacity: 0.2, fillOpacity: 0.03, dashArray: '6 4' }}
      />
    </>
  );
}

function FitRoute({ route }: { route: RouteInfo }) {
  const map = useMap();
  useEffect(() => {
    if (route.coordinates.length > 0) {
      const bounds = L.latLngBounds(route.coordinates);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1 });
    }
  }, [route]);
  return null;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function renderFormattedText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*([\s\S]+?)\*\*\*|\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|___([\s\S]+?)___|__([\s\S]+?)__|_([\s\S]+?)_|~~([\s\S]+?)~~|`([\s\S]+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++} className="font-bold italic text-white">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<strong key={key++} className="font-bold text-white">{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={key++} className="italic text-gray-300">{match[4]}</em>);
    } else if (match[5]) {
      parts.push(<strong key={key++} className="font-bold italic text-white">{match[5]}</strong>);
    } else if (match[6]) {
      parts.push(<strong key={key++} className="font-bold text-white">{match[6]}</strong>);
    } else if (match[7]) {
      parts.push(<em key={key++} className="italic text-gray-300">{match[7]}</em>);
    } else if (match[8]) {
      parts.push(<del key={key++} className="line-through text-gray-500">{match[8]}</del>);
    } else if (match[9]) {
      parts.push(<code key={key++} className="bg-white/10 text-blue-300 px-1 py-0.5 rounded text-xs font-mono">{match[9]}</code>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

export function MissionPlannerView() {
  const { user } = useAuth();
  const [liveSocket, setLiveSocket] = useState<Socket | null>(null);
  const [position, setPosition] = useState({ lat: 0, lng: 0 });
  const [postsWithLocation, setPostsWithLocation] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReel, setSelectedReel] = useState<Stream | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<Stream | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ critical: true, high: true, moderate: true, safe: true });
  const [filterSectionOpen, setFilterSectionOpen] = useState(true);
  const [routeLoading, setRouteLoading] = useState(false);
  const [scanRange, setScanRange] = useState(() => {
    try { return Number(localStorage.getItem('geolert_scan_range')) || SCAN_RANGE; } catch { return SCAN_RANGE; }
  });
  const [selectedReelAddress, setSelectedReelAddress] = useState<string>('');
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    try { localStorage.setItem('geolert_scan_range', String(scanRange)); } catch {}
  }, [scanRange]);

  const defaultCenter: [number, number] = position.lat !== 0 ? [position.lat, position.lng] : [41.9028, 12.4964];

  const statusDrag = useDraggable(260, 80, 'mp_status');
  const refreshDrag = useDraggable(420, 16, 'mp_refresh');
  const routeDrag = useDraggable(240, 300, 'mp_route');
  const legendDrag = useDraggable(290, 420, 'mp_legend');
  const activityDrag = useDraggable(260, 530, 'mp_activity');
  const locationDrag = useDraggable(290, 630, 'mp_location');
  const analyticsDrag = useDraggable(300, 100, 'mp_analytics');

  const closePosts = postsWithLocation.filter(p => (p.distanceMiles ?? 0) <= CLOSE_RANGE);
  const farPosts = postsWithLocation.filter(p => (p.distanceMiles ?? 0) > CLOSE_RANGE && (p.distanceMiles ?? 0) <= scanRange);
  const criticalCount = postsWithLocation.filter(p => (p.severity ?? 0) >= 0.7).length;

  const filteredPosts = postsWithLocation.filter(post => {
    const sev = post.severity ?? 0;
    if (sev >= 0.8 && !filters.critical) return false;
    if (sev >= 0.6 && sev < 0.8 && !filters.high) return false;
    if (sev >= 0.4 && sev < 0.6 && !filters.moderate) return false;
    if (sev < 0.4 && !filters.safe) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (post.isAnonymous ? 'anonymous' : post.username).toLowerCase();
      const desc = (post.description || '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const displayPosts = filteredPosts;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition({ lat: 41.9028, lng: 12.4964 }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!selectedReel?.location?.coordinates) { setSelectedReelAddress(''); return; }
    const lng = selectedReel.location.coordinates[0];
    const lat = selectedReel.location.coordinates[1];
    setSelectedReelAddress('Loading...');
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(r => r.json())
      .then(data => {
        setSelectedReelAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      })
      .catch(() => {
        setSelectedReelAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });
  }, [selectedReel]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Authorities only see incidents routed to them (AI category +
      // jurisdiction + specialization aware).
      const feeds =
        user?.role === 'authority'
          ? await StreamService.getAssignedReels()
          : await StreamService.getFeed();
      const withLocation = feeds.filter(s => s.location && s.location.coordinates);
      setPostsWithLocation(withLocation);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Live socket: refresh reported posts + receive admin broadcasts in real time
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    setLiveSocket(socket);
    socket.on('new_reel', () => fetchPosts());
    socket.on('reel_analysis_updated', () => fetchPosts());
    return () => {
      socket.off('new_reel');
      socket.off('reel_analysis_updated');
      setLiveSocket(null);
      socket.disconnect();
    };
  }, [fetchPosts]);

  useEffect(() => {
    if (showAnalytics && !analyticsData) {
      setAnalyticsLoading(true);
      StreamService.getAnalytics().then(data => {
        setAnalyticsData(data);
        setAnalyticsLoading(false);
      });
    }
  }, [showAnalytics, analyticsData]);

  const handleNavigate = useCallback(async (post: Stream) => {
    if (!post.location?.coordinates || position.lat === 0) return;
    const destLat = post.location.coordinates[1];
    const destLng = post.location.coordinates[0];

    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${position.lng},${position.lat};${destLng},${destLat}?overview=simplified&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes?.length > 0) {
        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setActiveRoute({
          coordinates: coords,
          distanceMiles: Math.round((route.distance / 1609.34) * 10) / 10,
          durationMin: Math.round(route.duration / 60),
          destination: { lat: destLat, lng: destLng },
          postUsername: post.isAnonymous ? 'Anonymous' : post.username,
        });
      } else {
        const R = 3958.8;
        const dLat = (destLat - position.lat) * Math.PI / 180;
        const dLng = (destLng - position.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(position.lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const distMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setActiveRoute({
          coordinates: [[position.lat, position.lng], [destLat, destLng]],
          distanceMiles: Math.round(distMiles * 10) / 10,
          durationMin: Math.round((distMiles * 1.60934 / 40) * 60),
          destination: { lat: destLat, lng: destLng },
          postUsername: post.isAnonymous ? 'Anonymous' : post.username,
        });
      }
    } catch {
      const R = 3958.8;
      const dLat = (destLat - position.lat) * Math.PI / 180;
      const dLng = (destLng - position.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(position.lat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setActiveRoute({
        coordinates: [[position.lat, position.lng], [destLat, destLng]],
        distanceMiles: Math.round(distMiles * 10) / 10,
        durationMin: Math.round((distMiles * 1.60934 / 40) * 60),
        destination: { lat: destLat, lng: destLng },
        postUsername: post.isAnonymous ? 'Anonymous' : post.username,
      });
    } finally {
      setRouteLoading(false);
    }
  }, [position]);

  const handleViewReel = useCallback((post: Stream) => {
    setSelectedReel(post);
    setSidebarOpen(true);
    setFlyToTarget(post);
    setMessageExpanded(false);
  }, []);

  const handleSidebarBack = useCallback(() => {
    setSelectedReel(null);
    setFlyToTarget(null);
  }, []);

  const handleResolve = useCallback(async (reelId: string, resolution: 'attended' | 'false_report' | 'pending') => {
    setResolvingId(reelId);
    try {
      const res = await StreamService.resolveReel(reelId, resolution);
      if (res.success) {
        setPostsWithLocation(prev => prev.map(p => p._id === reelId ? { ...p, status: resolution } : p));
        if (selectedReel?._id === reelId) {
          setSelectedReel(prev => prev ? { ...prev, status: resolution } : prev);
        }
      }
    } catch (err) {
      console.error('Failed to resolve reel:', err);
    } finally {
      setResolvingId(null);
    }
  }, [selectedReel]);

  return (
    <div className="relative w-full h-[100dvh] bg-[#0b0e14] overflow-hidden font-sans text-gray-200">
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }`}</style>

      {/* Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer ref={mapRef} center={defaultCenter} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" maxZoom={19} opacity={0.5} />
          {position.lat !== 0 && <ScanOverlay position={position} scanRange={scanRange} />}
          {activeRoute && (
            <>
              <Polyline positions={activeRoute.coordinates} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }} />
              <Marker position={[activeRoute.destination.lat, activeRoute.destination.lng]} icon={destinationIcon} />
              <FitRoute route={activeRoute} />
            </>
          )}
          {position.lat !== 0 && (
            <>
              <FlyToPosition position={position} />
              <Marker position={[position.lat, position.lng]} icon={userIcon} />
            </>
          )}
          {flyToTarget && <FlyToPost post={flyToTarget} />}
          {postsWithLocation.filter(p => (p.status || 'pending') === 'pending').map(post => {
            const lat = post.location!.coordinates[1];
            const lng = post.location!.coordinates[0];
            const sev = post.severity ?? 0;
            return (
              <Marker key={post._id} position={[lat, lng]} icon={createPostIcon(sev)}>
                <Popup>
                  <div className="font-sans text-xs min-w-[170px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${severityBg(sev)}`} />
                      <span className="font-bold text-sm text-gray-800">{post.username}</span>
                    </div>
                    <div className={`text-[9px] font-bold mb-1 ${sev >= 0.7 ? 'text-red-500' : sev >= 0.4 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {severityLabel(sev)} THREAT
                    </div>
                    {post.description && <div className="text-gray-600 mb-1 line-clamp-2">{post.description}</div>}
                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                      <span>{post.distanceMiles !== undefined ? `${post.distanceMiles} mi` : ''}</span>
                      <span>{timeAgo(post.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                      <span className="flex items-center gap-0.5"><Heart size={10} /> {post.likes}</span>
                      <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {post.comments}</span>
                      <span className="flex items-center gap-0.5"><Eye size={10} /> {post.views}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {position.lat !== 0 && (
                        <button onClick={(e) => { e.stopPropagation(); handleNavigate(post); }}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1.5 px-2 rounded transition-colors">
                          <Navigation size={11} />Navigate
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleViewReel(post); }}
                        className="flex-1 flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold py-1.5 px-2 rounded transition-colors">
                        <Play size={11} />View Reel
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Adjustible bars style upgrade */}
      <DraggablePanel {...statusDrag}>
        <div className="pointer-events-auto bg-[#1a1e24]/95 border border-white/5 p-3.5 rounded-xl shadow-2xl backdrop-blur-md max-w-[220px] relative text-gray-300">
          <Grip />
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <Radio className="w-4 h-4 animate-pulse text-blue-500" />
            <span className="text-[12px] font-semibold tracking-wider text-white">GEOALERT</span>
          </div>
          <div className="space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-400">Posts in range</span><span className="font-medium text-white">{loading ? '...' : postsWithLocation.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Active ({CLOSE_RANGE} mi)</span><span className="font-medium text-blue-400">{loading ? '...' : closePosts.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">View only ({scanRange} mi)</span><span className="font-medium text-amber-400">{loading ? '...' : farPosts.length}</span></div>
            {criticalCount > 0 && (
              <div className="flex justify-between mt-2 pt-2 border-t border-white/5"><span className="text-red-400/80">Critical alerts</span><span className="font-bold text-red-500 bg-red-500/10 px-1.5 rounded">{criticalCount}</span></div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400">SCAN RADIUS</span>
              <span className="text-[11px] font-bold text-blue-400">{scanRange} mi</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={1}
              value={scanRange}
              onChange={(e) => setScanRange(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(59,130,246,0.6)] [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
              <span>5 mi</span>
              <span>100 mi</span>
            </div>
          </div>
        </div>
      </DraggablePanel>

      <DraggablePanel {...refreshDrag}>
        <div className="pointer-events-auto flex gap-2">
          {routeLoading && (
            <div className="bg-blue-600/90 border border-blue-400/30 px-3 py-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-2">
              <Route className="w-4 h-4 animate-pulse text-white" /><span className="text-[11px] font-medium text-white">Calculating route...</span>
            </div>
          )}
          <button onClick={fetchPosts} className="bg-[#1a1e24]/95 border border-white/5 p-2.5 rounded-xl shadow-xl backdrop-blur-md hover:bg-white/10 transition-colors text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </DraggablePanel>

      {activeRoute && (
        <DraggablePanel {...routeDrag}>
          <div className="pointer-events-auto bg-[#1a1e24]/95 border border-blue-500/30 p-3.5 rounded-xl shadow-[0_4px_24px_rgba(59,130,246,0.15)] backdrop-blur-md max-w-[220px] relative text-gray-300">
            <Grip />
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2"><Navigation className="w-4 h-4 text-blue-500" /><span className="text-[12px] font-semibold tracking-wider text-blue-400">EN ROUTE</span></div>
              <button onClick={() => setActiveRoute(null)} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1 rounded-full"><X size={12} /></button>
            </div>
            <div className="text-[11px] mb-3 text-gray-400">To: <span className="font-medium text-white">{activeRoute.postUsername}</span></div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center gap-2 bg-white/5 rounded-md p-1.5"><Route className="w-3.5 h-3.5 text-blue-500/80" /><span className="text-gray-400">Distance</span><span className="font-semibold text-white ml-auto">{activeRoute.distanceMiles} mi</span></div>
              <div className="flex items-center gap-2 bg-white/5 rounded-md p-1.5"><Clock className="w-3.5 h-3.5 text-blue-500/80" /><span className="text-gray-400">ETA</span><span className="font-semibold text-white ml-auto">{formatDuration(activeRoute.durationMin)}</span></div>
            </div>
          </div>
        </DraggablePanel>
      )}

      <DraggablePanel {...legendDrag}>
        <div className="pointer-events-auto bg-[#1a1e24]/95 border border-white/5 p-3 rounded-xl shadow-xl backdrop-blur-md relative text-gray-300">
          <Grip />
          <div className="text-[10px] font-semibold mb-2 tracking-wider text-gray-400">LEGEND</div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" /><span>Your location</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" /><span>Critical (0.8+)</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /><span>High (0.6-0.8)</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><span>Moderate (0.4-0.6)</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span>Safe (0.0-0.4)</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-0.5 rounded bg-indigo-400 opacity-60" /><span>Scan ({scanRange} mi)</span></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-0.5 rounded bg-blue-500 opacity-60" /><span>Active zone ({CLOSE_RANGE} mi)</span></div>
          </div>
        </div>
      </DraggablePanel>

      <DraggablePanel {...activityDrag}>
        <div className="pointer-events-auto bg-[#1a1e24]/95 border border-white/5 p-3.5 rounded-xl shadow-xl backdrop-blur-md max-w-[200px] relative text-gray-300">
          <Grip />
          <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-[11px] font-semibold tracking-wider text-white">RECENT ACTIVITY</span>
          </div>
          <div className="space-y-2 text-[11px]">
            {postsWithLocation.length === 0 && !loading && <div className="text-gray-500">No posts in range</div>}
            {postsWithLocation.slice(0, 5).map(post => {
              const sev = post.severity ?? 0;
              return (
                <div key={post._id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${severityBg(sev)} shadow-sm`} />
                  <span className="truncate text-gray-300">{post.isAnonymous ? 'Anonymous' : post.username}</span>
                  <span className="text-gray-500 ml-auto flex-shrink-0">{post.distanceMiles !== undefined ? `${post.distanceMiles}mi` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </DraggablePanel>

      <DraggablePanel {...locationDrag}>
        <div className="pointer-events-auto bg-[#1a1e24]/95 border border-white/5 px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md relative">
          <Grip />
          <div className="flex gap-4 text-[10px] tracking-widest">
            <div className="flex flex-col"><span className="text-gray-500 font-medium">LAT</span><span className="font-mono text-white text-[12px]">{position.lat !== 0 ? position.lat.toFixed(4) : '---'}</span></div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col"><span className="text-gray-500 font-medium">LNG</span><span className="font-mono text-white text-[12px]">{position.lng !== 0 ? position.lng.toFixed(4) : '---'}</span></div>
          </div>
        </div>
      </DraggablePanel>

      {showAnalytics && (
        <DraggablePanel {...analyticsDrag}>
          <div className="pointer-events-auto bg-[#1a1e24]/95 border border-white/5 p-4 rounded-xl shadow-2xl backdrop-blur-md w-[520px] max-h-[80vh] overflow-y-auto no-scrollbar relative text-gray-300">
            <Grip />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" />
                <span className="text-[12px] font-semibold tracking-wider text-white">ANALYTICS</span>
              </div>
              <button onClick={() => setShowAnalytics(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {analyticsLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw size={18} className="animate-spin text-blue-500" />
              </div>
            ) : analyticsData ? (
              <div className="space-y-4">
                {/* Overall Stats Grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Total', value: analyticsData.overall.totalEvents, icon: <Radio size={12} />, color: 'text-white' },
                    { label: 'Attended', value: analyticsData.overall.totalAttended, icon: <CheckCircle2 size={12} />, color: 'text-emerald-400' },
                    { label: 'False', value: analyticsData.overall.totalFalse, icon: <XCircle size={12} />, color: 'text-red-400' },
                    { label: 'Pending', value: analyticsData.overall.totalPending, icon: <Clock size={12} />, color: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#111317] rounded-lg p-2.5 text-center">
                      <div className={`flex items-center justify-center gap-1 mb-1 ${s.color}`}>{s.icon}<span className="text-[16px] font-bold">{s.value}</span></div>
                      <div className="text-[9px] text-gray-500 font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#111317] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target size={12} className="text-blue-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Resolution Rate</span>
                    </div>
                    <span className="text-[20px] font-bold text-white">{analyticsData.overall.resolutionRate}%</span>
                  </div>
                  <div className="bg-[#111317] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={12} className="text-amber-400" />
                      <span className="text-[10px] text-gray-400 font-medium">Avg Time to Resolve</span>
                    </div>
                    <span className="text-[20px] font-bold text-white">{analyticsData.overall.avgTimeToResolveHours}h</span>
                  </div>
                </div>

                {/* Severity Distribution */}
                <div className="bg-[#111317] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={12} className="text-orange-400" />
                    <span className="text-[10px] text-gray-400 font-medium">SEVERITY DISTRIBUTION</span>
                  </div>
                  <div className="flex gap-3">
                    {[
                      { label: 'Critical', value: analyticsData.severityDist.critical, color: 'bg-red-500', textColor: 'text-red-400' },
                      { label: 'High', value: analyticsData.severityDist.high, color: 'bg-orange-500', textColor: 'text-orange-400' },
                      { label: 'Low', value: analyticsData.severityDist.low, color: 'bg-green-500', textColor: 'text-green-400' },
                    ].map(s => (
                      <div key={s.label} className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] ${s.textColor}`}>{s.label}</span>
                          <span className="text-[12px] font-bold text-white">{s.value}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${s.color} rounded-full`} style={{ width: `${analyticsData.overall.totalEvents > 0 ? (s.value / analyticsData.overall.totalEvents) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Events Chart */}
                <div className="bg-[#111317] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp size={12} className="text-blue-400" />
                    <span className="text-[10px] text-gray-400 font-medium">DAILY EVENTS (30 DAYS)</span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={analyticsData.daily}>
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradAttended" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#1a1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="url(#gradTotal)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="attended" stroke="#10b981" fill="url(#gradAttended)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="false_report" stroke="#ef4444" fill="none" strokeWidth={1} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-blue-500 rounded" /><span className="text-[9px] text-gray-500">Total</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-emerald-500 rounded" /><span className="text-[9px] text-gray-500">Attended</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-red-500 rounded border-dashed" /><span className="text-[9px] text-gray-500">False</span></div>
                  </div>
                </div>

                {/* Monthly Bar Chart */}
                <div className="bg-[#111317] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <BarChart3 size={12} className="text-violet-400" />
                    <span className="text-[10px] text-gray-400 font-medium">MONTHLY BREAKDOWN</span>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={analyticsData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#6b7280' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#1a1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="attended" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="false_report" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="pending" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 justify-center">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-sm" /><span className="text-[9px] text-gray-500">Attended</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-sm" /><span className="text-[9px] text-gray-500">False</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-sm" /><span className="text-[9px] text-gray-500">Pending</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 text-xs py-12">No data available</div>
            )}
          </div>
        </DraggablePanel>
      )}

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-50 bg-[#1a1e24]/95 border border-white/5 p-2.5 rounded-xl shadow-xl backdrop-blur-md hover:bg-white/10 transition-colors text-white"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      {/* REEL SIDEBAR - Image-based Redesign */}
      {sidebarOpen && (
        <div className="absolute top-0 left-0 z-40 h-full flex shadow-[8px_0_32px_rgba(0,0,0,0.6)]">
          {/* Thin Left Nav Strip */}
          <div className="w-14 h-full bg-[#111317] border-r border-white/5 flex flex-col items-center py-5 gap-6 z-10 flex-shrink-0">
             <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white transition-colors mb-2">
               <Menu size={20} />
             </button>
             <button className="text-blue-500 relative">
               <MapPin size={22} />
               <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
             </button>
              <button onClick={() => { setShowAnalytics(!showAnalytics); }} className={`transition-colors ${showAnalytics ? 'text-blue-500 relative' : 'text-gray-500 hover:text-white'}`}>
                <Activity size={20} />
                {showAnalytics && <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
              </button>
             <button className="text-gray-500 hover:text-white transition-colors"><Layers size={20} /></button>
          </div>

          <div className="relative w-[360px] h-full bg-[#161a20] flex flex-col border-r border-white/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-5 border-b border-white/5 flex-shrink-0">
              <h1 className="text-lg font-semibold text-white tracking-wide">
                {selectedReel ? 'Apparatus Detail' : 'Map'}
              </h1>
              <Info size={16} className="text-gray-500 cursor-pointer" />
            </div>

            <div className={`flex-1 min-h-0 ${selectedReel ? 'overflow-hidden pb-0' : 'overflow-y-auto no-scrollbar pb-6'} flex flex-col`}>
              {!selectedReel ? (
                <>
                  {/* Filters Accordion */}
                  <div className="px-5 py-4 border-b border-white/5">
                    <div 
                      className="flex items-center justify-between cursor-pointer group mb-1" 
                      onClick={() => setFilterSectionOpen(!filterSectionOpen)}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                        <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                        Events
                      </div>
                      <ChevronDown size={14} className={`text-gray-500 transition-transform ${filterSectionOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {filterSectionOpen && (
                      <div className="pl-4 mt-3 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.critical} onChange={(e) => setFilters(prev => ({...prev, critical: e.target.checked}))} className="hidden" />
                          <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${filters.critical ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}`}>
                            {filters.critical && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-[13px] ${filters.critical ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>Critical (0.8+)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.high} onChange={(e) => setFilters(prev => ({...prev, high: e.target.checked}))} className="hidden" />
                          <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${filters.high ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}`}>
                            {filters.high && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-[13px] ${filters.high ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>High (0.6-0.8)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.moderate} onChange={(e) => setFilters(prev => ({...prev, moderate: e.target.checked}))} className="hidden" />
                          <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${filters.moderate ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}`}>
                            {filters.moderate && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-[13px] ${filters.moderate ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>Moderate (0.4-0.6)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={filters.safe} onChange={(e) => setFilters(prev => ({...prev, safe: e.target.checked}))} className="hidden" />
                          <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors ${filters.safe ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-600 group-hover:border-gray-400'}`}>
                            {filters.safe && <Check size={12} className="text-white" />}
                          </div>
                          <span className={`text-[13px] ${filters.safe ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>Safe (0.0-0.4)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Search and List */}
                  <div className="flex-1 flex flex-col pt-4">
                    <div className="px-5 mb-4">
                      <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 uppercase">ALL EVENTS</div>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#111317] text-white text-sm rounded-lg pl-4 pr-10 py-2.5 border border-white/5 focus:outline-none focus:border-blue-500/50 placeholder-gray-500" 
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      </div>
                    </div>

                    <div className="px-4">
                      {/* Table Header */}
                      <div className="flex text-[10px] text-gray-500 font-medium px-2 py-2 mb-1">
                        <div className="flex-1 flex items-center gap-1 cursor-pointer">Event <ChevronDown size={12} /></div>
                        <div className="w-20 flex items-center gap-1 cursor-pointer justify-center">Status</div>
                        <div className="w-14 flex items-center gap-1 cursor-pointer justify-end">Route <ChevronDown size={12} /></div>
                      </div>

                      {/* List Items */}
                      <div className="space-y-1">
                        {displayPosts.length === 0 && !loading && (
                          <div className="text-center text-gray-500 text-xs py-8">No events found</div>
                        )}
                        {loading && (
                          <div className="flex items-center justify-center gap-2 py-8">
                            <RefreshCw size={14} className="animate-spin text-blue-500" />
                            <span className="text-xs text-gray-500">Loading...</span>
                          </div>
                        )}
                        {displayPosts.map(post => {
                          const sev = post.severity ?? 0;
                          const hasAnalysis = !!post.aiAnalysis?.summary;
                          const isBoosted = (post.engagementPriority ?? 0) > sev;
                          const postStatus = post.status || 'pending';
                          const isResolving = resolvingId === post._id;

                          return (
                            <div
                              key={post._id}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-white/5 transition-colors group flex items-start gap-3"
                            >
                              <button onClick={() => handleViewReel(post)} className="flex-1 flex items-start gap-3 min-w-0">
                              <div className="mt-1 flex-shrink-0">
                                {sev >= 0.7 ? (
                                  <div className="bg-red-500/20 p-1 rounded">
                                    <AlertTriangle size={14} className="text-red-500 fill-red-500" />
                                  </div>
                                ) : sev >= 0.4 ? (
                                  <div className="bg-yellow-500/20 p-1 rounded flex flex-col gap-[2px]">
                                    <div className="w-3.5 h-0.5 bg-yellow-500" />
                                    <div className="w-3.5 h-0.5 bg-yellow-500" />
                                    <div className="w-3.5 h-0.5 bg-yellow-500" />
                                  </div>
                                ) : (
                                  <div className="bg-green-500/20 p-1 rounded">
                                    <Radio size={14} className="text-green-500" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                  <span className="text-[13px] text-gray-200 font-medium truncate">{post.isAnonymous ? 'Anonymous' : post.username}</span>
                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <span className="text-[11px] text-gray-400 w-12 text-right">{post.distanceMiles !== undefined ? `${post.distanceMiles}mi` : ''}</span>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="text-[11px] text-gray-500 truncate flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold ${sev >= 0.7 ? 'bg-red-500/20 text-red-400' : sev >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                      {severityLabel(sev)}
                                    </span>
                                    <span className="truncate">{hasAnalysis ? post.aiAnalysis!.summary : (post.description || 'No description')}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-4 overflow-hidden">
                                    <span className="flex items-center gap-1"><Heart size={10} /> {post.likes}</span>
                                    <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.comments}</span>
                                    {isBoosted && <span className="text-orange-400">BOOSTED</span>}
                                    <span>{timeAgo(post.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                              </button>
                              <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                                {postStatus === 'pending' ? (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleResolve(post._id, 'attended'); }}
                                      disabled={isResolving}
                                      className="px-2 py-1 rounded-md text-[9px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                                      title="Mark as Attended"
                                    >
                                      {isResolving ? '...' : 'Attended'}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleResolve(post._id, 'false_report'); }}
                                      disabled={isResolving}
                                      className="px-2 py-1 rounded-md text-[9px] font-bold bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                                      title="Mark as False Report"
                                    >
                                      {isResolving ? '...' : 'False'}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleResolve(post._id, 'pending'); }}
                                    disabled={isResolving}
                                    className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold transition-all cursor-pointer disabled:opacity-40 ${
                                      postStatus === 'attended'
                                        ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40'
                                        : 'bg-red-500/30 text-red-300 ring-1 ring-red-500/40'
                                    }`}
                                    title="Click to revert"
                                  >
                                    {isResolving ? '...' : postStatus === 'attended' ? '✓ Attended' : '✗ False'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* REEL DETAIL VIEW - Styled to match popup cards in image */
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="px-4 pt-2 pb-1 flex-shrink-0">
                    <button onClick={handleSidebarBack} className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-medium">
                      <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to map
                    </button>
                  </div>

                  {/* Reel at the top */}
                  <div className="flex-1 min-h-0 mx-3 bg-black rounded-2xl overflow-hidden border border-white/5 relative shadow-xl">
                    <ReelPlayer
                      stream={selectedReel}
                      compact
                      onLike={() => {
                        setSelectedReel(prev => prev ? { ...prev, likes: prev.likes + 1, isLikedByMe: true } : prev);
                        StreamService.likeReel(selectedReel._id);
                      }}
                      onProfileClick={() => {}}
                    />
                  </div>

                  {/* Bottom details - scrollable */}
                  <div className="flex-shrink-0 max-h-[30%] overflow-y-auto no-scrollbar px-3 pb-3 pt-2 space-y-2">
                    {/* Current message card - expandable */}
                    <div className="bg-[#1a1e24] border border-white/5 rounded-xl p-3">
                      <h3 className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2 uppercase">Occurrence Narration</h3>
                      <div className="bg-[#111317] rounded-lg p-2.5 flex gap-2.5">
                        <AlertTriangle size={16} className={selectedReel.severity! >= 0.7 ? 'text-red-500' : 'text-yellow-500'} />
                        <div className="flex-1 min-w-0">
                          {/* Lead narration — AI summary or reporter caption */}
                          <p className={`text-[12px] text-gray-100 leading-relaxed font-medium ${!messageExpanded ? 'line-clamp-2' : ''}`}>
                            {renderFormattedText(selectedReel.aiAnalysis?.summary || selectedReel.description || 'No details available')}
                          </p>

                          {/* Full narration revealed on expand */}
                          {messageExpanded && (
                            <div className="mt-2 space-y-2">
                              {selectedReel.aiAnalysis?.severityReason && (
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-0.5">Why it's rated {severityLabel(selectedReel.severity ?? 0)}</p>
                                  <p className="text-[11px] text-gray-300 leading-relaxed">
                                    {renderFormattedText(selectedReel.aiAnalysis.severityReason)}
                                  </p>
                                </div>
                              )}
                              {selectedReel.aiAnalysis?.description && (
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-0.5">What was captured</p>
                                  <p className="text-[11px] text-gray-300 leading-relaxed">
                                    {renderFormattedText(selectedReel.aiAnalysis.description)}
                                  </p>
                                </div>
                              )}
                              {selectedReel.aiAnalysis?.transcript && (
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-0.5">Voice transcript</p>
                                  <blockquote className="border-l-2 border-blue-500/50 pl-2 py-0.5 text-[11px] italic text-gray-400 leading-relaxed">
                                    "{renderFormattedText(selectedReel.aiAnalysis.transcript)}"
                                  </blockquote>
                                </div>
                              )}
                              {selectedReel.aiAnalysis?.summary && selectedReel.description && (
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-0.5">Reporter's caption</p>
                                  <p className="text-[11px] text-gray-400 leading-relaxed">
                                    {renderFormattedText(selectedReel.description)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {(messageExpanded ||
                            selectedReel.aiAnalysis?.severityReason ||
                            selectedReel.aiAnalysis?.description ||
                            selectedReel.aiAnalysis?.transcript ||
                            (selectedReel.aiAnalysis?.summary && selectedReel.description) ||
                            (!selectedReel.aiAnalysis?.summary && selectedReel.description && selectedReel.description.length > 90)) && (
                            <button
                              onClick={() => setMessageExpanded(prev => !prev)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium mt-1 transition-colors"
                            >
                              {messageExpanded ? 'See less' : 'See full narration'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User info card at the bottom */}
                    <div className="bg-[#1a1e24] border border-white/5 rounded-xl relative overflow-hidden">
                      <div className={`h-0.5 w-full ${selectedReel.severity! >= 0.7 ? 'bg-red-500' : selectedReel.severity! >= 0.4 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                      <div className="p-3">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedReel.severity! >= 0.7 ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : selectedReel.severity! >= 0.4 ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30' : 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'}`}>
                          {selectedReel.isAnonymous ? '?' : selectedReel.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{selectedReel.isAnonymous ? 'Anonymous' : selectedReel.username}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${selectedReel.severity! >= 0.7 ? 'bg-red-500/20 text-red-400' : selectedReel.severity! >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                              {severityLabel(selectedReel.severity ?? 0)}
                            </span>
                            <span className="text-[9px] text-gray-500">#{selectedReel._id.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.6)] cursor-pointer hover:bg-blue-400 transition-colors flex-shrink-0" onClick={() => handleNavigate(selectedReel)}>
                          <Navigation size={12} className="text-white" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                          <MapPin size={10} className="text-gray-500 flex-shrink-0" />
                          <span className="text-[10px] text-gray-300 break-words leading-relaxed">{selectedReelAddress || 'Resolving address...'}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <div className="flex-1 flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                            <Route size={10} className="text-blue-400/80 flex-shrink-0" />
                            <span className="text-[10px] text-gray-400">Dist</span>
                            <span className="text-[10px] font-semibold text-white ml-auto">{selectedReel.distanceMiles}mi</span>
                          </div>
                          <div className="flex-1 flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
                            <span className="text-[10px] text-gray-400">Status</span>
                            <span className="text-[10px] font-semibold text-green-400 ml-auto">Active</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <NotificationToasts socket={liveSocket} userId={user?.id} />
    </div>
  );
}
