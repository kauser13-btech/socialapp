// API client for Unomi backend - React Native version
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';

const apiBaseUrl = API_BASE_URL || 'http://localhost:8000/api/v1';
console.log('API_BASE_URL:', apiBaseUrl);

class APIClient {
  constructor() {
    this.baseURL = apiBaseUrl;
    this.token = null;
  }

  // Set authentication token
  async setToken(token) {
    this.token = token;
    await AsyncStorage.setItem('auth_token', token);
  }

  // Get authentication token
  async getToken() {
    if (this.token) return this.token;
    this.token = await AsyncStorage.getItem('auth_token');
    return this.token;
  }

  // Clear authentication token
  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
  }

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw Object.assign(new Error(data.message || 'An error occurred'), {
          status: response.status,
          errors: data.errors || {},
        });
      }

      return data;
    } catch (error) {
      // Only redirect to login on 401 if NOT already on auth endpoints
      if (error.status === 401 && !endpoint.startsWith('/auth/')) {
        await this.clearToken();
        // Navigation will be handled by the AuthContext
      }
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Upload file (React Native version)
  async upload(endpoint, file, fieldName = 'file', extraFields = {}) {
    const token = await this.getToken();
    const formData = new FormData();

    // React Native file object format
    formData.append(fieldName, {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.fileName || 'image.jpg',
    });

    // Append any additional fields (e.g. caption)
    Object.entries(extraFields).forEach(([key, value]) => {
      if (value != null) formData.append(key, String(value));
    });

    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Server returned HTML (error page) instead of JSON
      throw Object.assign(new Error(`Server error ${response.status}: ${response.statusText}`), {
        status: response.status,
        errors: {},
      });
    }

    const data = await response.json();

    if (!response.ok) {
      throw Object.assign(new Error(data.message || 'Upload failed'), {
        status: response.status,
        errors: data.errors || {},
      });
    }

    return data;
  }
}

// Create singleton instance
const api = new APIClient();

// Rewrites image URLs stored with APP_URL (e.g. http://localhost:8000) to use
// the actual API server origin so devices on LAN can reach them.
const _apiOrigin = (() => {
  try { return new URL(apiBaseUrl).origin; } catch { return ''; }
})();
export function fixImageUrl(url) {
  if (!url || !_apiOrigin) return url;
  try {
    const u = new URL(url);
    if (u.origin !== _apiOrigin) {
      return _apiOrigin + u.pathname + u.search + u.hash;
    }
  } catch { /* not a valid URL, return as-is */ }
  return url;
}

// Authentication API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  uploadAvatar: (file) => api.upload('/users/me/avatar', file, 'avatar'),
  getUser: (username) => api.get(`/users/${username}`),
  getUserPreferences: (username) => api.get(`/users/${username}/preferences`),
  follow: (username) => api.post(`/users/${username}/follow`),
  unfollow: (username) => api.delete(`/users/${username}/follow`),
  block: (username) => api.post(`/users/${username}/block`),
  unblock: (username) => api.delete(`/users/${username}/block`),
  getFollowers: (username) => api.get(`/users/${username}/followers`),
  getFollowing: (username) => api.get(`/users/${username}/following`),
  getSuggestedUsers: () => api.get('/users/suggestions/follow'),
};

// Preferences API
export const preferencesAPI = {
  list: () => api.get('/preferences'),
  create: (data) => api.post('/preferences', data),
  get: (id) => api.get(`/preferences/${id}`),
  update: (id, data) => api.put(`/preferences/${id}`, data),
  delete: (id) => api.delete(`/preferences/${id}`),
  uploadImage: (id, file) => api.upload(`/preferences/${id}/images`, file, 'image'),
  deleteImage: (id, imageId) => api.delete(`/preferences/${id}/images/${imageId}`),
  like: (id, reactionType = 'like') => api.post(`/preferences/${id}/like`, { reaction_type: reactionType }),
  unlike: (id) => api.delete(`/preferences/${id}/like`),
  save: (id) => api.post(`/preferences/${id}/save`),
  unsave: (id) => api.delete(`/preferences/${id}/save`),
  getSaved: () => api.get('/preferences/saved'),
  share: (id) => api.get(`/preferences/${id}/share`),
  parseVoice: (text) => api.post('/preferences/parse-voice', { text }),
  setFavorite: (id, isFavorite) => api.post(`/preferences/${id}/favorite`, { is_favorite: isFavorite }),
  getFriendsWhoLove: (id) => api.get(`/preferences/${id}/friends-who-love`),
  getSimilar: (id) => api.get(`/preferences/${id}/similar`),
  shareToFeed: (id) => api.post(`/preferences/${id}/share-to-feed`),
};

