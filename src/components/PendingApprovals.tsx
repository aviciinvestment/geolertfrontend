import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { UserCheck, UserX, Clock, CheckCircle2 } from 'lucide-react';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface PendingApprovalsProps {
  /** What role this panel reviews — used for copy only */
  reviewingRole: 'admin' | 'authority';
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({ reviewingRole }) => {
  const [approvals, setApprovals] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const token = localStorage.getItem('geolert_token');
      const res = await axios.get(`${API_URL}/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApprovals(res.data.approvals || []);
    } catch (err) {
      console.error('Failed to load pending approvals', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const token = localStorage.getItem('geolert_token');
      await axios.put(
        `${API_URL}/approvals/${id}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApprovals((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error('Failed to review approval', err);
    } finally {
      setBusyId(null);
    }
  };

  const label = reviewingRole === 'admin' ? 'Admin' : 'Authority Responder';

  return (
    <div className="bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-sm font-semibold flex items-center">
          <Clock className="w-4 h-4 mr-2 text-amber-500" />
          Pending {label} Authorizations
        </h2>
        <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full font-medium">
          {isLoading ? '...' : `${approvals.length} waiting`}
        </span>
      </div>

      {!isLoading && approvals.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500/60 mb-3" />
          <p className="text-gray-400 text-sm">No pending {label.toLowerCase()} registrations.</p>
          <p className="text-gray-600 text-xs mt-1">New signups will appear here for authorization.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {approvals.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between bg-[#1a1a1a] border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-700 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{u.name}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <button
                  onClick={() => review(u._id, 'approve')}
                  disabled={busyId === u._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Authorize
                </button>
                <button
                  onClick={() => review(u._id, 'reject')}
                  disabled={busyId === u._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
