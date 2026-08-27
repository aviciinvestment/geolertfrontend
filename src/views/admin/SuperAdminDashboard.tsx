import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, ShieldAlert, Users, Radio, CheckCircle2, AlertTriangle, XCircle, MapPin, RefreshCw, ChevronDown, Eye, Heart, MessageCircle, Navigation, X, Clock } from 'lucide-react';
import L from 'leaflet';
import { PendingApprovals } from '../../components/PendingApprovals';
import { BroadcastModal } from '../../components/BroadcastModal';
import { ReportsList } from '../../components/ReportsList';
import { NotificationToasts } from '../../components/NotificationToasts';
import { StreamService, JurisdictionDashboard, JurisdictionMapReel, JurisdictionReport, Subordinate, Stream } from '../../services/StreamService';
import { ReelPlayer } from '../ReelPlayer';

const ALL_AREAS = '__all__';

function severityColor(severity: number): string {
  if (severity >= 0.8) return '#ef4444';
  if (severity >= 0.6) return '#f97316';
  if (severity >= 0.4) return '#eab308';
  return '#22c55e';
}

function severityLabel(severity: number): string {
  if (severity >= 0.8) return 'CRITICAL';
  if (severity >= 0.6) return 'HIGH';
  if (severity >= 0.4) return 'MEDIUM';
  return 'LOW';
}

const severityBadge: Record<string, string> = {
  CRITICAL: 'text-red-500 bg-red-500/10',
  HIGH: 'text-orange-500 bg-orange-500/10',
  MEDIUM: 'text-yellow-500 bg-yellow-500/10',
  LOW: 'text-green-500 bg-green-500/10',
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 24);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -35],
});

