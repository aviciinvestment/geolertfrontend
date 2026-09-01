import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Activity, ShieldAlert, Users, CheckCircle2, AlertTriangle, XCircle, MapPin, RefreshCw, Navigation, X, Clock, UserIcon, Shield, Star, Crown } from 'lucide-react';
import L from 'leaflet';
import { StreamService, JurisdictionDashboard, JurisdictionMapReel, Stream, GroupedUsers } from '../../services/StreamService';
import { ReelPlayer } from '../ReelPlayer';

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
      map.flyTo(center, Math.max(map.getZoom(), 4), { duration: 1 });
    }
  }, [center, map]);
  return null;
}

export const FoundersView: React.FC = () => {
  const [data, setData] = useState<JurisdictionDashboard | null>(null);
  const [usersData, setUsersData] = useState<GroupedUsers | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'authorities' | 'admins' | 'superadmins' | 'founders'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<JurisdictionMapReel | null>(null);
  const [incidentAddress, setIncidentAddress] = useState('');
  const [messageExpanded, setMessageExpanded] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashboardResult, usersResult] = await Promise.all([
        StreamService.getFounderDashboard(),
        StreamService.getAllUsersGrouped()
      ]);
      
      if (dashboardResult && usersResult) {
        setData(dashboardResult);
        setUsersData(usersResult);
      } else {
        setError('Failed to load global data.');
      }
    } catch {
      setError('Failed to load global data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Stay live: refetch whenever a new emergency report hits the network
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL);
    const onNewReel = () => {
      fetchData();
    };
    socket.on('new_reel', onNewReel);
    return () => {
      socket.off('new_reel', onNewReel);
      socket.disconnect();
    };
  }, [fetchData]);

  // Resolve a readable address for the selected incident
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

  const handlePanelResolve = async (
    resolution: 'attended' | 'false_report' | 'pending'
  ) => {
    if (!selectedIncident) return;
    setResolvingId(selectedIncident._id);
    try {
      await StreamService.resolveReel(selectedIncident._id, resolution);
      setSelectedIncident((prev) => (prev ? { ...prev, status: resolution } : prev));
      await fetchData();
    } finally {
      setResolvingId(null);
    }
  };

  const mapReels = data?.mapReels ?? [];
  const activeMarkers = mapReels.filter((m) => m.status === 'pending');
  const criticalCount = mapReels.filter((m) => m.severity >= 0.8 && m.status === 'pending').length;
  const highCount = mapReels.filter((m) => m.severity >= 0.6 && m.severity < 0.8 && m.status === 'pending').length;

  const statCards = [
    { title: 'Global Active Emergencies', value: data?.stats.activeEmergencies, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Total Registered Users', value: (usersData?.users.length || 0) + (usersData?.authorities.length || 0) + (usersData?.admins.length || 0) + (usersData?.superadmins.length || 0), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'Catered Emergencies', value: data?.stats.catered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Emergencies', value: data?.stats.uncatered, icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  const renderUserList = () => {
    if (!usersData) return null;
    const users = usersData[activeTab];

    if (users.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          No users found in this category.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="text-xs uppercase bg-[#1a1e24] text-gray-400 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 rounded-tl-lg">User</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Joined</th>
              <th className="px-6 py-4 rounded-tr-lg">Trust Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  {u.avatar ? (
                    <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="font-medium text-white">{u.name}</div>
                </td>
                <td className="px-6 py-4 text-gray-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-white/10 rounded-md text-xs font-medium uppercase">{u.role}</span>
                </td>
                <td className="px-6 py-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-gray-700 rounded-full h-1.5 max-w-[60px]">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${u.trustScore || 50}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-400">{u.trustScore || 50}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-tight flex items-center gap-2">
            <Crown className="w-8 h-8 text-pink-500" />
            Founders Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Global network oversight and complete user directory access.
          </p>
        </div>
        <div className="flex space-x-2 bg-[#111111] p-1.5 rounded-full border border-[#1f1f1f] shadow-sm relative z-10">
          <button
            onClick={() => fetchData()}
            className="px-5 py-2 hover:bg-[#1f1f1f] text-gray-300 rounded-full text-sm font-medium transition-colors flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

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
                Global
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
        <div className="lg:col-span-2 bg-[#111111] border border-[#1f1f1f] rounded-[24px] overflow-hidden flex flex-col h-[500px] shadow-sm relative">
          <div className="p-5 border-b border-[#1f1f1f] flex justify-between items-center bg-[#111111]/80 backdrop-blur-md absolute top-0 left-0 right-0 z-[400]">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 mr-1 text-pink-500" />
              Global Threat Map
            </h2>
            {!loading && data && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>{activeMarkers.length} active global emergencies</span>
              </div>
            )}
          </div>
          <div className="flex-1 relative z-0 mt-[68px]">
            {loading && !data ? (
              <div className="absolute inset-0 bg-[#161616] animate-pulse flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-gray-700 animate-spin" />
              </div>
            ) : (
              <MapContainer
                center={(data?.center as L.LatLngExpression) ?? [20, 0]}
                zoom={data?.center ? 4 : 2}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
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
                            <div className="flex items-center gap-1 text-gray-500 mt-2">
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

            {/* Incident Detail Sidebar */}
            {selectedIncident && (
              <div className="absolute inset-y-0 right-0 z-[500] w-[360px] max-w-full bg-[#161a20]/95 backdrop-blur-md border-l border-white/10 shadow-[-8px_0_32px_rgba(0,0,0,0.6)] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    <MapPin size={14} className="text-pink-500" />
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
                  <div className="bg-black rounded-2xl overflow-hidden border border-white/5 relative shadow-xl h-[380px]">
                    <ReelPlayer
                      stream={asStream(selectedIncident)}
                      compact
                      onLike={() => {}}
                      onProfileClick={() => {}}
                    />
                  </div>

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
                        className="text-[10px] text-pink-400 hover:text-pink-300 font-medium mt-1 transition-colors"
                      >
                        {messageExpanded ? 'See less' : 'See more'}
                      </button>
                    )}
                  </div>

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
                          <div className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold">
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
                            <Navigation size={10} className="text-pink-400/80 flex-shrink-0" />
                            <span className="text-[10px] font-mono text-gray-300 truncate">
                              {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                            <Clock size={10} className="text-gray-500 flex-shrink-0" />
                            <span className="text-[10px] text-gray-300">{timeAgo(selectedIncident.createdAt)} ago</span>
                          </div>
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Incident Activity Chart */}
        <div className="space-y-6">
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm">
            <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 mr-1 text-pink-500" />
              Global 7 Day Activity
            </h2>
            <div className="h-48">
              {loading && !data ? (
                <div className="h-full bg-[#1f1f1f]/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.activityData ?? []}>
                    <defs>
                      <linearGradient id="colorIncidentsFounder" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000000', border: '1px solid #1f1f1f', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#ec4899' }}
                    />
                    <Area type="monotone" dataKey="incidents" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorIncidentsFounder)" name="Incidents" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm">
            <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
              Global Severity Breakdown
            </h2>
            <div className="h-48 relative">
              {loading && !data ? (
                <div className="h-full bg-[#1f1f1f]/50 rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.severityBreakdown ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
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

      {/* Directory Section */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-[#1f1f1f]">
          <h2 className="text-xl font-semibold text-white tracking-wide flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-blue-500" />
            Global User Directory
          </h2>
          
          <div className="flex space-x-2 border-b border-[#1f1f1f] overflow-x-auto pb-[-1px]">
            {[
              { id: 'users', label: 'Citizens', icon: UserIcon, count: usersData?.users.length || 0 },
              { id: 'authorities', label: 'Authorities', icon: Shield, count: usersData?.authorities.length || 0 },
              { id: 'admins', label: 'Admins', icon: Star, count: usersData?.admins.length || 0 },
              { id: 'superadmins', label: 'Super Admins', icon: Crown, count: usersData?.superadmins.length || 0 },
              { id: 'founders', label: 'Founders', icon: Crown, count: usersData?.founders.length || 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-blue-500/20' : 'bg-[#1f1f1f]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="bg-[#161a20]">
          {loading ? (
            <div className="p-10 flex justify-center">
              <RefreshCw className="w-8 h-8 text-gray-600 animate-spin" />
            </div>
          ) : (
            renderUserList()
          )}
        </div>
      </div>
    </div>
  );
};