// Feed API
export const feedAPI = {
  getFeed: (page = 1) => api.get(`/feed?page=${page}`),
  getMyFeed: () => api.get('/feed/my'),
  getFollowingFeed: () => api.get('/feed/following'),
  getTrending: () => api.get('/feed/trending'),
  getNearby:   (lat, lng, radius = 20) => api.get(`/feed/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`),
  getTopRated: (minRating = 4, category = null) => {
    const cat = category ? `&category=${category}` : '';
    return api.get(`/feed/top-rated?min_rating=${minRating}${cat}`);
  },
  getDiscover: () => api.get('/feed/discover'),
};

// Comments API
export const commentsAPI = {
  list: (preferenceId) => api.get(`/preferences/${preferenceId}/comments`),
  create: (preferenceId, data) => api.post(`/preferences/${preferenceId}/comments`, data),
  update: (id, data) => api.put(`/comments/${id}`, data),
  delete: (id) => api.delete(`/comments/${id}`),
  like: (id) => api.post(`/comments/${id}/like`),
  unlike: (id) => api.delete(`/comments/${id}/unlike`),
};

// Friends API
export const friendsAPI = {
  list: () => api.get('/friends'),
  getBirthdays: () => api.get(`/friends/birthdays?timezone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`),
  requests: () => api.get('/friends/requests'),
  sentRequests: () => api.get('/friends/sent-requests'),
  sendRequest: (userId) => api.post('/friends/request', { user_id: userId }),
  acceptRequest: (id) => api.post(`/friends/accept/${id}`),
  rejectRequest: (id) => api.post(`/friends/reject/${id}`),
  remove: (id) => api.delete(`/friends/${id}`),
  suggestions: () => api.get('/friends/suggestions'),
  mutualFriends: (userId) => api.get(`/friends/mutual/${userId}`),
};

// Search API
export const searchAPI = {
  search: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
  searchPreferences: (query) => api.get(`/search/preferences?q=${encodeURIComponent(query)}`),
  searchUsers: (query) => api.get(`/search/users?q=${encodeURIComponent(query)}`),
  searchPlaces: (query) => api.get(`/search/places?q=${encodeURIComponent(query)}`),
  getCategories: () => api.get('/categories'),
  getCategoryPreferences: (slug) => api.get(`/categories/${slug}`),
};

// Groups API
export const groupsAPI = {
  list: () => api.get('/groups'),
  create: (data) => api.post('/groups', data),
  get: (id) => api.get(`/groups/${id}`),
  update: (id, data) => api.put(`/groups/${id}`, data),
  delete: (id) => api.delete(`/groups/${id}`),
  join: (id) => api.post(`/groups/${id}/join`),
  leave: (id) => api.post(`/groups/${id}/leave`),
  getMembers: (id) => api.get(`/groups/${id}/members`),
  removeMember: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  getPreferences: (id) => api.get(`/groups/${id}/preferences`),
  getUserGroups: () => api.get('/groups/me'),
};

