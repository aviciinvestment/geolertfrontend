export interface Stream {
  _id: string;
  url: string;
  username: string;
  avatar: string;
  description?: string;
  likes: number;
  comments: number;
  views?: number;
  isLive?: boolean;
  isAnonymous?: boolean;
  viewers?: number;
  userId?: string;
  createdAt: string;
  distanceMiles?: number;
  canInteract?: boolean;
  isLikedByMe?: boolean;
  location?: { type: string; coordinates: [number, number] };
  aiAnalysis?: { summary: string; transcript: string; description: string; severityReason: string };
  severity?: number;
  category?: string;
  engagementPriority?: number;
  status?: 'pending' | 'attended' | 'false_report';
}

export interface JurisdictionMapReel {
  _id: string;
  lat: number;
  lng: number;
  severity: number;
  status: 'pending' | 'attended' | 'false_report';
  description?: string;
  aiSummary?: string;
  url: string;
  avatar?: string;
  username: string;
  isAnonymous: boolean;
  area?: string;
  createdAt: string;
  views?: number;
  likes?: number;
  comments?: number;
}

export interface JurisdictionReport {
  _id: string;
  status: 'pending' | 'attended' | 'false_report';
  severity: number;
  description?: string;
  aiAnalysis?: {
    summary: string;
    transcript: string;
    description: string;
    severityReason: string;
  } | null;
  url: string;
  avatar?: string;
  username: string;
  isAnonymous: boolean;
  area?: string;
  lga?: string;
  state?: string;
  latitude: number;
  longitude: number;
  userId?: string;
  createdAt: string;
  views?: number;
  likes?: number;
  comments?: number;
}

export interface Subordinate {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  role: string;
  specialization?: string;
  jurisdiction?: { country?: string; state?: string; lga?: string } | null;
}

export interface GroupedUsers {
  users: any[];
  authorities: any[];
  admins: any[];
  superadmins: any[];
  founders: any[];
}

export interface JurisdictionDashboard {
  scope: { country: string | null; state: string | null; lga: string | null };
  areas: string[];
  stats: {
    activeEmergencies: number;
    catered: number;
    uncatered: number;
    falseReports: number;
    respondersDeployed: number;
  };
  severityBreakdown: { name: string; value: number; color: string }[];
  activityData: { time: string; incidents: number }[];
  mapReels: JurisdictionMapReel[];
  pendingEmergencies: {
    id: string;
    reelId: string;
    area?: string;
    lat: number;
    lng: number;
    severity: number;
    reporter: string;
    createdAt: string;
  }[];
  reports: JurisdictionReport[];
  center: [number, number] | null;
}

export interface Comment {
  _id: string;
  reelId: string;
  username: string;
  avatar: string;
  text: string;
  videoUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  isAnonymous: boolean;
  trustScore?: number;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  senderName?: string;
  senderId?: string;
  message: string;
  type?: string;
  category?: string;
  severity?: number;
  reelId?: string;
  locationLabel?: string;
  read?: boolean;
  createdAt?: string;
}

