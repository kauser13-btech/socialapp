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
        throw {
          status: response.status,
          message: data.message || 'An error occurred',
          errors: data.errors || {},
        };
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
  async upload(endpoint, file, fieldName = 'file') {
    const token = await this.getToken();
    const formData = new FormData();

    // React Native file object format
    formData.append(fieldName, {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.fileName || 'image.jpg',
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
      throw {
        status: response.status,
        message: `Server error ${response.status}: ${response.statusText}`,
        errors: {},
      };
    }

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Upload failed',
        errors: data.errors || {},
      };
    }

    return data;
  }
}

// Create singleton instance
const api = new APIClient();

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
  like: (id) => api.post(`/preferences/${id}/like`),
  unlike: (id) => api.delete(`/preferences/${id}/unlike`),
  save: (id) => api.post(`/preferences/${id}/save`),
  unsave: (id) => api.delete(`/preferences/${id}/unsave`),
  getSaved: () => api.get('/preferences/saved'),
  share: (id) => api.get(`/preferences/${id}/share`),
  parseVoice: (text) => api.post('/preferences/parse-voice', { text }),
};

// Feed API
export const feedAPI = {
  getFeed: () => api.get('/feed'),
  getMyFeed: () => api.get('/feed/my'),
  getTrending: () => api.get('/feed/trending'),
  getNearby: (location) => api.get(`/feed/nearby?location=${location}`),
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
  markAsRead: (userId) => api.post(`/messages/${userId}/read`),
  deleteMessage: (id) => api.delete(`/messages/${id}`),
  getUnreadCount: () => api.get('/messages/unread-count'),
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

// Analytics API
export const analyticsAPI = {
  getUserStats: () => api.get('/analytics/stats'),
  getPreferenceStats: (id) => api.get(`/analytics/preferences/${id}`),
  getEngagementStats: () => api.get('/analytics/engagement'),
  getTopPreferences: () => api.get('/analytics/top-preferences'),
  getCategoryStats: () => api.get('/analytics/categories'),
};

export default api;
