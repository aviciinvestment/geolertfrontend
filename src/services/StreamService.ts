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
  createdAt: string;
}

const API_URL = `${import.meta.env.VITE_API_URL}/api/reels`;
const AUTH_URL = `${import.meta.env.VITE_API_URL}/api/auth`;
const USERS_URL = `${import.meta.env.VITE_API_URL}/api/users`;

const getAuthHeader = (): Record<string, string> => {
  const token = localStorage.getItem('geolert_token');
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
    
    const userStr = localStorage.getItem('geolert_user');
    const user = userStr ? JSON.parse(userStr) : null;
    formData.append('username', user?.name || 'anonymous');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
    } catch (e) {
      console.warn("Could not get location for reel upload", e);
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
};