const API_URL = `${import.meta.env.VITE_API_URL}/api/reels`;
const AUTH_URL = `${import.meta.env.VITE_API_URL}/api/auth`;
const USERS_URL = `${import.meta.env.VITE_API_URL}/api/users`;
const FOUNDER_URL = `${import.meta.env.VITE_API_URL}/api/founder`;

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('achiv_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const StreamService = {
  getFeed: async (): Promise<Stream[]> => {
    try {
      const response = await fetch(`${API_URL}/feed`, {
        headers: { ...getAuthHeader() }
      });
      const json = await response.json();
      if (json.success) {
        return json.data;
      }
      throw new Error(json.message || 'Failed to fetch feed');
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  },

  // Only incidents routed to this Authority Responder (jurisdiction- and
  // specialization-aware), shaped like the feed.
  getAssignedReels: async (): Promise<Stream[]> => {
    try {
      const response = await fetch(`${API_URL}/assigned`, {
        headers: { ...getAuthHeader() }
      });
      const json = await response.json();
      if (json.success) {
        return json.data;
      }
      throw new Error(json.message || 'Failed to fetch assigned incidents');
    } catch (error) {
      console.error('Error fetching assigned incidents:', error);
      throw error;
    }
  },

  getAnalytics: async (): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/analytics`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json.success ? json.data : null;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  },

  getJurisdictionDashboard: async (
    lga?: string,
    opts?: { authorityId?: string; adminId?: string }
  ): Promise<JurisdictionDashboard | null> => {
    try {
      const params = new URLSearchParams();
      if (lga && lga !== '__all__') params.set('lga', lga);
      if (opts?.authorityId) params.set('authorityId', opts.authorityId);
      if (opts?.adminId) params.set('adminId', opts.adminId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_URL}/jurisdiction${qs}`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json.success ? json.data : null;
    } catch (error) {
      console.error('Error fetching jurisdiction dashboard:', error);
      return null;
    }
  },

  getFounderDashboard: async (): Promise<JurisdictionDashboard | null> => {
    try {
      const response = await fetch(`${FOUNDER_URL}/dashboard`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json.success ? json.data : null;
    } catch (error) {
      console.error('Error fetching founder dashboard:', error);
      return null;
    }
  },

  getAllUsersGrouped: async (): Promise<GroupedUsers | null> => {
    try {
      const response = await fetch(`${FOUNDER_URL}/users`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json.success ? json.data : null;
    } catch (error) {
      console.error('Error fetching founder users:', error);
      return null;
    }
  },

  // Users under this account: Authority Responders (admin) or Local Admins (superadmin)
  getSubordinates: async (): Promise<Subordinate[]> => {
    try {
      const response = await fetch(`${USERS_URL}/subordinates`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json.success ? json.data : [];
    } catch (error) {
      console.error('Error fetching subordinates:', error);
      return [];
    }
  },

  // Send a broadcast notification to one subordinate (targetId) or all of them.
  sendBroadcast: async (
    message: string,
    targetId?: string
  ): Promise<{ success: boolean; sent?: number; message?: string }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ message, targetId }),
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error sending broadcast:', error);
      return { success: false, message: 'Failed to send broadcast' };
    }
  },

  // Persisted notifications (broadcasts + routed incident alerts) for this user.
  getNotifications: async (limit: number = 50): Promise<AppNotification[]> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications?limit=${limit}`,
        { headers: { ...getAuthHeader() } }
      );
      const json = await response.json();
      return json.success ? json.data : [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  // Mark every outstanding notification as read.
  markNotificationsRead: async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/notifications/read`,
        {
          method: 'PUT',
          headers: { ...getAuthHeader() },
        }
      );
      const json = await response.json();
      return json.success === true;
    } catch (error) {
      console.error('Error marking notifications read:', error);
      return false;
    }
  },

  startStream: async (title: string): Promise<{ success: boolean; streamId: string }> => {
    try {
      const response = await fetch(`${API_URL}/live`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ title, username: 'live_creator' })
      });
      const json = await response.json();
      if (json.success) {
        return { success: true, streamId: json.data._id };
      }
      return { success: false, streamId: '' };
    } catch (error) {
      console.error('Error starting live stream:', error);
      return { success: false, streamId: '' };
    }
  },

  uploadReel: async (file: File, description: string, isAnonymous: boolean = false): Promise<{ success: boolean; data?: Stream }> => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('description', description);
    formData.append('isAnonymous', String(isAnonymous));
    
    const userStr = localStorage.getItem('achiv_user');
    const user = userStr ? JSON.parse(userStr) : null;
    formData.append('username', user?.name || 'anonymous');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 });
      });
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
    } catch (e) {
      console.error("Location is required to upload a reel", e);
      return { success: false };
    }

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        },
        body: formData
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error uploading reel:', error);
      return { success: false };
    }
  },

  likeReel: async (reelId: string): Promise<{ success: boolean; data?: Stream }> => {
    try {
      const response = await fetch(`${API_URL}/${reelId}/like`, {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        }
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error liking reel:', error);
      return { success: false };
    }
  },

  viewReel: async (reelId: string): Promise<{ success: boolean; data?: Stream }> => {
    try {
      const response = await fetch(`${API_URL}/${reelId}/view`, {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        }
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error viewing reel:', error);
      return { success: false };
    }
  },

  getComments: async (reelId: string): Promise<Comment[]> => {
    try {
      const response = await fetch(`${API_URL}/${reelId}/comments`, {
        headers: {
          ...getAuthHeader()
        }
      });
      const json = await response.json();
      if (json.success) {
        return json.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  },

  addComment: async (reelId: string, username: string, text: string): Promise<{ success: boolean; data?: Comment }> => {
    try {
      const response = await fetch(`${API_URL}/${reelId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ username, text })
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error adding comment:', error);
      return { success: false };
    }
  },

  addVideoComment: async (reelId: string, username: string, file: File): Promise<{ success: boolean; data?: Comment }> => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('username', username);

    try {
      const response = await fetch(`${API_URL}/${reelId}/comments/video`, {
        method: 'POST',
        headers: {
          ...getAuthHeader()
        },
        body: formData
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error adding video comment:', error);
      return { success: false };
    }
  },

  endStream: async (streamId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Ended stream: ${streamId}`);
        resolve({ success: true });
      }, 800);
    });
  },

  updateProfile: async (data: { name?: string; avatar?: string; bio?: string; isAnonymous?: boolean }): Promise<{ success: boolean; user?: any }> => {
    try {
      const response = await fetch(`${AUTH_URL}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(data),
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false };
    }
  },

  uploadAvatar: async (file: File): Promise<{ success: boolean; user?: any }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const response = await fetch(`${AUTH_URL}/avatar`, {
        method: 'POST',
        headers: { ...getAuthHeader() },
        body: formData,
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return { success: false };
    }
  },

  getUserProfile: async (userId: string): Promise<{ success: boolean; user?: UserProfile; reels?: Stream[] }> => {
    try {
      const response = await fetch(`${USERS_URL}/${userId}`, {
        headers: { ...getAuthHeader() },
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false };
    }
  },

  resolveReel: async (reelId: string, resolution: 'attended' | 'false_report' | 'pending'): Promise<{ success: boolean; data?: Stream }> => {
    try {
      const response = await fetch(`${API_URL}/${reelId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ resolution }),
      });
      const json = await response.json();
      return json;
    } catch (error) {
      console.error('Error resolving reel:', error);
      return { success: false };
    }
  },
};
