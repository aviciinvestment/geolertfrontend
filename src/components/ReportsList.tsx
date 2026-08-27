import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Eye,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { JurisdictionReport } from '../services/StreamService';

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

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400',
  attended: 'bg-emerald-500/15 text-emerald-400',
  false_report: 'bg-red-500/15 text-red-400',
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

type Filter = 'all' | 'pending' | 'attended' | 'false_report';

interface ReportsListProps {
  reports: JurisdictionReport[];
  loading: boolean;
  onOpen: (report: JurisdictionReport) => void;
  scopeName?: string;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  loading,
  onOpen,
  scopeName,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    attended: reports.filter((r) => r.status === 'attended').length,
    false_report: reports.filter((r) => r.status === 'false_report').length,
  };

  const filtered =
    filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'attended', label: 'Attended' },
    { key: 'false_report', label: 'False Report' },
  ];

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-[24px] p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <h2 className="text-white text-lg font-semibold tracking-wide flex items-center gap-2">
          <FileText className="w-5 h-5 text-white" />
          All Emergency Reports
          {scopeName && (
            <span className="text-gray-500 font-normal text-xs">| {scopeName?.replace(/-/g, '')}</span>
          )}
        </h2>
        <span className="text-xs bg-white/10 text-gray-200 px-3 py-1.5 rounded-full font-medium">
          {counts.all} total
        </span>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              filter === t.key
                ? 'bg-white/10 text-white border-white/25'
                : 'bg-[#0a0a0a] text-gray-400 border-[#1f1f1f] hover:text-gray-200'
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {loading && !reports.length ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-900/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500/60 mb-3" />
          <p className="text-gray-400 text-sm">No emergency reports match this filter.</p>
          <p className="text-gray-600 text-xs mt-1">Reports reported within the current scope will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const label = severityLabel(report.severity);
            const isExpanded = expanded === report._id;
            const analysis = report.aiAnalysis;
            const location = [report.area, report.lga, report.state].filter(Boolean).join(' · ');
            return (
              <div
                key={report._id}
                onClick={() => onOpen(report)}
                className="bg-[#0d0d0d] border border-[#1f1f1f] hover:border-[#2f2f2f] rounded-2xl p-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  {report.avatar ? (
                    <img
                      src={report.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 text-gray-200 flex items-center justify-center text-sm font-bold shrink-0">
                      {report.isAnonymous ? '?' : report.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-semibold text-white truncate max-w-[160px]"
                        title={report.username}
                      >
                        {report.isAnonymous ? 'Anonymous Reporter' : report.username}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        INC-{report._id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider ${severityBadge[label]}`}>
                        {label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold capitalize ${statusBadge[report.status]}`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} className="text-blue-400/70" />
                          {location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(report.createdAt)} ago
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={10} /> {report.likes ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={10} /> {report.comments ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {report.views ?? 0}
                      </span>
                    </div>

                    {analysis?.summary && (
                      <p
                        className={`text-[12px] text-gray-300 leading-relaxed mt-2 ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        <span className="text-sky-400/80 font-semibold">AI: </span>
                        {analysis.summary}
                      </p>
                    )}
                    {analysis?.severityReason && (
                      <p
                        className={`text-[11px] text-gray-500 leading-relaxed mt-1 ${
                          isExpanded ? '' : 'line-clamp-1'
                        }`}
                      >
                        <span className="text-gray-400 font-semibold">Why: </span>
                        {analysis.severityReason}
                      </p>
                    )}
                    {analysis && (analysis.summary || analysis.severityReason) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded(isExpanded ? null : report._id);
                        }}
                        className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 font-medium mt-1 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        {isExpanded ? 'See less' : 'See more analysis'}
                      </button>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="h-1 rounded-full"
                        style={{ width: `${Math.max(6, Math.round(report.severity * 100))}%`, backgroundColor: severityColor(report.severity) }}
                      />
                      <span className="text-[10px] text-gray-500">
                        severity {report.severity.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {report.status === 'pending' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        UNCATERED
                      </span>
                    ) : report.status === 'attended' ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={11} />
                        ATTENDED
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full">
                        <XCircle size={11} />
                        FALSE
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};