// Notifications API
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Messages API
export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId) => api.get(`/messages/${userId}`),
  sendMessage: (data) => api.post('/messages', data),
  sharePreference: (receiverId, preferenceId, content) =>
    api.post('/messages', { receiver_id: receiverId, shared_preference_id: preferenceId, content: content || null }),
  sendImageMessage: async (receiverId, fileUri, mimeType = 'image/jpeg') => {
    const token = await AsyncStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('receiver_id', String(receiverId));
    const ext = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
    formData.append('image', { uri: fileUri, type: mimeType, name: `img_${Date.now()}.${ext}` });

    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${apiBaseUrl}/messages/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('sendImageMessage non-JSON response:', response.status, text.slice(0, 500));
      throw new Error(`Server error ${response.status}`);
    }

    if (!response.ok) throw data;
    return data;
  },
  getImageUrl: async (messageId) => {
    const token = await AsyncStorage.getItem('auth_token');
    return `${apiBaseUrl}/messages/image/${messageId}?token=${token}`;
  },
  sendVoiceMessage: async (receiverId, fileUri, duration) => {
    const token = await AsyncStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('receiver_id', String(receiverId));
    if (duration) formData.append('voice_duration', String(Math.round(duration)));
    formData.append('voice', { uri: fileUri, type: 'audio/m4a', name: `voice_${Date.now()}.m4a` });

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${apiBaseUrl}/messages/voice`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  },
  getVoiceUrl: async (messageId) => {
    const token = await api.getToken();
    return `${apiBaseUrl}/messages/voice/${messageId}?token=${token}`;
  },
  markAsRead: (userId) => api.post(`/messages/${userId}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  getUnreadCount: () => api.get('/messages/unread-count'),
  reactToMessage: (id, emoji) => api.post(`/messages/${id}/react`, { emoji }),
  unreactToMessage: (id) => api.delete(`/messages/${id}/react`),
};

// Special Dates API
export const specialDatesAPI = {
  list: () => api.get('/users/me/special-dates'),
  create: (data) => api.post('/users/me/special-dates', data),
  update: (id, data) => api.put(`/users/me/special-dates/${id}`, data),
  delete: (id) => api.delete(`/users/me/special-dates/${id}`),
};

// Allergies API
export const allergiesAPI = {
  list: () => api.get('/users/me/allergies'),
  create: (data) => api.post('/users/me/allergies', data),
  update: (id, data) => api.put(`/users/me/allergies/${id}`, data),
  delete: (id) => api.delete(`/users/me/allergies/${id}`),
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updatePrivacy: (data) => api.put('/settings/privacy', data),
  updateNotifications: (data) => api.put('/settings/notifications', data),
  updatePreferences: (data) => api.put('/settings/preferences', data),
  changePassword: (data) => api.put('/settings/password', data),
  changeEmail: (data) => api.put('/settings/email', data),
  deleteAccount: (password) => api.delete('/settings/account', { password }),
};

// Collections API
export const collectionsAPI = {
  list: () => api.get('/collections'),
  create: (data) => api.post('/collections', data),
  get: (id) => api.get(`/collections/${id}`),
  update: (id, data) => api.put(`/collections/${id}`, data),
  delete: (id) => api.delete(`/collections/${id}`),
  addPreference: (id, preferenceId) => api.post(`/collections/${id}/preferences`, { preference_id: preferenceId }),
  removePreference: (id, preferenceId) => api.delete(`/collections/${id}/preferences/${preferenceId}`),
};

// Analytics API
export const storiesAPI = {
  list:    () => api.get('/stories'),
  create:  (file, caption) => api.upload('/stories', file, 'image', { caption }),
  view:    (id) => api.post(`/stories/${id}/view`),
  viewers: (id) => api.get(`/stories/${id}/viewers`),
  delete:  (id) => api.delete(`/stories/${id}`),
};

export const analyticsAPI = {
  getUserStats: () => api.get('/analytics/stats'),
  getPreferenceStats: (id) => api.get(`/analytics/preferences/${id}`),
  getEngagementStats: () => api.get('/analytics/engagement'),
  getTopPreferences: () => api.get('/analytics/top-preferences'),
  getCategoryStats: () => api.get('/analytics/categories'),
  getCompatibility: (userId) => api.get(`/analytics/compatibility/${userId}`),
  getBadges: (userId = null) => api.get('/analytics/badges' + (userId ? `?user_id=${userId}` : '')),
};

export default api;