/** Heat ring around each report — green when attended, else severity color. */
function heatCircleOptions(reel: { severity: number; status: string }): {
  color: string;
  radius: number;
} {
  if (reel.status === 'attended') return { color: '#22c55e', radius: 2500 };
  const s = reel.severity;
  if (s >= 0.8) return { color: '#ef4444', radius: 6000 };
  if (s >= 0.6) return { color: '#f97316', radius: 5000 };
  if (s >= 0.4) return { color: '#eab308', radius: 4000 };
  return { color: '#22c55e', radius: 3000 };
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  const lastCenter = useRef<string>('');
  useEffect(() => {
    if (!center) return;
    const key = center.join(',');
    if (key !== lastCenter.current) {
      lastCenter.current = key;
      map.flyTo(center, Math.max(map.getZoom(), 10), { duration: 1 });
    }
  }, [center, map]);
  return null;
}

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedArea, setSelectedArea] = useState<string>(ALL_AREAS);
  const [data, setData] = useState<JurisdictionDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<JurisdictionMapReel | null>(null);
  const [incidentAddress, setIncidentAddress] = useState('');
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [admins, setAdmins] = useState<Subordinate[]>([]);
  const [adminId, setAdminId] = useState<string>('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastConfirmation, setBroadcastConfirmation] = useState<string | null>(null);
  const [liveSocket, setLiveSocket] = useState<Socket | null>(null);

  const jurisdictionLabel = data?.scope?.state
    ? `${data.scope.state}${data.scope.country ? `, ${data.scope.country}` : ''}`
    : 'Global Overview';

  const selectedAdmin = admins.find((a) => a.id === adminId);
  const recipientLabel =
    selectedAdmin?.name ?? `All ${admins.length} admins${admins.length > 0 ? ' under you' : ''}`;
  const recipientHint = selectedAdmin
    ? `${selectedAdmin.jurisdiction?.lga ? `${selectedAdmin.jurisdiction.lga} LGA, ` : ''}${selectedAdmin.jurisdiction?.state || ''}`
    : 'Every approved local admin under your jurisdiction';

  const fetchData = useCallback(async (area: string, admin?: string) => {
    try {
      setError(null);
      // Selecting a Local Admin narrows the whole dashboard to their state+LGA.
      const result = await StreamService.getJurisdictionDashboard(area, {
        adminId: admin || undefined,
      });
      if (result) {
        setData(result);
        // Reset selection if the chosen area no longer exists in scope
        setSelectedArea((prev) =>
          prev !== ALL_AREAS && !result.areas.includes(prev) ? ALL_AREAS : prev
        );
      } else {
        setError('Failed to load jurisdiction data.');
      }
    } catch {
      setError('Failed to load jurisdiction data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData(selectedArea, adminId);
  }, [selectedArea, adminId, fetchData]);

  const refreshAdmins = useCallback(async () => {
    const subs = await StreamService.getSubordinates();
    setAdmins(subs);
    setAdminId((prev) => (prev && !subs.some((s) => s.id === prev) ? '' : prev));
  }, []);

  useEffect(() => {
    refreshAdmins();
  }, [refreshAdmins]);

  // Stay live: refetch whenever a new emergency report hits the network
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    setLiveSocket(socket);
    const onNewReel = () => {
      fetchData(selectedArea, adminId);
      refreshAdmins();
    };
    socket.on('new_reel', onNewReel);
    return () => {
      socket.off('new_reel', onNewReel);
      setLiveSocket(null);
      socket.disconnect();
    };
  }, [fetchData, selectedArea, adminId, refreshAdmins]);

  // Refetch the admin list whenever the dashboard data changes so newly
  // onboarded admins appear in the filter dropdown.
  useEffect(() => {
    if (data) refreshAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleAttend = async (reelId: string) => {
    setResolvingId(reelId);
    try {
      await StreamService.resolveReel(reelId, 'attended');
      await fetchData(selectedArea, adminId);
    } finally {
      setResolvingId(null);
    }
  };

  const handleBroadcast = async (message: string) => {
    const target = adminId || undefined;
    const res = await StreamService.sendBroadcast(message, target);
    if (res.success) {
      const who = target ? selectedAdmin?.name : `all ${admins.length} admins`;
      setBroadcastConfirmation(`Broadcast sent to ${who}.`);
      setShowBroadcast(false);
      setTimeout(() => setBroadcastConfirmation(null), 6000);
      return true;
    }
    return false;
  };

  // Resolve a readable address for the selected incident (same as authority page)
  useEffect(() => {
    if (!selectedIncident) {
      setIncidentAddress('');
      return;
    }
    setIncidentAddress('Resolving address...');
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedIncident.lat}&lon=${selectedIncident.lng}`
    )
      .then((r) => r.json())
      .then((d) =>
        setIncidentAddress(
          d?.display_name || `${selectedIncident.lat.toFixed(4)}, ${selectedIncident.lng.toFixed(4)}`
        )
      )
      .catch(() =>
        setIncidentAddress(`${selectedIncident.lat.toFixed(4)}, ${selectedIncident.lng.toFixed(4)}`)
      );
  }, [selectedIncident]);

  const openIncident = (reel: JurisdictionMapReel) => {
    setSelectedIncident(reel);
    setMessageExpanded(false);
  };

  const asStream = (r: JurisdictionMapReel): Stream =>
    ({
      _id: r._id,
      url: r.url,
      username: r.username,
      avatar: r.avatar || '',
      isAnonymous: r.isAnonymous,
      description: r.description,
      severity: r.severity,
      status: r.status,
      createdAt: r.createdAt,
      views: r.views ?? 0,
      likes: r.likes ?? 0,
      comments: r.comments ?? 0,
    }) as Stream;

  const reportToMapReel = (r: JurisdictionReport): JurisdictionMapReel => ({
    _id: r._id,
    lat: r.latitude,
    lng: r.longitude,
    severity: r.severity,
    status: r.status,
    description: r.description,
    aiSummary: r.aiAnalysis?.summary || '',
    url: r.url,
    avatar: r.avatar,
    username: r.username,
    isAnonymous: r.isAnonymous,
    area: r.area,
    createdAt: r.createdAt,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
  });

  const handlePanelResolve = async (
    resolution: 'attended' | 'false_report' | 'pending'
  ) => {
    if (!selectedIncident) return;
    setResolvingId(selectedIncident._id);
    try {
      await StreamService.resolveReel(selectedIncident._id, resolution);
      setSelectedIncident((prev) => (prev ? { ...prev, status: resolution } : prev));
      await fetchData(selectedArea, adminId);
    } finally {
      setResolvingId(null);
    }
  };

  const scopeName =
    adminId && selectedAdmin
      ? selectedAdmin.name
      : selectedArea === ALL_AREAS
        ? data?.scope?.state || 'All regions'
        : selectedArea;

  const mapReels = data?.mapReels ?? [];
  const pendingRows = data?.pendingEmergencies ?? [];
  const criticalCount = mapReels.filter((m) => m.severity >= 0.8 && m.status === 'pending').length;
  const highCount = mapReels.filter((m) => m.severity >= 0.6 && m.severity < 0.8 && m.status === 'pending').length;
  const activeMarkers = mapReels.filter((m) => m.status === 'pending');

  const statCards = [
    { title: 'Active Emergencies', value: data?.stats.activeEmergencies, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Responders Deployed', value: data?.stats.respondersDeployed, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Catered Emergencies', value: data?.stats.catered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Emergencies', value: data?.stats.uncatered, icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }`}</style>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome, {user?.name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-gray-400 text-sm mt-2">
            Real-time oversight of emergencies across{' '}
            <span className="text-gray-200 font-medium">{jurisdictionLabel}</span>.
          </p>
        </div>
        <div className="flex space-x-2 bg-[#111111] p-1.5 rounded-full border border-[#1f1f1f] shadow-sm relative z-10">
          <button
            onClick={() => fetchData(selectedArea, adminId)}
            className="px-5 py-2 hover:bg-[#1f1f1f] text-gray-300 rounded-full text-sm font-medium transition-colors flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowBroadcast(true)}
            className="px-5 py-2 bg-white text-black hover:bg-gray-200 rounded-full text-sm font-medium transition-colors flex items-center shadow-[0_0_15px_rgba(255,255,255,0.25)]"
          >
            <Radio className="w-4 h-4 mr-2" />
            Broadcast
          </button>
        </div>
      </div>

      {/* Province / LGA Selector */}
      {(data?.scope?.state || (data?.areas?.length ?? 0) > 0) && (
        <div className="bg-[#121212] border border-gray-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Jurisdiction Scope</p>
              <p className="text-gray-500 text-xs">
                {adminId && selectedAdmin
                  ? `Showing the dashboard narrowed to ${selectedAdmin.name} (${selectedAdmin.jurisdiction?.lga || 'their LGA'})`
                  : `Select a local admin to zoom into their LGA, or pick a government area under ${data?.scope?.state?.replace(/-/g, '') || 'your jurisdiction'}`}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <div className="relative sm:w-72">
              <select
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="w-full appearance-none bg-[#1a1a1a] border border-gray-700 hover:border-gray-600 text-white text-sm rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50 transition-colors cursor-pointer"
              >
                <option value="">All Local Admins</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.jurisdiction?.lga ? ` — ${a.jurisdiction.lga}` : ''}
                  </option>
                ))}
              </select>
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            {!adminId && (
              <div className="relative sm:w-72">
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full appearance-none bg-[#1a1a1a] border border-gray-700 hover:border-gray-600 text-white text-sm rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
                >
                  <option value={ALL_AREAS}>
                    Entire State{data?.scope?.state ? ` | ${data.scope.state}` : ''}
                  </option>
                  {data?.areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      )}

      {broadcastConfirmation && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-4 rounded-lg">
          <Radio className="w-4 h-4" />
          {broadcastConfirmation}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 hover:border-[#2f2f2f] transition-colors shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} opacity-50 blur-[50px] -mr-10 -mt-10 pointer-events-none rounded-full group-hover:opacity-80 transition-opacity`}></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-full ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className="text-[10px] text-gray-400 border border-[#1f1f1f] bg-[#000000]/50 px-3 py-1.5 rounded-full font-medium truncate max-w-[120px]">
                {scopeName?.replace(/-/g, '')}
              </span>
            </div>
            <h3 className="text-gray-400 text-sm font-medium relative z-10">{stat.title}</h3>
            {loading && !data ? (
              <div className="h-8 w-20 bg-[#1f1f1f] rounded-full animate-pulse mt-2 relative z-10" />
            ) : (
              <p className="text-3xl font-semibold text-white mt-2 tracking-tight relative z-10">{stat.value ?? 0}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-[24px] overflow-hidden flex flex-col h-[500px] shadow-sm">
          <div className="p-5 border-b border-[#1f1f1f] flex justify-between items-center">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 mr-1 text-white" />
              Live Threat Map <span className="text-gray-500 font-normal text-sm ml-1">| {scopeName?.replace(/-/g, '')}</span>
            </h2>
            {!loading && data && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{activeMarkers.length} active</span>
                <span className="w-1 h-1 rounded-full bg-gray-600 inline-block" />
                <span>{data.stats.respondersDeployed} responders</span>
              </div>
            )}
          </div>
          <div className="flex-1 relative z-0">
            {loading && !data ? (
              <div className="absolute inset-0 bg-[#161616] animate-pulse flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-gray-700 animate-spin" />
              </div>
            ) : (
              <MapContainer
                center={(data?.center as L.LatLngExpression) ?? [9.082, 8.6753]}
                zoom={data?.center ? 10 : 3}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={19}
                  opacity={0.5}
                />
                <Recenter center={data?.center ?? null} />
                {mapReels.map((reel) => {
                  const heat = heatCircleOptions(reel);
                  return (
                    <React.Fragment key={reel._id}>
                      <Circle
                        center={[reel.lat, reel.lng]}
                        radius={heat.radius}
                        pathOptions={{ color: heat.color, fillColor: heat.color, fillOpacity: 0.12, weight: 1 }}
                      />
                      <Marker
                        position={[reel.lat, reel.lng]}
                        icon={markerIcon}
                        eventHandlers={{ click: () => openIncident(reel) }}
                      >
                        <Popup>
                          <div className="font-sans text-xs min-w-[180px]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor(reel.severity) }} />
                              <span className="font-bold text-sm text-gray-800">{reel.username}</span>
                              {reel.area && <span className="text-gray-500 ml-auto">{reel.area}</span>}
                            </div>
                            <div
                              className="text-[9px] font-bold mb-1"
                              style={{ color: reel.status === 'attended' ? '#16a34a' : reel.severity >= 0.6 ? '#dc2626' : reel.severity >= 0.4 ? '#ca8a04' : '#16a34a' }}
                            >
                              {reel.status === 'attended' ? 'ATTENDED' : `${severityLabel(reel.severity)} THREAT`} · {timeAgo(reel.createdAt)} AGO
                            </div>
                            {reel.description && (
                              <div className="text-gray-600 mb-1 line-clamp-2">{reel.description}</div>
                            )}
                            <div className="flex items-center gap-3 mb-2 text-gray-500">
                              <span className="flex items-center gap-0.5"><Heart size={10} /> {reel.likes ?? 0}</span>
                              <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {reel.comments ?? 0}</span>
                              <span className="flex items-center gap-0.5"><Eye size={10} /> {reel.views ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-500">
                              <Navigation size={10} />
                              <span>{reel.lat.toFixed(4)}, {reel.lng.toFixed(4)}</span>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}
              </MapContainer>
            )}

            {/* Incident Detail Sidebar (mirrors authority page reel panel) */}
            {selectedIncident && (
              <div className="absolute inset-y-0 right-0 z-[500] w-[360px] max-w-full bg-[#161a20]/95 backdrop-blur-md border-l border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.6)] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    <MapPin size={14} className="text-blue-500" />
                    Incident Detail
                  </h3>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                  {/* The posted reel */}
                  <div className="bg-black rounded-2xl overflow-hidden border border-white/5 relative shadow-xl h-[380px]">
                    <ReelPlayer
                      stream={asStream(selectedIncident)}
                      compact
                      onLike={() => {
                        StreamService.likeReel(selectedIncident._id);
                        setSelectedIncident((prev) =>
                          prev ? { ...prev, likes: (prev.likes ?? 0) + 1 } : prev
                        );
                      }}
                      onProfileClick={() => {}}
                    />
                  </div>

                  {/* Message card */}
                  <div className="bg-[#1a1e24] border border-white/5 rounded-xl p-3">
                    <h4 className="text-[10px] font-semibold text-gray-400 tracking-wider mb-2 uppercase">
                      Report Details
                    </h4>
                    <p
                      className={`text-[12px] text-gray-200 leading-relaxed font-medium ${
                        !messageExpanded ? 'line-clamp-3' : ''
                      }`}
                    >
                      {selectedIncident.aiSummary ||
                        selectedIncident.description ||
                        'No details available'}
                    </p>
                    {(selectedIncident.aiSummary || selectedIncident.description) && (
                      <button
                        onClick={() => setMessageExpanded((p) => !p)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium mt-1 transition-colors"
                      >
                        {messageExpanded ? 'See less' : 'See more'}
                      </button>
                    )}
                  </div>

                  {/* Reporter / incident info card */}
                  <div className="bg-[#1a1e24] border border-white/5 rounded-xl relative overflow-hidden">
                    <div
                      className="h-0.5 w-full"
                      style={{ backgroundColor: severityColor(selectedIncident.severity) }}
                    />
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        {selectedIncident.avatar ? (
                          <img
                            src={selectedIncident.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                            {selectedIncident.isAnonymous ? '?' : selectedIncident.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {selectedIncident.username}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="px-1 py-0.5 rounded text-[8px] font-bold text-white"
                              style={{ backgroundColor: severityColor(selectedIncident.severity) }}
                            >
                              {severityLabel(selectedIncident.severity)}
                            </span>
                            <span
                              className={`px-1 py-0.5 rounded text-[8px] font-bold ${
                                selectedIncident.status === 'attended'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : selectedIncident.status === 'false_report'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {selectedIncident.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-[9px] text-gray-500">
                              #{selectedIncident._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                          <MapPin size={10} className="text-gray-500 flex-shrink-0" />
                          <span className="text-[10px] text-gray-300 break-words leading-relaxed">
                            {selectedIncident.area ? `${selectedIncident.area} — ` : ''}
                            {incidentAddress}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                            <Navigation size={10} className="text-blue-400/80 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-gray-300 truncate">
                              {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                            <Clock size={10} className="text-gray-500 flex-shrink-0" />
                            <span className="text-[10px] text-gray-300">{timeAgo(selectedIncident.createdAt)} ago</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 rounded-lg px-2.5 py-1.5 text-gray-400">
                          <span className="flex items-center gap-1"><Heart size={10} /> {selectedIncident.likes ?? 0}</span>
                          <span className="flex items-center gap-1"><MessageCircle size={10} /> {selectedIncident.comments ?? 0}</span>
                          <span className="flex items-center gap-1"><Eye size={10} /> {selectedIncident.views ?? 0}</span>
                        </div>
                      </div>

                      {/* Resolution actions */}
                      {selectedIncident.status === 'pending' ? (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handlePanelResolve('attended')}
                            disabled={resolvingId === selectedIncident._id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold py-2 transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 size={13} />
                            {resolvingId === selectedIncident._id ? '...' : 'Attended'}
                          </button>
                          <button
                            onClick={() => handlePanelResolve('false_report')}
                            disabled={resolvingId === selectedIncident._id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold py-2 transition-colors disabled:opacity-40"
                          >
                            <XCircle size={13} />
                            False Report
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePanelResolve('pending')}
                          disabled={resolvingId === selectedIncident._id}
                          className={`w-full flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold py-2 transition-colors disabled:opacity-40 ${
                            selectedIncident.status === 'attended'
                              ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40'
                              : 'bg-red-500/30 text-red-300 ring-1 ring-red-500/40'
                          }`}
                        >
                          {selectedIncident.status === 'attended' ? 'Attended' : 'False Report'}
                          <span className="font-normal opacity-70">— click to revert</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Map Overlay Detection Stats */}
            {!loading && data && (
              <div className="absolute bottom-4 left-4 z-[400] bg-[#121212]/90 backdrop-blur-md border border-gray-800 rounded-lg p-3">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                    <span className="text-xs text-gray-300">Critical zones ({criticalCount})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="text-xs text-gray-300">High alerts ({highCount})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-xs text-gray-300">{data.stats.catered} catered to</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Column */}
        <div className="space-y-6">
          {/* Incident Activity Chart */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm">
            <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 mr-1 text-white" />
              7 Day Incident Activity <span className="text-gray-500 font-normal text-xs ml-1">| {scopeName?.replace(/-/g, '')}</span>
            </h2>
            <div className="h-48">
              {loading && !data ? (
                <div className="h-full bg-[#1f1f1f]/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.activityData ?? []}>
                    <defs>
                      <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d946ef" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000000', border: '1px solid #1f1f1f', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#d946ef' }}
                    />
                    <Area type="monotone" dataKey="incidents" stroke="#d946ef" strokeWidth={3} fillOpacity={1} fill="url(#colorIncidents)" name="Incidents" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm">
            <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              Severity Breakdown <span className="text-gray-500 font-normal text-xs ml-1">| {scopeName?.replace(/-/g, '')}</span>
            </h2>
            <div className="h-64 relative">
              {loading && !data ? (
                <div className="h-full bg-[#1f1f1f]/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.severityBreakdown ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {(data?.severityBreakdown ?? []).map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {/* Legend overlay */}
              <div className="absolute inset-y-0 right-0 flex flex-col justify-center space-y-3 mr-4">
                {(data?.severityBreakdown ?? []).map((s) => (
                  <div key={s.name} className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.color }}></span>
                    <span className="text-xs text-gray-400">{s.name}</span>
                    <span className="text-xs text-gray-200 font-medium ml-1.5">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Admin Authorizations */}
      <PendingApprovals reviewingRole="admin" />

      {/* Network Communication / Uncatered emergencies */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm mb-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-lg font-semibold tracking-wide">
            Pending Emergencies
          </h2>
          <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full font-medium">
            {pendingRows.length} waiting
          </span>
        </div>

        {loading && !data ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-900/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : pendingRows.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500/60 mb-3" />
            <p className="text-gray-400 text-sm">No uncatered emergencies in this area.</p>
            <p className="text-gray-600 text-xs mt-1">All reported emergencies have been attended to.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#1f1f1f] text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="pb-4 px-4">Incident ID</th>
                  <th className="pb-4 px-4">Location</th>
                  <th className="pb-4 px-4">Severity</th>
                  <th className="pb-4 px-4">Time Elapsed</th>
                  <th className="pb-4 px-4">Reported By</th>
                  <th className="pb-4 text-right px-4">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingRows.map((inc) => {
                  const label = severityLabel(inc.severity);
                  return (
                    <tr
                      key={inc.reelId}
                      onClick={() => {
                        const full = mapReels.find((m) => m._id === inc.reelId);
                        if (full) openIncident(full);
                      }}
                      className="border-b border-[#1f1f1f]/50 hover:bg-[#1f1f1f]/30 transition-colors group cursor-pointer"
                    >
                      <td className="py-5 text-gray-300 font-mono px-4 text-xs">INC-{inc.id}</td>
                      <td className="py-5 text-gray-300 px-4 text-sm font-medium">
                        {inc.area || `${inc.lat.toFixed(3)}, ${inc.lng.toFixed(3)}`}
                      </td>
                      <td className="py-5 px-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${severityBadge[label]}`}>
                          {label.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-5 text-gray-400 px-4 text-xs">{timeAgo(inc.createdAt)}</td>
                      <td className="py-5 text-gray-400 px-4 text-xs">{inc.reporter}</td>
                      <td className="py-5 text-right px-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAttend(inc.reelId); }}
                          disabled={resolvingId === inc.reelId}
                          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-full text-xs font-semibold transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 border border-emerald-500/20"
                        >
                          {resolvingId === inc.reelId ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Resolve
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All reports in scope, with full AI analysis */}
      <ReportsList
        reports={data?.reports ?? []}
        loading={loading}
        scopeName={scopeName}
        onOpen={(report) => openIncident(reportToMapReel(report))}
      />

      <BroadcastModal
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        recipientLabel={recipientLabel}
        recipientHint={recipientHint}
        onSubmit={handleBroadcast}
      />

      <NotificationToasts socket={liveSocket} userId={user?.id} />
    </div>
  );
};
